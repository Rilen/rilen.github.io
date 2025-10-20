# app.py
import streamlit as st
import pandas as pd
import plotly.express as px

# Configuração da página
st.set_page_config(page_title="Dashboard com Upload XLSX", layout="wide")

st.title("⬆️ Dashboard com Upload de Arquivo Excel (.xlsx)")
st.write("Faça o upload do seu arquivo Excel (.xlsx) para gerar os gráficos. O arquivo deve conter colunas chamadas 'Categoria' e 'Vendas' para este exemplo funcionar.")

# 1. Widget de Upload de Arquivo
# O widget aceita apenas arquivos com a extensão 'xlsx'
uploaded_file = st.file_uploader("Escolha seu arquivo XLSX aqui:", type=['xlsx'])

# O restante do código só roda se um arquivo for carregado
if uploaded_file is not None:
    
    # Função para carregar os dados (usa cache para não reler o arquivo em cada interação)
    @st.cache_data
    def carregar_dados(file):
        # A biblioteca openpyxl é usada por padrão para ler .xlsx
        return pd.read_excel(file, engine='openpyxl')
    
    try:
        df_dados = carregar_dados(uploaded_file)

        # 2. Verificação de Colunas Necessárias
        COLUNAS_NECESSARIAS = ['Categoria', 'Vendas']
        
        if not all(col in df_dados.columns for col in COLUNAS_NECESSARIAS):
            st.error(f"Erro: O arquivo Excel deve conter as colunas: {', '.join(COLUNAS_NECESSARIAS)}.")
            st.info(f"Colunas encontradas no seu arquivo: {', '.join(df_dados.columns.tolist())}")
        else:
            # --- Início da Lógica do Dashboard ---
            
            st.success("Arquivo carregado com sucesso!")
            
            # 3. Filtro Interativo
            categorias = df_dados['Categoria'].unique()
            categoria_selecionada = st.selectbox('Filtrar por Categoria:', ['Todas'] + list(categorias))

            df_filtrado = df_dados.copy()
            if categoria_selecionada != 'Todas':
                df_filtrado = df_dados[df_dados['Categoria'] == categoria_selecionada]
                
            # 4. Agregação e Gráfico de Barras
            st.subheader(f"Total de Vendas por Categoria ({categoria_selecionada if categoria_selecionada != 'Todas' else 'Todos os Dados'})")
            
            dados_grafico = df_filtrado.groupby('Categoria')['Vendas'].sum().reset_index()

            fig = px.bar(
                dados_grafico,
                x='Categoria',
                y='Vendas',
                title='Resumo de Vendas',
                template='plotly_dark' # Tema escuro para melhor visualização
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # 5. Dados Brutos
            st.subheader("Amostra dos Dados Carregados")
            st.dataframe(df_filtrado)
            
            # --- Fim da Lógica do Dashboard ---

    except Exception as e:
        st.error(f"Ocorreu um erro ao processar o arquivo. Verifique o formato. Detalhe do erro: {e}")

else:
    st.info("Aguardando o upload do seu arquivo Excel...")