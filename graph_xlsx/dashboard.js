/* globals Chart:false, feather:false, XLSX:false */

(function () {
  'use strict'

  feather.replace({ 'aria-hidden': 'true' })
  
  let myChartInstance = null;
  // Paleta de cores para os datasets (garante cores diferentes para cada categoria)
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
  const chartCanvas = document.getElementById('myChart'); 
  const table = document.getElementById('data-table');
  const tableBody = table ? table.querySelector('tbody') : null;

  if (uploadInput) {
      uploadInput.addEventListener('change', handleFile, false);
  } else {
      console.error("Elemento de upload 'excel-upload' não encontrado. Verifique o ID.");
  }


  function handleFile(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    // Resetar e mostrar status
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
        
        // CORREÇÃO CRÍTICA: Forçar a leitura para JSON com a opção 'raw: false'
        // para garantir que números e datas sejam lidos corretamente.
        const jsonDados = XLSX.utils.sheet_to_json(worksheet, { 
            raw: false, 
            dateNF: 'YYYY-MM' // Tenta formatar datas (útil para o campo Mês)
        });

        if (!jsonDados || jsonDados.length === 0) {
            throw new Error("Planilha vazia ou sem dados.");
        }
        
        // Log dos cabeçalhos lidos para depuração
        const actualHeaders = Object.keys(jsonDados[0] || {});
        
        // Mapeia os cabeçalhos para remover espaços em branco e capitalização inconsistente.
        // O código de processamento usará estes nomes padronizados:
        const mappedData = jsonDados.map(row => {
            const newRow = {};
            for (const key in row) {
                // Padroniza a chave para minúsculas e sem espaços, para evitar erros de case/espaços
                const standardizedKey = key.trim().toLowerCase(); 
                
                if (standardizedKey.includes('categoria')) {
                    newRow.Categoria = row[key];
                } else if (standardizedKey.includes('vendas')) {
                    // Tenta converter para número imediatamente.
                    newRow.Vendas = parseFloat(row[key]);
                } else if (standardizedKey.includes('mês') || standardizedKey.includes('mes')) {
                    newRow.Mês = row[key];
                }
            }
            return newRow;
        });
        
        // Re-valida as colunas necessárias com base no mapeamento
        const requiredHeaders = ['Categoria', 'Vendas', 'Mês'];
        if (!mappedData[0].hasOwnProperty('Categoria') || !mappedData[0].hasOwnProperty('Vendas') || !mappedData[0].hasOwnProperty('Mês')) {
            throw new Error(`Colunas 'Categoria', 'Mês' e 'Vendas' não encontradas. Cabeçalhos lidos: ${actualHeaders.join(', ')}`);
        }

        // 2. PROCESSAR E AGRUPAR DADOS (Mês e Categoria)
        const chartData = processDataForGroupedBarChart(mappedData);

        // 3. GERAR O GRÁFICO ÚNICO
        drawGroupedBarChart(chartData);
        
        // 4. ATUALIZAR A TABELA
        updateTable(mappedData.slice(0, 15));
        
        statusElement.textContent = `Arquivo "${file.name}" carregado com sucesso! Dashboard pronto.`;

      } catch (error) {
        errorElement.textContent = `ERRO: ${error.message}`;
        statusElement.textContent = 'Erro no processamento. Verifique o console (F12).';
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="4">Erro de processamento.</td></tr>';
        if (myChartInstance) myChartInstance.destroy();
        console.error("Erro fatal no processamento do arquivo Excel:", error);
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
          let month = row.Mês; 
          let sales = row.Vendas;

          // Se a leitura com dateNF falhar, tente converter o número de série da data Excel
          if (typeof month === 'number' && month > 1) { 
              month = excelDateToYYYYMM(month);
          }
          
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
  // FUNÇÃO UTILITÁRIA PARA DATAS (Caso o Excel use números de série)
  // ---------------------------------------------
  function excelDateToYYYYMM(excelSerialNumber) {
      // O SheetJS tem uma função nativa para isso, mas podemos usar uma simplificada
      // Se a data for lida como número, é um número de série do Excel (dias desde 1900-01-01)
      const date = new Date(Date.UTC(0, 0, excelSerialNumber - 1));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      // Validação básica para evitar datas muito antigas se o número for inválido
      if (year < 2000) return 'Data Inválida'; 
      return `${year}-${month}`;
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
            stacked: false, 
            scaleLabel: { display: true, labelString: 'Período (Mês/Ano)' }
          }],
          yAxes: [{
            stacked: false, 
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

    // Recria o cabeçalho da tabela (para garantir que esteja limpo)
    table.innerHTML = '<thead><tr><th scope="col">#</th><th scope="col">Categoria</th><th scope="col">Vendas</th><th scope="col">Mês</th></tr></thead><tbody>';
    
    for (let i = 0; i < limit; i++) {
        const row = data[i];
        const category = row.Categoria || '';
        // Garante que o valor é exibido como string (evita notação científica para números grandes)
        const sales = row.Vendas !== undefined ? String(row.Vendas) : ''; 
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

    table.querySelector('tbody').innerHTML = html;
  }
  
  feather.replace({ 'aria-hidden': 'true' });

})();