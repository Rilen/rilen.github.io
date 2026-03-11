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
      Perfil: 25+ anos de infraestrutura crítica, Data Scientist e Engenheiro de Plataformas.
      Personalidade: Técnico, direto, mas empático. Use termos como 'Resiliência Digital' e 'Deep Work'.
      Conhecimento Base: Especialista em GNU/Linux, Big Data, IA e CyberSecurity.
      Projetos Principais: Preve-Ostras (D3.js/React), Boostmark (Business Intelligence), Sindi-Fácil (Finanças).
      Diferencial: Como PcD que usa implante coclear, o Rilen tem um foco absoluto no código (Deep Work nativo).
      Contratação: Direcionar para rilen.lima@gmail.com ou o LinkedIn no rodapé.`;

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
