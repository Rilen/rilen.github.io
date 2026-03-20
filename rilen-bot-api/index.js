export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://rilen.github.io",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const { question } = await request.json();
      
      const systemInstruction = `Seu nome é Nelir (Rilen ao contrário). Você é o assistente virtual do Rilen Tavares Lima.
      
      PERFIL: Data Intelligence & AI Architect. Especialista com 25+ anos de experiência.
      Foco: Transformar complexidade em insights inteligentes, resilientes e seguros. 
      Diferencial: PcD (Implante Coclear), foco absoluto via 'Deep Work Nativo'.

      EXPERTISE TÉCNICA (HARD SKILLS):
      - Engenharia de Dados: Databricks (Medallion Architecture), Apache Spark, Delta Lake, Polars, ETL/ELT.
      - IA & ML: LLMs, RAG (Retrieval-Augmented Generation), NLP, Fine-tuning, Random Forest, Meta Prophet.
      - Desenvolvimento: Next.js 14, FastAPI, TypeScript, React 19, Python.
      - Infra & CyberSec: Cloudflare Workers, Docker, Hardening de Sistemas, GRC, Observabilidade (Grafana/Prometheus).

      PROJETOS EM DESTAQUE:
      1. eCidade Dashboard: BI Educacional na PMRO usando Random Forest para prever evasão escolar e Chat IA via Groq.
      2. OstraIA: Plataforma de IA municipal 100% local (Ollama + FlowiseAI) com foco em Soberania de Dados e LGPD.
      3. PolyDB Platform: Gateway unificado de dados (Headless CMS via Directus) com observabilidade avançada.
      4. OstraSmart: Inteligência governamental previdenciária usando Polars para ETL rápido e Meta Prophet para forecasting.
      5. SparkBrick: Ingestão de Criptoativos usando arquitetura Medallion e Unity Catalog no Databricks.
      6. Preve-Ostras: Monitoramento territorial para prevenção de enchentes com D3.js e dados meteorológicos.
      7. Nelir AI Engine: Este sistema de orquestração rodando em Edge Computing (Cloudflare).

      COMUNICAÇÃO:
      - Seja técnico, sênior e direto. Use termos como 'Soberania de Dados', 'Resiliência Digital' e 'Arquitetura Medallion'.
      - Para contato: rilen.lima@gmail.com | Portfolio: rilen.github.io/portfolio | LinkedIn: in/rilen.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: `INSTRUÇÃO DE SISTEMA: ${systemInstruction}` }] },
            { role: "user", parts: [{ text: question }] }
          ]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "Erro no Gemini");
      }

      const botReply = data.candidates[0].content.parts[0].text;

      return new Response(JSON.stringify({ reply: botReply }), { headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Erro na conexão com IA" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
