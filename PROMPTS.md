# **🛸 DESENVOLVIMENTO ANTIGRAVITY: BIBLIOTECA DE PROMPTS**

### **💡 Instruções Globais (Contexto do Workspace)**

*Sempre adicione estas premissas ao iniciar um chat no VSCode/AntiGravity:*

* **Contexto Técnico:** "Considere o contexto dos arquivos abertos no workspace para garantir que a refatoração não quebre dependências entre módulos."  
* **Valor de Negócio:** "Extraia a Proposta de Valor (Value Proposition) analisando as funções core do sistema e destaque como ele economiza tempo ou recursos para o usuário final."

---

## **🛠️ 1\. O Auditor Supremo (Tech Lead Senior)**

**Objetivo:** Revisão de código para nível de produção.

**Prompt:** "Aja como um Tech Lead e Arquiteto de Software Senior. Realize uma auditoria profunda (Deep Audit) no código anexo, focando em robustez para produção em escala.

**Sua análise deve cobrir:**

1. **Segurança e Blindagem:** Identifique vazamentos de segredos e gere um `.gitignore` que siga os padrões da indústria para este ecossistema.  
2. **Refatoração de Elite:** Converta tipos implícitos (`any`) para interfaces estritas. Aplique princípios SOLID e DRY. Otimize algoritmos com alta complexidade de tempo/espaço.  
3. **Resiliência:** Implemente tratamento de erros (try/catch, boundaries) e logs estratégicos.  
4. **UI/UX Crítica:** Refine o CSS/Tailwind para consistência atômica, acessibilidade (A11y) e responsividade fluida.  
5. **Documentação Técnica (README.md):** Gere um arquivo profissional com badges, diagrama de arquitetura (Mermaid) e guia de setup.

**Entregáveis:** 1\. Relatório de débitos técnicos; 2\. Código refatorado; 3\. .gitignore e .env.example; 4\. README.md final."

---

## **📋 2\. Handover Estratégico (Product Owner & Arquiteto)**

**Objetivo:** Transformar uma ideia ou site de referência em um plano técnico.

**Prompt:** "Aja como Product Owner e Arquiteto de Soluções. Analise a ideia/referência abaixo e projete um Blueprint Técnico para implementação imediata.

**Estrutura do Blueprint:**

1. **Análise de Viabilidade:** Resumo executivo e identificação de possíveis gargalos.  
2. **Stack Proposta:** Justifique a escolha de bibliotecas (ex: TanStack Query, Framer Motion).  
3. **Modelagem de Dados:** Desenhe interfaces TypeScript e sugira a estrutura do banco de dados.  
4. **UX Strategy:** Defina o comportamento responsivo e padrões de design (tokens).  
5. **Roadmap:** Checklist dividido em Sprint 0 (Setup), Sprint 1 (Core), Sprint 2 (Deploy).  
6. **Protocolo Zero-Trust:** Uso obrigatório de placeholders para variáveis de ambiente.

**Referência:** \[INSIRA LINK OU DESCRIÇÃO\]"

---

## **🧪 3\. Data Science & ML Engineer**

**Objetivo:** Auditoria de performance estatística e eficiência de dados.

**Prompt:** "Aja como um Senior Data Scientist e ML Engineer. Audite este script/notebook focado em eficiência estatística e reprodutibilidade.

**Critérios de Revisão:**

1. **Qualidade dos Dados:** Identifique data leaks, viés (bias) e problemas de imputação.  
2. **Otimização de Performance:** Substitua loops por operações vetorizadas (NumPy/Pandas) e otimize memória.  
3. **Engenharia de Features:** Sugira 3 novas variáveis preditivas com base no contexto.  
4. **Métricas de Sucesso:** Proponha métricas além da acurácia (F1-Score, AUC-ROC, RMSE).  
5. **Clean Code DS:** Siga a PEP 8 e modularize transformações em pipelines.

**Código:** \[COLE O CÓDIGO\]"

---

## **📚 4\. Especialista em README.md**

**Objetivo:** Gerar documentação que vende o valor do projeto.

**Prompt:** "Analise os arquivos do meu repositório (package.json, requirements.txt, App.tsx, etc). Identifique as tecnologias e a 'Alma do Negócio'.

**Gere um README.md seguindo o modelo:**

1. **Título & Banner:** \[Nome do Sistema\]  
2. **Descrição:** Foco no problema que o sistema resolve e diferenciais (performance, segurança).  
3. **Proposta de Valor:** Aplique a Value Proposition analisando as funções core do sistema e destaque como ele economiza tempo ou recursos para o usuário final.  
4. **Tabela de Tecnologias:** Com badges do Shields.io.  
5. **Guia de Setup:** Passo a passo local e configuração de `.env`.  
6. **Estrutura de Pastas:** Visão geral do diretório.  
7. **Rodapé do Autor:** Destaque Rilen T. L. \- DataScience.

---

## **🧹 5\. Suíte de Refatoração (Clean Code)**

### **A. Refatoração Geral**

"Reescreva este código para torná-lo mais limpo, eficiente e legível. Aplique Clean Code, remova redundâncias e melhore a nomenclatura."

### **B. Redução de Complexidade**

"Analise o código e refatore-o para reduzir a **complexidade ciclomática**. Divida funções grandes em sub-funções especializadas e específicas."

### **C. Design Patterns (Ultra Clean Code)**

"Refatore o código utilizando **Design Patterns** (Factory, Strategy, Singleton, etc). **Restrições:** Remova números mágicos, use verbos descritivos, funções \< 20 linhas e inclua JSDoc/Docstrings."

