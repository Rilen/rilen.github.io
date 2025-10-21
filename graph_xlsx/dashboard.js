/* globals Chart:false, feather:false, XLSX:false */

(function () {
  'use strict'

  feather.replace({ 'aria-hidden': 'true' })
  
  let myChartInstance = null;
  const colorPalette = [
      '#0d6efd', '#dc3545', '#198754', '#ffc107', 
      '#6c757d', '#6f42c1', '#20c997', '#0dcaf0', 
      '#641a96', '#00bcd4', '#ff9800', '#8bc34a'
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
                // Passa o NOME DA ABA como o MÊS/ANO para processamento
                const sheetData = processSheetData(worksheet, sheetName.trim());
                
                if (sheetData.length > 0) {
                    combinedData.push(...sheetData);
                    totalSheets++;
                }
            });
            
            if (combinedData.length === 0) {
                 throw new Error(`Nenhum dado válido encontrado nas ${totalSheets} abas processadas. Verifique se as colunas estão corretas.`);
            }
            
            // 2. AGRUPAR E PREPARAR DADOS PARA O GRÁFICO
            const chartData = prepareDataForStackedBarChart(combinedData);
            
            // 3. GERAR O GRÁFICO
            drawStackedBarChart(chartData);
            
            // 4. ATUALIZAR A TABELA
            updateTable(combinedData.slice(0, 15));

            statusElement.textContent = `Sucesso! Carregadas ${totalSheets} abas (meses/categorias) do arquivo "${file.name}".`;

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
  // FUNÇÃO CORRIGIDA: Lida com Multi-Linha de Cabeçalho
  // ---------------------------------------------
  function processSheetData(worksheet, monthYear) {
      // Lê o conteúdo da planilha como uma matriz (Array of Arrays) a partir da linha 1 (índice 0)
      const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          range: 0, // Começa a ler da primeira linha
          raw: false, 
          dateNF: 'YYYY-MM-DD' 
      });
      
      if (dataAsArray.length < 4 || !dataAsArray[1] || !dataAsArray[3]) {
          console.warn(`Aba ${monthYear} ignorada: Estrutura da planilha muito curta.`);
          return [];
      }
      
      // Linhas importantes, baseadas no seu anexo:
      // Linha 2 (índice 1): Contém os nomes das Subcategorias (COMPUTADORES, PERIFÉRICOS, etc.)
      const subCategoryNames = dataAsArray[1];
      
      // Linha 4 (índice 3): Contém os títulos das colunas de dados (Semana, Vendas, etc.)
      const headers = dataAsArray[3];
      
      // O SheetJS pode ler células mescladas como `undefined` ou nulas.
      // Precisamos identificar o índice da coluna de data (Período Semanal) e o índice da primeira coluna de venda.
      
      let dateColIndex = -1; 
      let firstSalesColIndex = -1;
      
      // Encontra a coluna de data (Período Semanal) e a primeira coluna de vendas
      headers.forEach((header, index) => {
          if (typeof header === 'string') {
              const standardizedHeader = header.trim().toLowerCase();
              if (standardizedHeader.includes('semanal') || standardizedHeader.includes('fechamento')) {
                  dateColIndex = index;
              }
              // Supondo que a primeira coluna que não é de data é a primeira coluna de venda
              if (firstSalesColIndex === -1 && dateColIndex !== index) {
                   // Se a coluna não for data, assumimos que é uma coluna de venda (Valor Total)
                   firstSalesColIndex = index;
              }
          }
      });

      if (dateColIndex === -1 || firstSalesColIndex === -1) {
          throw new Error(`Aba ${monthYear}: Não foi possível identificar as colunas de "Fechamento Semanal" e "Vendas/Valor".`);
      }
      
      const mappedData = [];
      
      // Itera a partir da linha 5 (índice 4) em diante - onde os dados semanais começam
      for (let i = 4; i < dataAsArray.length; i++) {
          const row = dataAsArray[i];
          
          if (!row || !row[dateColIndex]) continue; // Ignora linhas vazias ou sem data
          
          let weeklyDate = row[dateColIndex];
          
          // Tenta padronizar a data (se for número de série)
          if (typeof weeklyDate === 'number' && weeklyDate > 1) { 
              weeklyDate = excelDateToYYYYMMDD(weeklyDate);
          }
          
          // Itera sobre as colunas de subcategorias/vendas
          for (let j = firstSalesColIndex; j < row.length; j++) {
              const salesValue = parseFloat(row[j]);
              const subcategory = subCategoryNames[j]; // O nome da subcategoria está na linha 2, mesma coluna j

              // Verifica se o nome da subcategoria é válido (e não é vazio/coluna de formatação)
              if (subcategory && typeof subcategory === 'string' && !isNaN(salesValue) && salesValue > 0) {
                  mappedData.push({
                      MêsAno: monthYear,
                      Subcategoria: subcategory.trim(),
                      Vendas: salesValue,
                      FechamentoSemanal: weeklyDate
                  });
              }
          }
      }
      
      return mappedData;
  }

  // ---------------------------------------------
  // 2. FUNÇÃO DE AGRUPAMENTO DE DADOS PARA GRÁFICO EMPILHADO
  // ---------------------------------------------
  function prepareDataForStackedBarChart(data) {
      const salesByMonthAndSubcategory = {};
      const allMonthsSet = new Set();
      const allSubcategoriesSet = new Set();

      data.forEach(row => {
          // O Eixo X será o Mês/Ano (Nome da Aba)
          const monthKey = row.MêsAno; 
          const subcategory = row.Subcategoria;
          const sales = row.Vendas;

          if (monthKey && subcategory && !isNaN(sales)) {
              allMonthsSet.add(monthKey);
              allSubcategoriesSet.add(subcategory);
              
              // Chave única para agregação: Subcategoria|Mês
              const key = `${subcategory}|${monthKey}`;
              salesByMonthAndSubcategory[key] = (salesByMonthAndSubcategory[key] || 0) + sales;
          }
      });
      
      // Ordena as labels do Eixo X
      const sortedMonths = Array.from(allMonthsSet).sort();
      const sortedSubcategories = Array.from(allSubcategoriesSet).sort();
      
      // Cria datasets para cada subcategoria
      const datasets = sortedSubcategories.map((subcategory, index) => {
          const salesData = sortedMonths.map(month => {
              const key = `${subcategory}|${month}`;
              return salesByMonthAndSubcategory[key] || 0; // 0 se não houver venda
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
  // FUNÇÃO UTILITÁRIA PARA DATAS
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
  function drawStackedBarChart({ labels, datasets }) {
    chartArea.innerHTML = '<canvas id="dynamicChart" class="chart-canvas"></canvas>';
    const ctx = document.getElementById('dynamicChart').getContext('2d');
    
    if (myChartInstance) {
      myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
      type: 'bar', 
      data: {
        labels: labels, // Mês/Ano (Nome da Aba)
        datasets: datasets 
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            stacked: true, // HABILITA EMPILHAMENTO
            scaleLabel: { display: true, labelString: 'Período (Mês/Ano)' }
          }],
          yAxes: [{
            stacked: true, // HABILITA EMPILHAMENTO
            ticks: { beginAtZero: true },
            scaleLabel: { display: true, labelString: 'Total de Vendas Mensais' }
          }]
        },
        legend: { display: true, position: 'bottom' },
        title: {
          display: true,
          text: 'Vendas Mensais por Contribuição de Subcategoria'
        }
      }
    });
  }

  // ---------------------------------------------
  // 4. FUNÇÃO PARA ATUALIZAR A TABELA DE DADOS
  // ---------------------------------------------
  function updateTable(data) {
    if (!tableBody || !table) return;
    
    let html = '';
    const limit = Math.min(data.length, 15);

    // Recria o cabeçalho da tabela com as novas colunas
    table.innerHTML = '<thead><tr><th scope="col">#</th><th scope="col">Mês/Ano</th><th scope="col">Subcategoria</th><th scope="col">Vendas</th><th scope="col">Fechamento Semanal</th></tr></thead><tbody>';
    
    for (let i = 0; i < limit; i++) {
        const row = data[i];
        const monthYear = row.MêsAno || '';
        const subcategory = row.Subcategoria || '';
        const sales = row.Vendas !== undefined ? String(row.Vendas) : ''; 
        const weeklyPeriod = row.FechamentoSemanal || '';

        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${monthYear}</td>
                <td>${subcategory}</td>
                <td>${sales}</td>
                <td>${weeklyPeriod}</td>
            </tr>
        `;
    }

    if (data.length > 15) {
         html += `<tr><td colspan="5">Mostrando apenas as primeiras 15 linhas de ${data.length} registros no total.</td></tr>`;
    }

    table.querySelector('tbody').innerHTML = html;
  }
  
  feather.replace({ 'aria-hidden': 'true' });

})();