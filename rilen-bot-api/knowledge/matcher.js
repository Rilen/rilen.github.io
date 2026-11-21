// Matcher da base de conhecimento local da Nelir.
// Funcoes puras: recebem o conhecimento como argumento, sao facas de testar
// sem depender de credenciais, provedor de IA ou ambiente de Worker.

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text) {
  return normalize(text).split(/\s+/).filter(Boolean);
}

export function matchKnowledge(question, knowledge) {
  if (!question || !knowledge || !Array.isArray(knowledge.entries)) return null;

  const qTokenArray = tokenize(question);
  const qTokens = new Set(qTokenArray);

  let best = null;

  for (const entry of knowledge.entries) {
    if (!entry || !Array.isArray(entry.patterns)) continue;
    for (const pattern of entry.patterns) {
      const p = normalize(pattern);
      if (!p) continue;
      const pTokens = tokenize(p);

      let matched = false;
      let score = 0;

      // Expressao inteira: tokens do pattern aparecem como sequencia contigua de palavras inteiras.
      if (isContiguousSequence(qTokenArray, pTokens)) {
        matched = true;
        score = p.length;
      } else if (pTokens.length === 1 && qTokens.has(pTokens[0])) {
        // Palavra unica corresponde apenas como token inteiro, nunca dentro de outra palavra.
        matched = true;
        score = p.length * 0.9;
      }

      if (matched && (!best || score > best.score)) {
        best = { entry, pattern, score };
      }
    }
  }

  return best ? { entry: best.entry, pattern: best.pattern, score: best.score } : null;
}

function isContiguousSequence(qTokens, pTokens) {
  if (pTokens.length === 0 || pTokens.length > qTokens.length) return false;
  for (let i = 0; i <= qTokens.length - pTokens.length; i++) {
    let match = true;
    for (let j = 0; j < pTokens.length; j++) {
      if (qTokens[i + j] !== pTokens[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}
