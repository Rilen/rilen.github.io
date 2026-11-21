# Base de conhecimento da Nelir

Este diretorio contem a base de conhecimento local do chatbot **Nelir**, usada pelo Worker em `rilen-bot-api/index.js`.

## Arquivos

- `nelir.pt-BR.json` — base de conhecimento: lista de entradas com respostas aprovadas, indexadas por `patterns` (perguntas normalizadas).
- `matcher.js` — logica de correspondencia (normalizacao, remocao de acentos, substring e palavras significativas). Funcoes puras, sem dependencia de credenciais ou provedor de IA.

## Como funciona a correspondencia

1. O Worker recebe `POST { question }`.
2. A pergunta e normalizada (minusculas, sem acentos, sem ponturacao, espacos colapsados).
3. Para cada entrada, cada `pattern` e normalizado. A entrada corresponde **apenas a palavras/expressoes inteiras**:
   - expressoes (varios tokens): os tokens do pattern devem aparecer como uma sequencia contigua de palavras inteiras na pergunta normalizada;
   - palavra unica: deve coincidir exatamente com um token inteiro da pergunta, nunca dentro de outra palavra.
   Exemplo: o pattern `"ia"` corresponde a `"ia"` mas nao dentro de `"melancia"`.
4. Vence o pattern com maior `score` (mais longo = mais específico). So o vencedor e retornado.
5. Se houver correspondencia, o Worker responde `reply` com **zero chamadas ao Gemini**, mesmo sem credenciais ou provedor indisponivel.

## Fontes publicas das entradas reconstruidas

As entradas da base de conhecimento foram reconstruidas a partir de fontes publicas aprovadas:
- Portfolio: https://rilen.github.io
- LinkedIn: https://linkedin.com/in/rilen/
- Casos tecnicos autorizados do proprio portfolio (imagens e descricoes de projetos em /images).

## Atencao: dados pessoais e alegacoes profissionais

Antes de publicar ou alterar qualquer entrada, o mantenedor deve confirmar:
- **Dados pessoais:** e-mail (rilen.lima@gmail.com), WhatsApp (+55 22 99247-0445) e qualquer contato direto.
- **Alegacoes profissionais:** cargo "Supervisor de Governanca de TIC na Prefeitura de Rio das Ostras (PMRO) desde 2026", "25+ anos de experiencia", certificacoes e formacoes listadas nas respostas.

Essas informacoes nao devem ser incluídas ou modificadas sem confirmacao expressa do mantenedor.

## Manutencao (adicionar/editar respostas aprovadas)

1. Abra `nelir.pt-BR.json`.
2. Adicione uma nova entrada ao array `entries` com:
   - `id`: identificador unico e descritivo (snake_case).
   - `category`: categoria para organizacao (identidade, perfil, tecnologias, projetos, contato, diferencial, valores).
   - `patterns`: array de frases/perguntas que o usuario pode escrever. Use **expressoes inteiras** e evite nomes isolados de tecnologia (alias genericos), porque uma mencao isolada nao deve capturar questoes especificas que a entrada nao responde. Inclua variantes sem acento (ex: "e" e "eh").
   - `reply`: resposta aprovada, em portugues do Brasil, tom tecnico/senior/direto, apenas informacao publica aprovada.
3. Nao edite `matcher.js` a menos que precise mudar a logica de correspondencia.
4. Valide com os testes: `npm test` (ou `npm run test:watch`).
5. Se adicionar dados pessoais ou alegacoes profissionais, marque para confirmacao do mantenedor (veja secao "Atencao" acima).

## Regras de conteudo

- Use apenas informacao publica aprovada sobre o Rilen (portfolio, LinkedIn e casos tecnicos autorizados).
- Nao inclua credenciais, chaves, dados pessoais sensiveis ou informações nao verificaveis.
- Respostas curtas, diretas e em portugues (pt-BR).
- Nao use nomes isolados de tecnologia como `pattern` (alias generico); prefira questoes completas ou expressoes de dominio especificas.


## Fluxo do Worker (index.js)

1. Correspondencia local na base: retorna `reply` (0 chamadas Gemini).
2. Fora da base, mas pertinente ao Rilen: consulta Gemini com contexto publico aprovado.
3. Fora da base e nao pertinente: informa a limitação ("não tenho informações verificadas...").
4. Falha do provedor/credenciais: apresenta mensagem amigável, sem expor erros internos.
