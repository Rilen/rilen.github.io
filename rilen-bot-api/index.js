// Rate limiting — sliding window em memória (por isolate do Worker)
const RATE_LIMIT = { max: 20, windowMs: 60_000 };
const hits = new Map(); // IP -> number[]

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://rilen.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
        status: 429,
        headers: corsHeaders,
      });
    }

    try {
      const requestBody = await request.json();
      const question = requestBody?.question?.trim();
      const apiKey = env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error('Chave GEMINI_API_KEY não configurada');
      }

      if (!question) {
        throw new Error('Pergunta inválida ou vazia');
      }

      const systemInstruction = `Seu nome é Nelir (Rilen ao contrário). Você é o assistente virtual do Rilen Tavares Lima.
      
      PERFIL: Data Intelligence & AI Architect. Especialista com 25+ anos de experiência.
      Foco: Transformar complexidade em insights inteligentes, resilientes e seguros. 
      Diferencial: PcD (Implante Coclear), foco absoluto via 'Deep Work Nativo'.

      EXPERTISE TÉCNICA (HARD SKILLS):
      - Engenharia de Dados: Databricks (Medallion Architecture), Apache Spark, Delta Lake, Polars, ETL/ELT.
      - IA & ML: LLMs, RAG (Retrieval-Augmented Generation), NLP, Redes Neurais, Fine-tuning, Random Forest, Meta Prophet.
      - Desenvolvimento: Next.js 14, FastAPI, TypeScript, React 19, Python, R.
      - Infra & CyberSec: Cloudflare Workers, Docker, LocalAI (LLMs 14B em CPU AVX-512), Hardening, GRC, Observabilidade (Grafana/Prometheus).

      PROJETOS EM DESTAQUE:
      1. eCidade Dashboard: BI Educacional na PMRO usando Random Forest para prever evasão escolar e Chat IA via Groq.
      2. OstraIA: Plataforma de IA municipal 100% local (Ollama + FlowiseAI + LocalAI) com foco em Soberania de Dados e LGPD.
      3. SALI-Guardian: Plataforma de auditoria inteligente para governança de dados municipais.
      4. ERP DoisCorações: Sistema crítico Full-Stack com auditoria forense SHA-256 e RBAC estrito.
      5. Convertexto: Ferramenta de IA para transcrição automatizada de reuniões longas com cortes precisos.
      6. PolyDB Platform: Gateway unificado de dados (Headless CMS via Directus) com observabilidade avançada.
      7. OstraSmart: Inteligência governamental previdenciária usando Polars para ETL rápido e Meta Prophet para forecasting.
      8. SparkBrick: Ingestão de Criptoativos usando arquitetura Medallion e Unity Catalog no Databricks.
      9. Preve-Ostras: Monitoramento territorial para prevenção de enchentes com D3.js e dados meteorológicos.
      10. Nelir AI Engine: Este sistema de orquestração rodando em Edge Computing (Cloudflare).

      COMUNICAÇÃO:
      - Seja técnico, sênior e direto. Use termos como 'Soberania de Dados', 'Resiliência Digital' e 'Arquitetura Medallion'.
      - Para contato: rilen.lima@gmail.com | Portfolio: rilen.github.io | LinkedIn: in/rilen.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [
            { role: "user", parts: [{ text: question }] }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || `Erro Gemini ${response.status}`);
      }

      const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!botReply) {
        throw new Error('Resposta inesperada do Gemini');
      }

      return new Response(JSON.stringify({ reply: botReply }), { headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Erro na conexão com IA" }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
