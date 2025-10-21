/* globals Chart:false, feather:false, XLSX:false, bootstrap:false */

(function () {
  'use strict'

  feather.replace({ 'aria-hidden': 'true' })
  
  // Variável para armazenar todas as instâncias de gráficos
  const chartInstances = {};
  
  // ---------------------------------------------
  // 1. VARIÁVEIS DO DOM
  // ---------------------------------------------
  const uploadInput = document.getElementById('excel-upload');
  const statusElement = document.getElementById('upload-status');
  const errorElement = document.getElementById('error-message');
  const categoryTabsContainer = document.getElementById('categoryTabs');
  const tabContentContainer = document.getElementById('categoryTabContent');
  const tableBody = document.querySelector('#data-table tbody');

  if (uploadInput) {
      uploadInput.addEventListener('change', handleFile, false);
  } else {
      console.error("Elemento de upload 'excel-upload' não encontrado.");
  }


  function handleFile(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    // Resetar e mostrar status
    statusElement.textContent = `Carregando: ${file.name}...`;
    errorElement.textContent = '';
    
    // Limpar área do dashboard
    categoryTabsContainer.innerHTML = '';
    tabContentContainer.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="4">Processando...</td></tr>';

    reader.onload = function(event) {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonDados = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonDados || jsonDados.length === 0) {
            throw new Error("Planilha vazia ou sem cabeçalhos.");
        }
        
        // Validação de Colunas
        const requiredHeaders = ['Categoria', 'Vendas', 'Mês'];
        if (!requiredHeaders.every(h => jsonDados[0].hasOwnProperty(h))) {
            const headers = Object.keys(jsonDados[0]).join(', ');
            throw new Error(`Colunas ${requiredHeaders.join(', ')} não encontradas. Cabeçalhos: ${headers}`);
        }

        // 2. PROCESSAR E AGRUPAR DADOS POR CATEGORIA E MÊS
        const groupedData = groupDataByMonthAndCategory(jsonDados);

        // 3. GERAR AS ABAS E GRÁFICOS
        createTabsAndCharts(groupedData);
        
        // 4. ATUALIZAR A TABELA
        updateTable(jsonDados.slice(0, 15));
        
        statusElement.textContent = `Arquivo "${file.name}" carregado com sucesso! Dashboard pronto.`;

      } catch (error) {
        errorElement.textContent = `ERRO: ${error.message}`;
        statusElement.textContent = 'Erro no processamento.';
        console.error("Erro no processamento do arquivo Excel:", error);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // ---------------------------------------------
  // 2. AGRUPAMENTO E PROCESSAMENTO DE DADOS
  // ---------------------------------------------
  function groupDataByMonthAndCategory(data) {
      const grouped = {};

      data.forEach(row => {
          const category = row.Categoria;
          const month = row.Mês; // Espera o formato AAAA-MM
          const sales = parseFloat(row.Vendas);

          if (category && month && !isNaN(sales)) {
              if (!grouped[category]) {
                  grouped[category] = {};
              }
              // Soma as vendas para o mês/categoria
              grouped[category][month] = (grouped[category][month] || 0) + sales;
          }
      });
      
      // Ordena os meses e formata para o Chart.js
      for (const category in grouped) {
          const monthlyData = grouped[category];
          const sortedMonths = Object.keys(monthlyData).sort();
          
          grouped[category] = {
              labels: sortedMonths,
              data: sortedMonths.map(month => monthlyData[month])
          };
      }

      return grouped;
  }

  // ---------------------------------------------
  // 3. GERAÇÃO DE ABAS E GRÁFICOS
  // ---------------------------------------------
  function createTabsAndCharts(groupedData) {
      let isFirst = true;

      for (const category in groupedData) {
          const slug = category.replace(/\s+/g, '-').toLowerCase();
          const isCategoryActive = isFirst ? 'active' : '';

          // 1. Cria a Aba (nav-item)
          const tabHtml = `
              <li class="nav-item" role="presentation">
                  <button class="nav-link ${isCategoryActive}" id="${slug}-tab" data-bs-toggle="tab" data-bs-target="#${slug}-content" type="button" role="tab" aria-controls="${slug}-content" aria-selected="${isFirst}">${category}</button>
              </li>
          `;
          categoryTabsContainer.insertAdjacentHTML('beforeend', tabHtml);

          // 2. Cria o Conteúdo da Aba (Gráfico Canvas)
          const contentHtml = `
              <div class="tab-pane fade ${isFirst ? 'show active' : ''}" id="${slug}-content" role="tabpanel" aria-labelledby="${slug}-tab">
                  <div class="chart-tab-pane d-flex justify-content-center align-items-center">
                      <canvas id="chart-${slug}" class="chart-canvas"></canvas>
                  </div>
              </div>
          `;
          tabContentContainer.insertAdjacentHTML('beforeend', contentHtml);

          isFirst = false;
      }
      
      // Espera um pequeno tempo para o Bootstrap renderizar as abas e cria os gráficos
      // Nota: O Bootstrap 5 usa classes para o Tab, mas o .tab('show') só é necessário para
      // troca dinâmica. No carregamento, a lógica de JS precisa aguardar a injeção do HTML.
      setTimeout(() => {
          // Inicializa os gráficos (Chart.js)
          for (const category in groupedData) {
              const slug = category.replace(/\s+/g, '-').toLowerCase();
              const canvasId = `chart-${slug}`;
              const ctx = document.getElementById(canvasId).getContext('2d');
              
              chartInstances[slug] = drawChart(ctx, category, groupedData[category].labels, groupedData[category].data);
          }
      }, 100);
      
      // Adiciona um listener para a troca de abas (para garantir que o gráfico seja redimensionado)
      const tabTriggers = categoryTabsContainer.querySelectorAll('button[data-bs-toggle="tab"]');
      tabTriggers.forEach(trigger => {
          trigger.addEventListener('shown.bs.tab', event => {
              const targetId = event.target.getAttribute('data-bs-target').substring(1);
              const slug = targetId.replace('-content', '');
              // Redimensiona o gráfico para a nova aba
              if (chartInstances[slug]) {
                  chartInstances[slug].resize();
              }
          });
      });
  }

  // ---------------------------------------------
  // 4. FUNÇÃO PARA DESENHAR O GRÁFICO (Gráfico de Linha)
  // ---------------------------------------------
  function drawChart(ctx, categoryName, labels, data) {
    
    // Configuração de cores (para dar um visual agradável na evolução)
    const primaryColor = 'rgba(13, 110, 253, 1)'; 

    return new Chart(ctx, {
      type: 'line', // Gráfico de Linha para mostrar a evolução
      data: {
        labels: labels, // Meses ordenados
        datasets: [{
          label: `Vendas de ${categoryName}`,
          data: data,
          lineTension: 0.4, // Suaviza a linha
          backgroundColor: 'rgba(13, 110, 253, 0.2)', // Área abaixo da linha
          borderColor: primaryColor,
          borderWidth: 3,
          pointBackgroundColor: primaryColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            scaleLabel: { display: true, labelString: 'Período (Mês/Ano)' }
          }],
          yAxes: [{
            ticks: { beginAtZero: true },
            scaleLabel: { display: true, labelString: 'Total de Vendas' }
          }]
        },
        legend: { display: false },
        title: {
          display: true,
          text: `Evolução Mensal de Vendas: ${categoryName}`
        }
      }
    });
  }

  // ---------------------------------------------
  // 5. FUNÇÃO PARA ATUALIZAR A TABELA DE DADOS
  // ---------------------------------------------
  function updateTable(data) {
    const table = document.getElementById('data-table');
    let html = '<thead><tr><th scope="col">#</th><th scope="col">Categoria</th><th scope="col">Vendas</th><th scope="col">Mês</th></tr></thead><tbody>';
    
    const limit = Math.min(data.length, 15);

    for (let i = 0; i < limit; i++) {
        const row = data[i];
        const category = row.Categoria || '';
        const sales = row.Vendas !== undefined ? row.Vendas : '';
        const month = row.Mês || '';

        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${category}</td>
                <td>${sales}</td>
                <td>${month}</td>
            </tr>
        `;
    }

    if (data.length > 15) {
         html += `<tr><td colspan="4">Mostrando apenas as primeiras 15 linhas de ${data.length} no total.</td></tr>`;
    }

    html += '</tbody>';
    table.innerHTML = html;
  }

})();