# 🤖 Guia de Ativação: RilenBot Real (Terminal Flow)

Para transformar o seu chat de uma "demonstração" em uma ferramenta de IA funcional, siga o guia abaixo. Este método utiliza o plano gratuito da **Cloudflare** e do **Google Gemini**.

## 1. Sua Chave do Gemini
Você deve gerar sua chave no Google AI Studio e configurá-la apenas como um **Secret** no Cloudflare Wrangler. *Nunca anote a chave real em arquivos do repositório.*

## 2. Publicar a API via Terminal (Recomendado)
Acesse o terminal na pasta do projeto e execute:

```powershell
# 1. Entre na pasta da API
cd rilen-bot-api

# 2. Configure a chave secreta no Cloudflare
# (Substitua pela sua chave quando o terminal solicitar ou use o comando abaixo)
npx wrangler secret put GEMINI_API_KEY
# [Cole a chave: AIzaSyDLk4l3H3vM2gy9LZ9AuvUZjcAMYSkLBIg]

# 3. Faça o deploy da API
npx wrangler deploy
```

Após o deploy, a Cloudflare exibirá uma URL como: `https://rilen-bot-api.seu-nome.workers.dev`.

## 3. Conectar o Frontend
1. Abra `assets/js/custom.js`.
2. Vá até a linha **42** (procurar por `workerUrl`).
3. Substitua `https://rilen-bot-api.rilen-lima.workers.dev` pela URL que você recebeu no passo acima.

## 4. Corrigindo o Erro "Asset too large"
O erro ocorreu porque o Wrangler tentou subir a pasta `node_modules` inteira. 
Já corrigi isso para você:
*   Mudei `wrangler.jsonc` para `wrangler.toml` (mais estável).
*   Reforcei o `.wranglerignore`.

Para subir o site agora:
```powershell
cd ..
npx wrangler deploy
```

---

## ✅ Checklist Final
- [ ] **Worker URL**: A variável `workerUrl` no `index.html` está correta?
- [ ] **Secrets**: O comando `wrangler secret put` foi executado com sucesso?
- [ ] **Build**: O comando `npx wrangler deploy` na raiz terminou sem erros?
