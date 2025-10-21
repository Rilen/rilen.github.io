/* globals Chart:false, feather:false, XLSX:false */

(function () {
  'use strict'

  feather.replace({ 'aria-hidden': 'true' })
  
  let myChartInstance = null;
  const colorPalette = [
      '#0d6efd', '#dc3545', '#198754', '#ffc107', 
      '#6c757d', '#6f42c1', '#20c997', '#0dcaf0'
  ];
  
  // ---------------------------------------------
  // 1. VARIÁVEIS E EVENTOS DO DOM
  // ---------------------------------------------
  const uploadInput = document.getElementById('excel-upload');
  const statusElement = document.getElementById('upload-status');
  const errorElement = document.getElementById('error-message');
  const chartArea = document.getElementById('chart-area');
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
    
    // Como o 'multiple' foi removido, files[0] é o único arquivo.
    const file = files[0];
    const reader = new FileReader();

    statusElement.textContent = `Carregando: ${file.name}...`;
    errorElement.textContent = '';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4">Processando...</td></tr>';
    
    if (myChartInstance) myChartInstance.destroy();

    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { 
                type: 'array', 
                raw: false, 
                dateNF: 'YYYY-MM-DD' 
            });
            
            const combinedData = [];
            let totalSheets = 0;
            
            // Itera sobre TODAS AS ABAS
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                // Lendo a aba como se fosse uma categoria
                const sheetData = processSheetAsCategory(worksheet, sheetName);
                if (sheetData.length > 0) {
                    combinedData.push(...sheetData);
                    totalSheets++;
                }
            });
            
            if (combinedData.length === 0) {
                 throw new Error(`Nenhum dado válido encontrado nas ${totalSheets} abas processadas. Verifique se as colunas estão corretas.`);
            }
            
            // 2. AGRUPAR E PREPARAR DADOS PARA O GRÁFICO
            const chartData = processDataForGroupedBarChart(combinedData);
            
            // 3. GERAR O GRÁFICO
            drawGroupedBarChart(chartData);
            
            // 4. ATUALIZAR A TABELA
            updateTable(combinedData.slice(0, 15));

            statusElement.textContent = `Sucesso! Carregadas ${totalSheets} categorias (abas) do arquivo "${file.name}".`;

        } catch (error) {
            errorElement.textContent = `ERRO FATAL: ${error.message}`;
            statusElement.textContent = 'Falha no processamento. Verifique o console (F12).';
            console.error("Erro no processamento do arquivo Excel:", error);
            chartArea.innerHTML = '';
        }
    };

    reader.readAsArrayBuffer(file);
  }
  
  // ---------------------------------------------
  // FUNÇÃO PARA PROCESSAR UMA ÚNICA ABA COMO UMA CATEGORIA
  // ---------------------------------------------
  function processSheetAsCategory(worksheet, category) {
      const jsonDados = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false, 
          dateNF: 'YYYY-MM-DD' 
      });
      
      if (jsonDados.length === 0) return [];

      const mappedData = [];
      const requiredDataHeaders = ['Vendas', 'FechamentoSemanal'];

      jsonDados.forEach(row => {
          let newRow = { Categoria: category };
          let validVendas = false;

          for (const key in row) {
              const standardizedKey = key.trim().toLowerCase(); 
              
              if (standardizedKey.includes('vendas')) {
                  newRow.Vendas = parseFloat(row[key]);
                  validVendas = !isNaN(newRow.Vendas) && newRow.Vendas > 0;
              } else if (standardizedKey.includes('fechamento') || standardizedKey.includes('semanal')) {
                  // O Eixo X será a data do fechamento
                  let dateValue = row[key];
                  if (typeof dateValue === 'number' && dateValue > 1) { 
                      dateValue = excelDateToYYYYMMDD(dateValue);
                  }
                  newRow.FechamentoSemanal = dateValue;
              }
          }
          
          if (validVendas && newRow.FechamentoSemanal) {
              mappedData.push(newRow);
          }
      });
      
      return mappedData;
  }

  // ---------------------------------------------
  // 2. FUNÇÃO DE AGRUPAMENTO DE DADOS PARA GRÁFICO EMPILHADO
  // ---------------------------------------------
  function processDataForGroupedBarChart(data) {
      const salesByPeriodAndCategory = {};
      const allPeriodsSet = new Set();
      const allCategoriesSet = new Set();

      data.forEach(row => {
          const period = row.FechamentoSemanal; // Data de Fechamento Semanal (Eixo X)
          const category = row.Categoria;
          const sales = row.Vendas;

          if (period && category && !isNaN(sales)) {
              allPeriodsSet.add(period);
              allCategoriesSet.add(category);
              
              // Chave única para agregação: Categoria|Data
              const key = `${category}|${period}`;
              salesByPeriodAndCategory[key] = (salesByPeriodAndCategory[key] || 0) + sales;
          }
      });
      
      // Ordena os períodos cronologicamente (se estiverem em AAAA-MM-DD)
      const sortedPeriods = Array.from(allPeriodsSet).sort();
      const sortedCategories = Array.from(allCategoriesSet).sort();
      
      // Cria datasets para cada categoria
      const datasets = sortedCategories.map((category, index) => {
          const salesData = sortedPeriods.map(period => {
              const key = `${category}|${period}`;
              return salesByPeriodAndCategory[key] || 0; // 0 se não houver venda
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
          labels: sortedPeriods,
          datasets: datasets,
          categories: sortedCategories
      };
  }

  // ---------------------------------------------
  // FUNÇÃO UTILITÁRIA PARA DATAS (Converte número de série Excel para AAAA-MM-DD)
  // ---------------------------------------------
  function excelDateToYYYYMMDD(excelSerialNumber) {
      const date = new Date(Date.UTC(0, 0, excelSerialNumber - 1));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      if (year < 2000) return 'Data Inválida'; 
      return `${year}-${month}-${day}`;
  }


  // ---------------------------------------------
  // 3. FUNÇÃO PARA DESENHAR O GRÁFICO (Barras Empilhadas)
  // --------------------------------------------------------------------------------
  function drawGroupedBarChart({ labels, datasets }) {
    // Remove o canvas antigo e insere o novo para garantir o contexto
    chartArea.innerHTML = '<canvas id="dynamicChart" class="chart-canvas"></canvas>';
    const ctx = document.getElementById('dynamicChart').getContext('2d');
    
    if (myChartInstance) {
      myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
      type: 'bar', 
      data: {
        labels: labels, // Fechamentos semanais ordenados
        datasets: datasets 
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            stacked: true, // HABILITA EMPILHAMENTO
            scaleLabel: { display: true, labelString: 'Fechamento Semanal' }
          }],
          yAxes: [{
            stacked: true, // HABILITA EMPILHAMENTO
            ticks: { beginAtZero: true },
            scaleLabel: { display: true, labelString: 'Total de Vendas (Acumulado Semanal)' }
          }]
        },
        legend: { display: true, position: 'bottom' },
        title: {
          display: true,
          text: 'Evolução Semanal e Contribuição de Categorias'
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
    table.innerHTML = '<thead><tr><th scope="col">#</th><th scope="col">Categoria</th><th scope="col">Vendas</th><th scope="col">Fechamento Semanal</th></tr></thead><tbody>';
    
    for (let i = 0; i < limit; i++) {
        const row = data[i];
        const category = row.Categoria || '';
        const sales = row.Vendas !== undefined ? String(row.Vendas) : ''; 
        const weeklyPeriod = row.FechamentoSemanal || '';

        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${category}</td>
                <td>${sales}</td>
                <td>${weeklyPeriod}</td>
            </tr>
        `;
    }

    if (data.length > 15) {
         html += `<tr><td colspan="4">Mostrando apenas as primeiras 15 linhas de ${data.length} registros no total.</td></tr>`;
    }

    table.querySelector('tbody').innerHTML = html;
  }
  
  feather.replace({ 'aria-hidden': 'true' });

})();