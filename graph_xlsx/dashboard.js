/* globals Chart:false, feather:false, XLSX:false */

(function () {
  'use strict'

  feather.replace({ 'aria-hidden': 'true' })
  
  let myChartInstance = null;
  const colorPalette = [
      '#0d6efd', // Azul (Primary)
      '#dc3545', // Vermelho (Danger)
      '#198754', // Verde (Success)
      '#ffc107', // Amarelo (Warning)
      '#6c757d', // Cinza (Secondary)
      '#6f42c1', // Roxo
      '#20c997'  // Teal
  ];
  
  // ---------------------------------------------
  // 1. VARIÁVEIS E EVENTOS DO DOM
  // ---------------------------------------------
  const uploadInput = document.getElementById('excel-upload');
  const statusElement = document.getElementById('upload-status');
  const errorElement = document.getElementById('error-message');
  const chartCanvas = document.getElementById('myChart'); // Canvas único
  const table = document.getElementById('data-table');
  const tableBody = table ? table.querySelector('tbody') : null;

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

    statusElement.textContent = `Carregando: ${file.name}...`;
    errorElement.textContent = '';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4">Processando...</td></tr>';
    
    // Destrói gráfico antigo
    if (myChartInstance) myChartInstance.destroy();

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

        // 2. PROCESSAR E AGRUPAR DADOS (Mês e Categoria)
        const chartData = processDataForGroupedBarChart(jsonDados);

        // 3. GERAR O GRÁFICO ÚNICO
        drawGroupedBarChart(chartData);
        
        // 4. ATUALIZAR A TABELA
        updateTable(jsonDados.slice(0, 15));
        
        statusElement.textContent = `Arquivo "${file.name}" carregado com sucesso! Dashboard pronto.`;

      } catch (error) {
        errorElement.textContent = `ERRO: ${error.message}`;
        statusElement.textContent = 'Erro no processamento.';
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="4">Erro de processamento.</td></tr>';
        if (myChartInstance) myChartInstance.destroy();
        console.error("Erro no processamento do arquivo Excel:", error);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // ---------------------------------------------
  // 2. FUNÇÃO DE AGRUPAMENTO DE DADOS PARA GRÁFICO AGRUPADO
  // ---------------------------------------------
  function processDataForGroupedBarChart(data) {
      const salesByMonthAndCategory = {};
      const allMonthsSet = new Set();
      const allCategoriesSet = new Set();

      data.forEach(row => {
          const category = row.Categoria;
          const month = row.Mês; // Espera o formato AAAA-MM
          const sales = parseFloat(row.Vendas);

          if (category && month && !isNaN(sales)) {
              allMonthsSet.add(month);
              allCategoriesSet.add(category);
              
              const key = `${category}-${month}`;
              salesByMonthAndCategory[key] = (salesByMonthAndCategory[key] || 0) + sales;
          }
      });
      
      const sortedMonths = Array.from(allMonthsSet).sort();
      const sortedCategories = Array.from(allCategoriesSet).sort();
      
      // Cria datasets para cada categoria
      const datasets = sortedCategories.map((category, index) => {
          const salesData = sortedMonths.map(month => {
              const key = `${category}-${month}`;
              return salesByMonthAndCategory[key] || 0; // Se não houver venda, o valor é 0
          });
          
          const color = colorPalette[index % colorPalette.length];

          return {
              label: category,
              data: salesData,
              backgroundColor: color,
              borderColor: color,
              borderWidth: 1
          };
      });

      return {
          labels: sortedMonths,
          datasets: datasets,
          categories: sortedCategories
      };
  }

  // ---------------------------------------------
  // 3. FUNÇÃO PARA DESENHAR O GRÁFICO (Gráfico de Barras Agrupadas)
  // ---------------------------------------------
  function drawGroupedBarChart({ labels, datasets }) {
    if (!chartCanvas) {
        console.error("Elemento canvas 'myChart' não encontrado no DOM.");
        return;
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    if (myChartInstance) {
      myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
      type: 'bar', 
      data: {
        labels: labels, // Meses ordenados
        datasets: datasets 
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            stacked: false, // Barras Lado a Lado
            scaleLabel: { display: true, labelString: 'Período (Mês/Ano)' }
          }],
          yAxes: [{
            stacked: false, // Barras Lado a Lado
            ticks: { beginAtZero: true },
            scaleLabel: { display: true, labelString: 'Total de Vendas' }
          }]
        },
        legend: { display: true, position: 'bottom' },
        title: {
          display: true,
          text: 'Evolução Mensal de Vendas por Categoria'
        }
      }
    });
  }

  // ---------------------------------------------
  // 4. FUNÇÃO PARA ATUALIZAR A TABELA DE DADOS
  // ---------------------------------------------
  function updateTable(data) {
    if (!tableBody) return;
    
    let html = '';
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

    tableBody.innerHTML = html;
  }
  
  feather.replace({ 'aria-hidden': 'true' });

})();