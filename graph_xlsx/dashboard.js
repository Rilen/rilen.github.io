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
                // Processando a aba como uma categoria
                const sheetData = processSheetAsCategory(worksheet, sheetName);
                
                if (sheetData.data.length > 0) {
                    combinedData.push(...sheetData.data);
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
  // FUNÇÃO CORRIGIDA: Lida com Múltiplos Cabeçalhos e Abas
  // ---------------------------------------------
  function processSheetAsCategory(worksheet, category) {
      // Opção 1: Tenta converter para JSON, ignorando 5 linhas (cabeçalhos extras)
      // Baseado na estrutura típica de planilhas de resumo.
      const jsonDados = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, // Lendo como array de arrays
          range: 3,  // Tentando começar a leitura a partir da linha 4 (índice 3)
          raw: false, 
          dateNF: 'YYYY-MM-DD' 
      });
      
      // Se a planilha for muito complexa, header: 1 e range: 3 podem não funcionar.
      // É preciso inspecionar o arquivo original para saber qual é a linha do cabeçalho de dados.
      
      // Assumindo que as colunas de dados são fixas (baseado na estrutura do seu anexo, 
      // onde a data está na primeira coluna de dados e o valor de venda na última).
      
      if (jsonDados.length === 0 || !jsonDados[0]) return { data: [] };

      // Se a leitura for bem-sucedida, a primeira linha (jsonDados[0]) contém os cabeçalhos.
      // Precisamos mapear as colunas: 
      // Coluna da Data (Fechamento Semanal)
      // Coluna do Valor de Vendas (Vendas)
      
      let dateColIndex = -1; 
      let salesColIndex = -1;
      
      const firstDataRow = jsonDados[0];

      // Tenta encontrar as colunas. Ajuste os índices (i) conforme a posição real da coluna na sua planilha
      // EXEMPLO: Se a data estiver na primeira coluna e o valor de venda na terceira:
      
      // TENTATIVA ROBUSTA: Assume que os dados (data e valor) estão nas primeiras colunas de valor
      // O nome do cabeçalho não importa muito se usarmos a posição (índice)
      const headers = jsonDados.shift(); // Remove a linha de cabeçalho (que pode ser a 4ª linha do Excel)
      
      // A data (Fechamento Semanal) geralmente é a 1ª coluna de dados => Coluna A (índice 0)
      dateColIndex = 0; 
      
      // O valor de Vendas é o que muda por categoria. 
      // (Se a sua planilha for Data | Vendas, o índice é 1)
      salesColIndex = 1; 

      if (salesColIndex === -1 || dateColIndex === -1) {
          console.warn(`Aba ${category}: Colunas de Fechamento/Vendas não encontradas. Verifique a estrutura.`);
          return { data: [] };
      }

      const mappedData = [];

      jsonDados.forEach(row => {
          let newRow = { Categoria: category };
          
          let dateValue = row[dateColIndex];
          let salesValue = parseFloat(row[salesColIndex]);

          // Tenta padronizar a data (se foi lida como número de série)
          if (typeof dateValue === 'number' && dateValue > 1) { 
              dateValue = excelDateToYYYYMMDD(dateValue);
          }
          
          if (!isNaN(salesValue) && salesValue > 0 && dateValue) {
              newRow.Vendas = salesValue;
              newRow.FechamentoSemanal = dateValue;
              mappedData.push(newRow);
          }
      });
      
      return { data: mappedData };
  }

  // ---------------------------------------------
  // 2. FUNÇÃO DE AGRUPAMENTO DE DADOS PARA GRÁFICO EMPILHADO
  // ---------------------------------------------
  function processDataForGroupedBarChart(data) {
      const salesByPeriodAndCategory = {};
      const allPeriodsSet = new Set();
      const allCategoriesSet = new Set();

      data.forEach(row => {
          const period = row.FechamentoSemanal; 
          const category = row.Categoria;
          const sales = row.Vendas;

          if (period && category && !isNaN(sales)) {
              allPeriodsSet.add(period);
              allCategoriesSet.add(category);
              
              const key = `${category}|${period}`;
              salesByPeriodAndCategory[key] = (salesByPeriodAndCategory[key] || 0) + sales;
          }
      });
      
      // Ordena os períodos cronologicamente (Ex: AAAA-MM-DD)
      const sortedPeriods = Array.from(allPeriodsSet).sort();
      const sortedCategories = Array.from(allCategoriesSet).sort();
      
      // Cria datasets para cada categoria
      const datasets = sortedCategories.map((category, index) => {
          const salesData = sortedPeriods.map(period => {
              const key = `${category}|${period}`;
              return salesByPeriodAndCategory[key] || 0; 
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
      // 1 é subtraído porque o Excel começa a contar em 1900-01-01 (dia 1)
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
    if (!tableBody || !table) return;
    
    let html = '';
    const limit = Math.min(data.length, 15);

    // Recria o cabeçalho da tabela 
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