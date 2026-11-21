# Base de conhecimento da Nelir

Este diretorio contem a base de conhecimento local do chatbot **Nelir**, usada pelo Worker em `rilen-bot-api/index.js`.

## Arquivos

- `nelir.pt-BR.json` — base de conhecimento: lista de entradas com respostas aprovadas, indexadas por `patterns` (perguntas normalizadas).
- `matcher.js` — logica de correspondencia (normalizacao, remocao de acentos, substring e palavras significativas). Funcoes puras, sem dependencia de credenciais ou provedor de IA.

## Como funciona a correspondencia

1. O Worker recebe `POST { question }`.
2. A pergunta e normalizada (minusculas, sem acentos, sem ponturacao, espacos colapsados).
3. Para cada entrada, cada `pattern` e normalizado. A entrada corresponde se:
   - o pattern normalizado for substring da pergunta normalizada (maior precisao), ou
   - todas as palavras significativas (>= 3 caracteres) do pattern estiverem presentes na pergunta.
4. Vence o pattern com maior `score` (mais longo = mais específico). So o vencedor e retornado.
5. Se houver correspondencia, o Worker responde `reply` com **zero chamadas ao Gemini**, mesmo sem credenciais ou provedor indisponivel.

## Manutencao (adicionar/editar respostas aprovadas)

1. Abra `nelir.pt-BR.json`.
2. Adicione uma nova entrada ao array `entries` com:
   - `id`: identificador unico e descritivo (snake_case).
   - `category`: categoria para organizacao (identidade, perfil, tecnologias, projetos, contato, diferencial, valores).
   - `patterns`: array de frases/perguntas que o usuario pode escrever. Inclua variantes sem acento (ex: "e" e "eh"), porque a normalizacao remove acentos de qualquer forma.
   - `reply`: resposta aprovada, em portugues do Brasil, tom tecnico/senior/direto.
3. Nao edite `matcher.js` a menos que precise mudar a logica de correspondencia.
4. Valide com os testes: `npm test` (ou `npm run test:watch`).

## Regras de conteudo

- Use apenas informacao publica aprovada sobre o Rilen (portfolio, LinkedIn e casos tecnicos autorizados).
- Nao inclua credenciais, chaves, dados pessoais sensiveis ou informações nao verificaveis.
- Respostas curtas, diretas e em portugues (pt-BR).

## Fluxo do Worker (index.js)

1. Correspondencia local na base: retorna `reply` (0 chamadas Gemini).
2. Fora da base, mas pertinente ao Rilen: consulta Gemini com contexto publico aprovado.
3. Fora da base e nao pertinente: informa a limitação ("não tenho informações verificadas...").
4. Falha do provedor/credenciais: apresenta mensagem amigável, sem expor erros internos.
