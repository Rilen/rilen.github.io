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
  uploadInput.addEventListener('change', handleFile, false);

  const statusElement = document.getElementById('upload-status');
  const errorElement = document.getElementById('error-message');
  const tableBody = document.querySelector('#data-table tbody');

  function handleFile(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    statusElement.textContent = `Carregando: ${file.name}...`;
    errorElement.textContent = '';
    tableBody.innerHTML = '<tr><td colspan="3">Processando...</td></tr>';

    reader.onload = function(event) {
      try {
        const data = new Uint8Array(event.target.result);
        
        // LER O ARQUIVO EXCEL COM SHEETJS
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converte a planilha para uma matriz de objetos JSON (usando o cabeçalho)
        const jsonDados = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonDados || jsonDados.length === 0) {
            throw new Error("Planilha vazia ou sem cabeçalhos.");
        }
        
        // Os nomes das colunas esperadas são 'Categoria' e 'Vendas'
        if (!jsonDados[0].hasOwnProperty('Categoria') || !jsonDados[0].hasOwnProperty('Vendas')) {
            const headers = Object.keys(jsonDados[0]).join(', ');
            throw new Error(`Colunas 'Categoria' e 'Vendas' não encontradas. Cabeçalhos: ${headers}`);
        }

        // 2. PROCESSAR E AGREGAR DADOS
        const aggregatedData = aggregateData(jsonDados);

        // 3. GERAR O GRÁFICO
        drawChart(aggregatedData);
        
        // 4. ATUALIZAR A TABELA
        updateTable(jsonDados.slice(0, 10)); // Mostra as primeiras 10 linhas
        
        statusElement.textContent = `Arquivo "${file.name}" carregado!`;

      } catch (error) {
        errorElement.textContent = `ERRO: ${error.message}`;
        statusElement.textContent = 'Erro ao carregar arquivo.';
        tableBody.innerHTML = '<tr><td colspan="3">Erro de processamento dos dados.</td></tr>';
        if (myChartInstance) myChartInstance.destroy();
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // ---------------------------------------------
  // 2. FUNÇÃO DE AGREGAÇÃO DE DADOS
  // ---------------------------------------------
  function aggregateData(data) {
    const sumMap = {}; // Usado para somar as vendas por categoria
    
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
  // 3. FUNÇÃO PARA DESENHAR O GRÁFICO
  // ---------------------------------------------
  function drawChart({ labels, data }) {
    const ctx = document.getElementById('myChart').getContext('2d');
    
    // Destrói a instância anterior para evitar sobreposição
    if (myChartInstance) {
      myChartInstance.destroy();
    }

    myChartInstance = new Chart(ctx, {
      type: 'bar', // Alterado para gráfico de barras, mais adequado para categorias
      data: {
        labels: labels,
        datasets: [{
          label: 'Vendas Totais por Categoria',
          data: data,
          backgroundColor: 'rgba(0, 123, 255, 0.6)',
          borderColor: '#007bff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            },
            scaleLabel: {
              display: true,
              labelString: 'Total de Vendas'
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Categoria'
            }
          }]
        },
        legend: {
          display: false // Oculta a legenda, pois só temos um dataset
        },
        title: {
          display: true,
          text: 'Vendas Agregadas do Arquivo Excel'
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
    
    data.forEach((row, index) => {
        // Tenta extrair os dados das colunas que esperamos
        const category = row.Categoria || '';
        const sales = row.Vendas !== undefined ? row.Vendas : '';

        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${category}</td>
                <td>${sales}</td>
            </tr>
        `;
    });

    html += '</tbody>';
    table.innerHTML = html;
  }
  
  // Chama o Feather para garantir que os ícones sejam desenhados na inicialização
  feather.replace({ 'aria-hidden': 'true' });

})();