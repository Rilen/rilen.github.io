// Rate limiting — sliding window em memória (por isolate do Worker)
const RATE_LIMIT = { max: 20, windowMs: 60_000 };
const hits = new Map(); // IP -> number[]

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

import { normalize, matchKnowledge } from "./knowledge/matcher.js";
import knowledge from "./knowledge/nelir.pt-BR.json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://rilen.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

// Termos que indicam que a pergunta e pertinente ao perfil publico do Rilen.
const PERTINENT_KEYWORDS = [
  "rilen",
  "nelir",
  "perfil",
  "quem",
  "o que faz",
  "atuacao",
  "atuação",
  "formacao",
  "formação",
  "projeto",
  "projetos",
  "contato",
  "email",
  "e-mail",
  "linkedin",
  "portfolio",
  "trabalha",
  "trabalho",
  "empresa",
  "prefeitura",
  "rio das ostras",
  "dados",
  "inteligencia",
  "ia",
  "ciencia de dados",
  "cybersecurity",
  "seguranca",
  "engenharia de dados",
  "cloudflare",
  "databricks",
  "spark",
];

function isPertinent(question) {
  const q = normalize(question);
  return PERTINENT_KEYWORDS.some((k) => q.includes(k));
}

function jsonReply(reply, status = 200) {
  return new Response(JSON.stringify({ reply }), { status, headers: corsHeaders });
}

const systemInstruction = `Seu nome é Nelir (Rilen ao contrário). Você é o assistente virtual do Rilen Tavares Lima.

PERFIL PÚBLICO APROVADO:
- Rilen Tavares Lima, Data Intelligence & AI Architect, 25+ anos de experiência.
- Cultura Open Source e administração GNU/Linux.
- Supervisor de Governança de TIC na Prefeitura de Rio das Ostras (PMRO) desde 2026.
- Especialidades: ciência de dados e IA; big data e infraestrutura; cybersecurity e GRC.
- Formação: Cientista de Dados (Descomplica), MBA em Segurança da Informação, Pós em IA na Prática e Big Data.
- Certificações: Modelling Data Developer, Disruptive Technologies, Cybersecurity.

TECNOLOGIAS (HARD SKILLS):
- Engenharia de Dados: Databricks, Apache Spark, Delta Lake, Polars, ETL/ELT.
- IA & ML: LLMs, RAG, NLP, redes neurais, fine-tuning, Random Forest, Meta Prophet.
- Desenvolvimento: Next.js 14, FastAPI, TypeScript, React 19, Python, R.
- Infra & Cibersegurança: Cloudflare Workers, Docker, LocalAI, hardening, GRC, observabilidade (Grafana/Prometheus).

PROJETOS EM DESTAQUE: eCidade Dashboard, OstraIA, SALI-Guardian, ERP DoisCorações, Convertexto, PolyDB Platform, OstraSmart, SparkBrick, Preve-Ostras, Nelir AI Engine.

CONTATO: rilen.lima@gmail.com | Portfolio: rilen.github.io | LinkedIn: in/rilen.

DIRETRIZES:
- Seja técnico, sênior e direto. Use termos como "Soberania de Dados", "Resiliência Digital" e "Arquitetura Medallion".
- Responda apenas com informação pública aprovada sobre o Rilen. Se a informação verificável estiver ausente, informe a limitação.`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Método não permitido" }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({
          reply: "Muitas requisições. Tente novamente em instantes.",
        }),
        { status: 429, headers: corsHeaders }
      );
    }

    try {
      const requestBody = await request.json();
      const question = requestBody?.question?.trim();

      if (!question) {
        return new Response(
          JSON.stringify({ error: "Pergunta inválida ou vazia" }),
          { status: 400, headers: corsHeaders }
        );
      }

      // 1. Tentar correspondência na base de conhecimento local (zero chamadas ao Gemini).
      const match = matchKnowledge(question, knowledge);
      if (match) {
        return jsonReply(match.entry.reply);
      }

      // 2. Fora da base local. Somente perguntas pertinentes ao Rilen consultam o Gemini.
      if (!isPertinent(question)) {
        return jsonReply(
          "Não tenho informações verificadas sobre esse assunto na minha base de conhecimento. Posso falar sobre o perfil, projetos, tecnologias e contato do Rilen Tavares Lima."
        );
      }

      const apiKey = env?.GEMINI_API_KEY;
      if (!apiKey) {
        return jsonReply(
          "Não consigo consultar a IA neste momento porque as credenciais não estão configuradas. Pergunte sobre o perfil, projetos ou contato do Rilen, que estão na minha base local."
        );
      }

      // 3. Consultar Gemini com contexto público aprovado sobre o Rilen.
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: "user", parts: [{ text: question }] }],
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error?.message || `Erro Gemini ${response.status}`);
        }

        const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!botReply) {
          throw new Error("Resposta inesperada do Gemini");
        }

        return jsonReply(botReply);
      } catch (geminiErr) {
        return jsonReply(
          "Não consegui acessar a Nelir neste momento. Tente novamente em instantes ou entre em contato pelo LinkedIn."
        );
      }
    } catch (err) {
      return jsonReply(
        err.message || "Não consegui processar a sua pergunta. Tente novamente."
      );
    }
  },
};
