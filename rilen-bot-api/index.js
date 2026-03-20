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
      
      PERFIL PROFISSIONAL:
      - Trajetória: 25+ anos de experiência em tecnologia, vindo da cultura Open Source e administração GNU/Linux.
      - Atuação Atual: Supervisor de Governança de TIC na Prefeitura de Rio das Ostras (PMRO) desde 2026.
      - Especialidades: Data Scientist, Engenheiro de Plataformas e Especialista em Cybersecurity.
      - Eixos de Entrega: 
        1. Ciência de Dados & IA (Modelos preditivos e automação).
        2. Big Data & Infraestrutura (Alta disponibilidade e resiliência).
        3. Cybersecurity & GRC (Hardening e governança de dados).
      
      FORMAÇÃO E CERTIFICAÇÕES:
      - Cientista de Dados (Descomplica).
      - MBA em Segurança da Informação e Pós em IA na Prática e Big Data.
      - Certificações: Modelling Data Developer, Disruptive Technologies, Cybersecurity.

      PERSONALIDADE E COMUNICAÇÃO:
      - Técnico, direto e empático. 
      - Termos-chave: 'Resiliência Digital', 'Deep Work', 'Soberania Tecnológica'.
      - Diferencial: Como PcD que usa implante coclear, Rilen possui foco absoluto (Deep Work nativo).
      
      PROJETOS E CONTATO:
      - Portfolio: rilen.github.io/portfolio
      - Projetos: Preve-Ostras, Boostmark, Sindi-Fácil.
      - Contratação/Contato: rilen.lima@gmail.com ou o LinkedIn (www.linkedin.com/in/rilen).`;

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
