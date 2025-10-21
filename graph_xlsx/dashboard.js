/* globals Chart:false, feather:false, XLSX:false */

(function () {
  'use strict'

  feather.replace({ 'aria-hidden': 'true' })
  
  // Variável global para a instância do Chart
  let myChartInstance = null;

  // ---------------------------------------------
  // 1. MANIPULADOR DE EVENTO DE UPLOAD
  // ---------------------------------------------
  const uploadInput = document.getElementById('excel-upload');
  const statusElement = document.getElementById('upload-status');
  const errorElement = document.getElementById('error-message');
  const tableBody = document.querySelector('#data-table tbody');

  // Adiciona o listener de evento apenas se o elemento de upload existir
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
    
    // Limpar o corpo da tabela temporariamente
    tableBody.innerHTML = '<tr><td colspan="3">Processando...</td></tr>';

    reader.onload = function(event) {
      try {
        const data = new Uint8Array(event.target.result);
        
        // LER O ARQUIVO EXCEL COM SHEETJS
        const workbook = XLSX.read(data, { type: 'array' });
        // Assume a primeira planilha (SheetNames[0])
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converte a planilha para uma matriz de objetos JSON (usando a primeira linha como cabeçalho)
        const jsonDados = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonDados || jsonDados.length === 0) {
            throw new Error("Planilha vazia ou sem cabeçalhos.");
        }
        
        // Validação de Colunas (Crucial para a agregação)
        // O código espera as colunas 'Categoria' e 'Vendas'
        if (!jsonDados[0].hasOwnProperty('Categoria') || !jsonDados[0].hasOwnProperty('Vendas')) {
            const headers = Object.keys(jsonDados[0]).join(', ');
            throw new Error(`Colunas 'Categoria' e 'Vendas' não encontradas. Cabeçalhos: ${headers}`);
        }

        // 2. PROCESSAR E AGREGAR DADOS
        const aggregatedData = aggregateData(jsonDados);

        // 3. GERAR O GRÁFICO
        drawChart(aggregatedData);
        
        // 4. ATUALIZAR A TABELA
        updateTable(jsonDados.slice(0, 15)); // Mostra as primeiras 15 linhas
        
        statusElement.textContent = `Arquivo "${file.name}" carregado com sucesso!`;

      } catch (error) {
        errorElement.textContent = `ERRO: ${error.message}`;
        statusElement.textContent = 'Erro ao carregar arquivo.';
        tableBody.innerHTML = '<tr><td colspan="3">Erro de processamento. Verifique o console.</td></tr>';
        if (myChartInstance) myChartInstance.destroy(); // Remove o gráfico antigo em caso de erro
        console.error("Erro no processamento do arquivo Excel:", error);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // ---------------------------------------------
  // 2. FUNÇÃO DE AGREGAÇÃO DE DADOS (Somar Vendas por Categoria)
  // ---------------------------------------------
  function aggregateData(data) {
    const sumMap = {}; 
    
    data.forEach(row => {
      const category = row.Categoria;
      // Garante que o valor de Vendas é um número
      const sales = parseFloat(row.Vendas);

      if (category && !isNaN(sales)) {
        sumMap[category] = (sumMap[category] || 0) + sales;
      }
    });

    // Converte o mapa para o formato Chart.js
    return {
      labels: Object.keys(sumMap),
      data: Object.values(sumMap)
    };
  }

  // ---------------------------------------------
  // 3. FUNÇÃO PARA DESENHAR O GRÁFICO (Gráfico de Barras)
  // ---------------------------------------------
  function drawChart({ labels, data }) {
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Destrói a instância anterior para evitar sobreposição
    if (myChartInstance) {
      myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Vendas Totais',
          data: data,
          backgroundColor: 'rgba(13, 110, 253, 0.8)', // Cor azul do Bootstrap Primary
          borderColor: '#0d6efd',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Categoria'
            }
          }],
          yAxes: [{
            ticks: {
              beginAtZero: true
            },
            scaleLabel: {
              display: true,
              labelString: 'Valor Total (R$)'
            }
          }]
        },
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Vendas Agregadas por Categoria'
        }
      }
    });
  }

  // ---------------------------------------------
  // 4. FUNÇÃO PARA ATUALIZAR A TABELA DE DADOS
  // ---------------------------------------------
  function updateTable(data) {
    const table = document.getElementById('data-table');
    let html = '<thead><tr><th scope="col">#</th><th scope="col">Categoria</th><th scope="col">Vendas</th></tr></thead><tbody>';
    
    // Limita para a quantidade de dados carregados, se for menor que 15
    const limit = Math.min(data.length, 15);

    for (let i = 0; i < limit; i++) {
        const row = data[i];
        // Tenta extrair os dados das colunas que esperamos
        const category = row.Categoria || '';
        const sales = row.Vendas !== undefined ? row.Vendas : '';

        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${category}</td>
                <td>${sales}</td>
            </tr>
        `;
    }

    // Se houver mais de 15 linhas, adiciona uma nota
    if (data.length > 15) {
         html += `<tr><td colspan="3">Mostrando apenas as primeiras 15 linhas de ${data.length} no total.</td></tr>`;
    }


    html += '</tbody>';
    table.innerHTML = html;
  }
  
  // Chama o Feather para garantir que os ícones sejam desenhados na inicialização
  feather.replace({ 'aria-hidden': 'true' });

})();