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

  const q = normalize(question);
  const qTokens = new Set(tokenize(question));

  let best = null;

  for (const entry of knowledge.entries) {
    if (!entry || !Array.isArray(entry.patterns)) continue;
    for (const pattern of entry.patterns) {
      const p = normalize(pattern);
      if (!p) continue;

      let matched = false;
      let score = 0;

      // Substring: maior precisao, prioriza patterns mais longos.
      if (q.includes(p)) {
        matched = true;
        score = p.length;
      } else {
        // Todas as palavras significativas do pattern estao presentes na pergunta.
        const significant = tokenize(pattern).filter((t) => t.length >= 3);
        if (significant.length && significant.every((t) => qTokens.has(t))) {
          matched = true;
          score = p.length * 0.9;
        }
      }

      if (matched && (!best || score > best.score)) {
        best = { entry, pattern, score };
      }
    }
  }

  return best ? { entry: best.entry, pattern: best.pattern, score: best.score } : null;
}
