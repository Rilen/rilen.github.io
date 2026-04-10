# 🎲 rilen.github.io — Portfolio de Data Architecture com Edge AI

> **Portfólio técnico de Rilen Tavares Lima** — demonstração viva de arquitetura de dados moderna, IA soberana em Edge Computing e governança orientada a conformidade LGPD. Não é apenas uma página estática: é um sistema de software em produção.

[![Deploy Status](https://img.shields.io/badge/Cloudflare_Pages-Live-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://rilen.github.io)
[![Nelir AI](https://img.shields.io/badge/Nelir_AI-Edge_RAG-4e54c8?style=flat-square&logo=google-gemini&logoColor=white)](https://rilen-bot-api.rilen-lima.workers.dev)
[![License](https://img.shields.io/badge/License-HTML5UP_CCA3.0-lightgrey?style=flat-square)](LICENSE.txt)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-in%2Frilen-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/rilen/)

---

## ⚠️ Aviso de Privacidade / Security Review

> **Visibilidade recomendada: PÚBLICO** ✅
>
> **Análise de segurança:**
> - ✅ Nenhuma chave de API hardcoded no código de produção (`index.js`, `custom.js`, `index.html`)
> - ✅ A `GEMINI_API_KEY` é injetada via **Cloudflare Wrangler Secret** em tempo de deploy — nunca exposta no repositório
> - ✅ O `wrangler.toml` não contém credenciais — apenas metadados de build
> - ✅ O `.gitignore` e `.wranglerignore` estão devidamente configurados para bloquear `node_modules`, `.wrangler/` e artefatos de build
> - ⚠️ **AÇÃO RECOMENDADA:** O arquivo `REAL_BOT_SETUP.md` contém, em um comentário de exemplo, o formato de uma chave Gemini. Embora seja apenas documentação, considere remover ou ofuscar esse trecho para eliminar qualquer ambiguidade em auditorias de segurança automatizadas (ex: GitHub Secret Scanning).

---

## 🧭 Visão Geral

### O Problema
Portfólios tradicionais de dados são PDFs estáticos ou repositórios de notebooks. Eles não demonstram capacidade arquitetural — apenas listam ferramentas. Um recrutador técnico não consegue avaliar a qualidade de engenharia a partir de um currículo.

### A Solução
Um sistema de software completo deployado em produção que demonstra, **ao vivo**, domínio de:
- **Edge Computing** com Cloudflare Workers (latência < 50ms, sem servidor)
- **LLM Orchestration** com Google Gemini via API segura (secrets, não hardcode)
- **CORS Hardening** com allowlist explícita de origem
- **GitHub API Integration** com deduplicação de eventos e lazy loading
- **Observabilidade** habilitada nativamente via Cloudflare (`observability = true`)

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                        │
│  GitHub Pages / Cloudflare Pages  ·  HTML5 + Vanilla JS + CSS  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Portfolio UI │  │  GitHub Feed  │  │   D3.js Activity Pulse │ │
│  │  (Ethereal)  │  │  (REST API)   │  │   (14d sparkline SVG)  │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /  { question: "..." }
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE AI LAYER (NELIR)                         │
│  Cloudflare Worker  ·  Node.js Runtime  ·  Observabilidade ON   │
│                                                                  │
│  ① CORS Guard    → allowlist: rilen.github.io only              │
│  ② Prompt Build  → System instruction + persona Nelir (RAG-like)│
│  ③ Secret Inject → env.GEMINI_API_KEY (Wrangler Secret Vault)   │
│  ④ LLM Call      → Gemini Flash (gemini-flash-latest)           │
│  ⑤ Error Handle  → try/catch com status 500 estruturado         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              Google Generative Language API
              (Gemini Flash · v1beta · generateContent)
```

### Fluxo de Dados — 3 Etapas

| Etapa | Componente | Responsabilidade |
|-------|-----------|-----------------|
| **① Ingestão** | `custom.js` → GitHub API | Busca repos e eventos públicos; deduplicação por `repo:type` key |
| **② Processamento** | `rilen-bot-api/index.js` | Cloudflare Worker valida CORS, monta prompt com persona completa, injeta secret e chama Gemini |
| **③ Saída** | Frontend → DOM | Renderiza cards de repos com badges de linguagem, sparkline D3 de atividade e resposta do bot no chat |

---

## 🛠️ Stack Tecnológica

### Frontend
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript_ES2024-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=flat-square&logo=d3.js&logoColor=white)

### Edge Computing & AI
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_Flash-4285F4?style=flat-square&logo=google-gemini&logoColor=white)
![Wrangler](https://img.shields.io/badge/Wrangler_v4-F38020?style=flat-square&logo=cloudflare&logoColor=white)

### Infra & Deploy
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-181717?style=flat-square&logo=github&logoColor=white)
![Fedora CoreOS](https://img.shields.io/badge/Fedora_CoreOS-51A2DA?style=flat-square&logo=fedora&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

### Comunicação & Integração
![GitHub API](https://img.shields.io/badge/GitHub_REST_API-181717?style=flat-square&logo=github&logoColor=white)
![EmailJS](https://img.shields.io/badge/EmailJS-FF6B35?style=flat-square&logoColor=white)

---

## 🔐 Diferencial de Engenharia

### 1. CORS Hardening com Allowlist Explícita
```js
// rilen-bot-api/index.js
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://rilen.github.io", // ← não é "*"
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
```
> A origem é explícita e restrita — qualquer chamada de domínio não autorizado é bloqueada na camada de rede, antes de alcançar o LLM. Padrão de segurança de produção.

### 2. Secret Management via Wrangler Vault
```toml
# wrangler.toml — sem credenciais no código
name = "rilen-bot-api"
main = "index.js"
compatibility_date = "2024-03-01"
[observability]
enabled = true
```
> A `GEMINI_API_KEY` é injetada via `env.GEMINI_API_KEY` em runtime, com bind exclusivo ao Worker. Zero credenciais no repositório.

### 3. Deduplicação de Eventos com Set() — O(1) lookup
```js
// custom.js — loadRecentActivity()
const seen = new Set();
for (const ev of events) {
  const key = `${ev.repo.name}:${ev.type}`;
  if (!seen.has(key)) {
    seen.add(key);
    items.push(ev);
    if (items.length >= 5) break;  // early exit
  }
}
```
> Evita duplicatas de evento por repo em O(1) com early exit — não itera os 20 eventos se encontrou 5 únicos antes.

### 4. Persona RAG-like no System Prompt
```js
// O Worker simula RAG injetando contexto estruturado no system prompt:
// projetos, skills, tom de voz, dados de contato.
// Sem vector DB, mas com knowledge graph textual completo.
```
> Técnica válida para portfolios e assistentes de domínio fechado: knowledge injection direta no prompt, sem overhead de embedding retrieval.

### 5. Observabilidade Nativa Habilitada
```toml
[observability]
enabled = true
```
> Métricas de latência, erros e invocações do Worker são coletadas automaticamente pelo Cloudflare — sem instrumentação adicional de código.

---

## 📂 Estrutura do Repositório

```
rilen.github.io/
├── index.html              # SPA principal — layout Ethereal (HTML5UP)
├── assets/
│   ├── css/
│   │   ├── main.css        # Design system base (Ethereal theme)
│   │   └── custom.css      # Extensões: chat widget, repo cards, a11y
│   └── js/
│       ├── main.js         # Motor de scroll horizontal (jQuery)
│       └── custom.js       # GitHub API, Nelir chat engine, D3 pulse
├── rilen-bot-api/
│   ├── index.js            # Cloudflare Worker — Edge AI endpoint
│   └── wrangler.toml       # Config de deploy do Worker
├── images/                 # Assets visuais (projetos, avatar bot)
├── wrangler.toml           # Config de deploy do site estático
├── .wranglerignore         # Exclusões do bundle Cloudflare
└── REAL_BOT_SETUP.md       # Guia de configuração do Worker
```

---

## 🚀 Deploy Local

### Pré-requisitos
- Node.js 18+
- Conta Cloudflare (plano Free)
- Chave Google Gemini API ([AI Studio](https://aistudio.google.com))

### 1. Configurar e deployar o Worker (Edge AI)
```bash
cd rilen-bot-api
npx wrangler secret put GEMINI_API_KEY
# Cole sua chave quando solicitado
npx wrangler deploy
```

### 2. Deployar o site estático
```bash
cd ..
npx wrangler deploy
```

### 3. Desenvolvimento local
```bash
# Abrir index.html diretamente — sem build step necessário
# Para o worker localmente:
cd rilen-bot-api && npx wrangler dev
```

---

## 👤 Autor

**Rilen Tavares Lima** — Data Architect | Lakehouse · Governança · IA Segura

Supervisor de GOVTIC · Prefeitura Municipal de Rio das Ostras, RJ, Brasil

| Canal | Link |
|-------|------|
| 🌐 Portfolio | [rilen.github.io](https://rilen.github.io) |
| 💼 LinkedIn | [linkedin.com/in/rilen](https://www.linkedin.com/in/rilen/) |
| 📧 Email | rilen.lima@gmail.com |
| 📱 WhatsApp | +55 22 99247-0445 |

---

> *"Arquitetura de dados não é sobre ferramentas — é sobre decisões que resistem ao tempo."*

---

<sub>Template base: [Ethereal by HTML5UP](https://html5up.net) · Licença CCA 3.0 · Worker e customizações: © RTL 2026</sub>
