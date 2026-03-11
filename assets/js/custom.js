/* Lógica Personalizada do Portfólio */

window.sendEmail = function (event) {
    event.preventDefault();
    emailjs.sendForm('service_na1fzjo', 'template_706q96k', '#contact-form')
        .then(function () {
            alert('Mensagem enviada com sucesso! Retornarei em breve.');
            document.getElementById('contact-form').reset();
        }, function (error) {
            alert('Erro no envio. Por favor, conecte-se pelo LinkedIn.');
        });
    return false;
};

// Acessibilidade logic
let fontSize = 1;
window.changeFontSize = function (delta) {
    fontSize += delta * 0.1;
    fontSize = Math.min(Math.max(fontSize, 0.8), 1.5);
    document.documentElement.style.fontSize = `${fontSize}vmax`;
};

window.toggleContrast = function () {
    document.body.classList.toggle('high-contrast');
};

// RilenBot Logic
document.addEventListener('DOMContentLoaded', () => {
    const rilenbotTrigger = document.getElementById('rilenbot-trigger');
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatSend = document.getElementById('chat-send');

    if (rilenbotTrigger && chatContainer) {
        rilenbotTrigger.addEventListener('click', () => {
            const isVisible = chatContainer.style.display === 'flex';
            chatContainer.style.display = isVisible ? 'none' : 'flex';
        });
    }

    if (chatSend && chatInput) {
        chatSend.addEventListener('click', async () => {
            const text = chatInput.value.trim();
            if (text) {
                appendChatHubMessage('Você', text);
                chatInput.value = '';

                // CONEXÃO COM O RILENBOT REAL (Cloudflare Worker + Google Gemini)
                try {
                    const workerUrl = "https://rilen-bot-api.rilen-lima.workers.dev";

                    if (workerUrl && !workerUrl.includes("SUA_URL_DO_WORKER")) {
                        const response = await fetch(workerUrl, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ question: text })
                        });

                        if (!response.ok) throw new Error("Worker responded with error");

                        const data = await response.json();
                        appendChatHubMessage('RilenBot', data.reply);
                        return;
                    }
                } catch (err) {
                    console.error("Erro no Worker, usando Fallback:", err);
                }

                // Fallback Logic
                setTimeout(() => {
                    let response = "Interessante! Como especialista em IA e Infra, o Rilen foca muito nesse ponto. ";
                    if (text.toLowerCase().includes('ostras')) {
                        response = "O Preve-Ostras é um dos meus orgulhos. Usa D3.js e React 19 para monitorar marés e chuvas em tempo real em Rio das Ostras.";
                    } else if (text.toLowerCase().includes('deep')) {
                        response = "O 'Deep Work nativo' do Rilen vem da sua concentração absoluta, potencializada pelo implante coclear. É o silêncio que gera precisão.";
                    } else if (text.toLowerCase().includes('segurança') || text.toLowerCase().includes('security')) {
                        response = "Segurança é a base. O Rilen aplica hardening sênior e GRC em todos os deploys, garantindo que o código nasça seguro.";
                    } else {
                        response += "Para detalhes técnicos profundos, recomendo conferir o LinkedIn ou me perguntar sobre projetos específicos!";
                    }
                    appendChatHubMessage('RilenBot', response);
                }, 600);
            }
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                e.stopPropagation();
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                chatSend.click();
            }
        });
    }

    function appendChatHubMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `message ${sender === 'RilenBot' ? 'bot' : 'user'}`;
        div.innerHTML = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    window.sendQuickQuestion = function (text) {
        chatInput.value = text;
        chatSend.click();
        const suggestions = document.getElementById('chat-suggestions');
        if (suggestions) suggestions.style.display = 'none';
    };
});

// D3.js GitHub Activity Pulse
async function initGithubPulse() {
    const pulseContainer = document.getElementById('githubPulse');
    if (!pulseContainer) return;

    try {
        const response = await fetch('https://api.github.com/users/rilen/events/public');
        const events = await response.json();

        const now = new Date();
        const dates = d3.timeDays(d3.timeDay.offset(now, -14), d3.timeDay.offset(now, 1));
        const counts = new Map(dates.map(d => [d.toISOString().slice(0, 10), 0]));

        events.forEach(e => {
            const date = e.created_at.slice(0, 10);
            if (counts.has(date)) {
                counts.set(date, (counts.get(date) || 0) + 1);
            }
        });

        const data = dates.map(d => ({
            date: d,
            count: counts.get(d.toISOString().slice(0, 10))
        }));

        const container = d3.select("#githubPulse");
        const width = container.node().getBoundingClientRect().width;
        const height = 80;
        const margin = { top: 5, right: 5, bottom: 5, left: 5 };

        const svg = container.append("svg")
            .attr("width", "100%")
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`);

        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) || 5])
            .range([height - margin.bottom, margin.top]);

        const gradient = svg.append("defs")
            .append("linearGradient")
            .attr("id", "pulse-gradient")
            .attr("x1", "0%").attr("y1", "0%")
            .attr("x2", "0%").attr("y2", "100%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", "#e37b7c");
        gradient.append("stop").attr("offset", "100%").attr("stop-color", "rgba(114, 97, 147, 0)");

        const area = d3.area()
            .x(d => x(d.date))
            .y0(height - margin.bottom)
            .y1(d => y(d.count))
            .curve(d3.curveMonotoneX);

        const line = d3.line()
            .x(d => x(d.date))
            .y(d => y(d.count))
            .curve(d3.curveMonotoneX);

        svg.append("path")
            .datum(data)
            .attr("fill", "url(#pulse-gradient)")
            .attr("d", area);

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "#ffe4b4")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        svg.selectAll("circle")
            .data(data.filter(d => d.count > 0))
            .enter().append("circle")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.count))
            .attr("r", 2)
            .attr("fill", "#ffe4b4");

    } catch (err) {
        console.error("Error loading GitHub activity:", err);
        d3.select("#githubPulse").text("Offline");
    }
}

window.addEventListener('load', initGithubPulse);
