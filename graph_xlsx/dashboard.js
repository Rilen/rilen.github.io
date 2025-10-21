/* globals Chart:false, feather:false, XLSX:false */

(function () {
  'use strict'

  feather.replace({ 'aria-hidden': true })
  
  let myChartInstance = null;
  const colorPalette = [
      '#0d6efd', '#dc3545', '#198754', '#ffc107', 
      '#6c757d', '#6f42c1', '#20c997', '#0dcaf0', 
      '#641a96', '#00bcd4', '#ff9800', '#8bc34a'
  ];
  
  // Mapeamento dos meses para ordenação cronológica (01 = Jan, 02 = Fev, etc.)
  const MONTH_ORDER = {
      'JANEIRO': '01',
      'FEVEREIRO': '02',
      'MARÇO': '03',
      'ABRIL': '04',
      'MAIO': '05',
      'JUNHO': '06',
      'JULHO': '07',
      'AGOSTO': '08',
      'SETEMBRO': '09',
      'OUTUBRO': '10',
      'NOVEMBRO': '11',
      'DEZEMBRO': '12'
  };
  
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
  }

  function handleFile(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();

    statusElement.textContent = `Carregando: ${file.name}...`;
    errorElement.textContent = '';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="3">Processando...</td></tr>';
    
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
                const sheetData = processSheetData(worksheet, sheetName.trim());
                
                if (sheetData.data.length > 0) {
                    combinedData.push(...sheetData.data);
                    totalSheets++;
                }
            });
            
            if (combinedData.length === 0) {
                 throw new Error(`Nenhum dado válido encontrado nas ${totalSheets} abas processadas. Verifique se as linhas 2 e 3 estão corretas.`);
            }
            
            // 2. AGRUPAR E PREPARAR DADOS PARA O GRÁFICO
            const chartData = prepareDataForStackedBarChart(combinedData);
            
            // 3. GERAR O GRÁFICO
            drawStackedBarChart(chartData);
            
            // 4. ATUALIZAR A TABELA CONSOLIDADA
            const tableData = aggregateDataForTable(combinedData);
            updateTable(tableData);

            statusElement.textContent = `Sucesso! Carregadas ${totalSheets} meses/categorias (abas) do arquivo "${file.name}".`;

        } catch (error) {
            errorElement.textContent = `ERRO FATAL: ${error.message}`;
            statusElement.textContent = 'Falha no processamento. Verifique o console (F12).';
            if (myChartInstance) myChartInstance.destroy();
            console.error("Erro no processamento do arquivo Excel:", error);
            chartArea.innerHTML = '';
        }
    };

    reader.readAsArrayBuffer(file);
  }
  
  // ---------------------------------------------
  // FUNÇÃO UTILITÁRIA PARA ORDENAÇÃO DE MESES
  // ---------------------------------------------
  function getSortableMonthKey(monthYearString) {
      const parts = monthYearString.toUpperCase().split(/[\s-]+/).filter(p => p);
      if (parts.length >= 2) {
          const monthName = parts[0];
          const year = parts[parts.length - 1];
          const monthCode = MONTH_ORDER[monthName] || '99'; 

          if (year && year.length === 4) {
              return `${year}-${monthCode}`;
          }
      }
      return `0000-${monthYearString}`; // Fallback
  }

  // ---------------------------------------------
  // FUNÇÃO DE LEITURA DA ABA (Corrigida para Linhas de Cabeçalho Múltiplas)
  // ---------------------------------------------
  function processSheetData(worksheet, monthYear) {
      const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          range: 0, 
          raw: false, 
          dateNF: 'YYYY-MM-DD' 
      });
      
      if (dataAsArray.length < 3) return { data: [] };
      
      const subCategoryNames = dataAsArray[1]; // Linha 2 (Subcategorias)
      const dataStartRowIndex = 2; // Linha 3 (Dados)
      
      const periodColIndex = 0; // Coluna 1 (Nº SEMANA)
      const firstSalesColIndex = 1; // Coluna 2 (Início das Vendas)

      const mappedData = [];
      
      for (let i = dataStartRowIndex; i < dataAsArray.length; i++) {
          const row = dataAsArray[i];
          
          if (!row || !row[periodColIndex]) continue;
          
          const weeklyPeriod = row[periodColIndex]; 
          
          for (let j = firstSalesColIndex; j < row.length; j++) {
              // Vendas agora representa QUANTIDADE
              const salesValue = parseFloat(row[j]);
              const subcategory = subCategoryNames[j]; 

              if (subcategory && typeof subcategory === 'string' && !subcategory.includes('nan') && !isNaN(salesValue) && salesValue > 0) {
                  mappedData.push({
                      MêsAno: monthYear,
                      Subcategoria: subcategory.trim(),
                      Vendas: salesValue, // Vendas é a QUANTIDADE
                      FechamentoSemanal: weeklyPeriod 
                  });
              }
          }
      }
      
      return { data: mappedData };
  }

  // ---------------------------------------------
  // 2. FUNÇÃO DE AGRUPAMENTO DE DADOS PARA GRÁFICO EMPILHADO
  // ---------------------------------------------
  function prepareDataForStackedBarChart(data) {
      const salesByMonthAndSubcategory = {};
      const allMonthsSet = new Set();
      const allSubcategoriesSet = new Set();

      data.forEach(row => {
          const monthKey = row.MêsAno; 
          const subcategory = row.Subcategoria;
          const sales = row.Vendas;

          if (monthKey && subcategory && !isNaN(sales)) {
              allMonthsSet.add(monthKey);
              allSubcategoriesSet.add(subcategory);
              
              const key = `${subcategory}|${monthKey}`;
              salesByMonthAndSubcategory[key] = (salesByMonthAndSubcategory[key] || 0) + sales; 
          }
      });
      
      // ORDENAÇÃO CRONOLÓGICA
      const sortedMonths = Array.from(allMonthsSet).sort((a, b) => {
          const keyA = getSortableMonthKey(a);
          const keyB = getSortableMonthKey(b);
          return keyA.localeCompare(keyB);
      });
      
      const sortedSubcategories = Array.from(allSubcategoriesSet).sort();
      
      const datasets = sortedSubcategories.map((subcategory, index) => {
          const salesData = sortedMonths.map(month => {
              const key = `${subcategory}|${month}`;
              return salesByMonthAndSubcategory[key] || 0; 
          });
          
          const color = colorPalette[index % colorPalette.length];

          return {
              label: subcategory,
              data: salesData,
              backgroundColor: color,
              borderColor: color,
              borderWidth: 1
          };
      });

      return {
          labels: sortedMonths,
          datasets: datasets,
          subcategories: sortedSubcategories
      };
  }

  // ---------------------------------------------
  // 3. FUNÇÃO PARA DESENHAR O GRÁFICO (Barras Empilhadas)
  // --------------------------------------------------------------------------------
  function drawStackedBarChart({ labels, datasets }) {
    chartArea.innerHTML = '<canvas id="dynamicChart" class="chart-canvas"></canvas>';
    const ctx = document.getElementById('dynamicChart').getContext('2d');
    
    if (myChartInstance) {
      myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
      type: 'bar', 
      data: {
        labels: labels, // Mês/Ano (Ex: "JANEIRO - 2025")
        datasets: datasets 
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            stacked: true, // HABILITA EMPILHAMENTO
            scaleLabel: { display: true, labelString: 'Mês / Período' }
          }],
          yAxes: [{
            stacked: true, // HABILITA EMPILHAMENTO
            ticks: { beginAtZero: true },
            scaleLabel: { display: true, labelString: 'Quantidade Total Mensal' } // RÓTULO CORRIGIDO
          }]
        },
        legend: { display: true, position: 'bottom' },
        title: {
          display: true,
          text: 'Quantidade Total Vendida por Contribuição de Subcategoria' // RÓTULO CORRIGIDO
        }
      }
    });
  }

  // ---------------------------------------------
  // 4. FUNÇÃO PARA PREPARAR DADOS PARA A TABELA (Consolidada)
  // ---------------------------------------------
  function aggregateDataForTable(combinedData) {
      const monthlyTotalMap = {};

      combinedData.forEach(row => {
          const monthKey = row.MêsAno;
          const sales = row.Vendas; // Vendas é a quantidade

          if (monthKey && !isNaN(sales)) {
              monthlyTotalMap[monthKey] = (monthlyTotalMap[monthKey] || 0) + sales;
          }
      });

      // Ordena cronologicamente
      return Object.keys(monthlyTotalMap).sort((a, b) => {
          const keyA = getSortableMonthKey(a);
          const keyB = getSortableMonthKey(b);
          return keyA.localeCompare(keyB);
      }).map(month => ({
          MêsAno: month,
          Vendas: monthlyTotalMap[month].toFixed(0) // Quantidade total (sem casas decimais)
      }));
  }

  // ---------------------------------------------
  // 5. FUNÇÃO PARA ATUALIZAR A TABELA DE DADOS
  // ---------------------------------------------
  function updateTable(data) {
    if (!tableBody || !table) return;
    
    let html = '';
    
    // Cabeçalho alterado: Mês/Ano e Quantidade Total
    table.innerHTML = '<thead><tr><th scope="col">#</th><th scope="col">Mês/Ano</th><th scope="col">Quantidade Total</th></tr></thead><tbody>';
    
    data.forEach((row, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${row.MêsAno}</td>
                <td>${row.Vendas}</td>
            </tr>
        `;
    });

    if (data.length === 0) {
        html += `<tr><td colspan="3">Nenhum dado mensal consolidado encontrado.</td></tr>`;
    }

    table.querySelector('tbody').innerHTML = html;
  }
  
  feather.replace({ 'aria-hidden': true } );

})();