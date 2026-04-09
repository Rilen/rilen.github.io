// ============================================================
//  custom.js — Rilen Portfolio Dynamic Features
// ============================================================

// ============================================================
//  0. EMAIL (EmailJS)
// ============================================================
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

// ─── Language color map ──────────────────────────────────────
const LANG_COLORS = {
    Python: '#3572A5', TypeScript: '#2b7489', JavaScript: '#f1e05a',
    HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
    Kotlin: '#A97BFF', Java: '#b07219', Rust: '#dea584',
    Go: '#00ADD8', C: '#555555', 'C++': '#f34b7d',
    'Jupyter Notebook': '#DA5B0B', R: '#198CE7',
};

// ============================================================
//  1. CARREGAR REPOSITÓRIOS RECENTES
// ============================================================
async function loadLatestRepositories() {
    const container = document.getElementById('latest-repos-container');
    if (!container) return;

    try {
        const res = await fetch(
            'https://api.github.com/users/Rilen/repos?sort=updated&per_page=6&type=public'
        );
        if (!res.ok) throw new Error(`GitHub API: ${res.status}`);

        const repos = await res.json();
        const publicRepos = repos.filter(r => !r.private && r.name);

        container.innerHTML = '';

        if (publicRepos.length === 0) {
            container.innerHTML =
                '<p class="repos-empty">Nenhum repositório público encontrado.</p>';
            return;
        }

        publicRepos.forEach((repo, idx) => {
            const lang      = repo.language || 'Other';
            const langColor = LANG_COLORS[lang] || '#8b949e';
            const stars     = repo.stargazers_count || 0;
            const forks     = repo.forks_count || 0;
            const updated   = new Date(repo.updated_at).toLocaleDateString('pt-BR');
            const desc      = repo.description
                ? repo.description.substring(0, 90) + (repo.description.length > 90 ? '…' : '')
                : 'Sem descrição disponível';

            const daysSince = Math.floor(
                (Date.now() - new Date(repo.updated_at).getTime()) / 86400000
            );
            const isNew = daysSince <= 7;

            const card = document.createElement('a');
            card.href      = repo.html_url;
            card.target    = '_blank';
            card.rel       = 'noopener noreferrer';
            card.className = 'repo-card';
            card.style.animationDelay = `${idx * 0.08}s`;
            card.setAttribute('aria-label', `Repositório ${repo.name}`);

            card.innerHTML = `
                <div class="repo-card-header">
                    <span class="repo-card-name">
                        <i class="icon brands fa-github"></i>${repo.name}
                    </span>
                    ${isNew ? '<span class="repo-card-badge">✨ NOVO</span>' : ''}
                </div>
                <p class="repo-card-description">${desc}</p>
                <div class="repo-card-footer">
                    <div class="repo-stats">
                        <span class="repo-lang-dot" style="background:${langColor}"></span>
                        <span class="repo-lang-label">${lang}</span>
                        ${stars ? `<span class="repo-stat" title="Stars">⭐ ${stars}</span>` : ''}
                        ${forks ? `<span class="repo-stat" title="Forks">🍴 ${forks}</span>` : ''}
                    </div>
                    <small class="repo-date">🔄 ${updated}</small>
                </div>
            `;

            container.appendChild(card);
        });

    } catch (err) {
        console.error('Erro ao carregar repositórios:', err);
        const container = document.getElementById('latest-repos-container');
        if (container) container.innerHTML =
            '<p class="repos-error"><i class="fas fa-exclamation-circle"></i> ' +
            'Erro ao carregar repositórios. <a href="https://github.com/Rilen" target="_blank">Ver no GitHub →</a></p>';
    }
}

// ============================================================
//  2. CARREGAR ATIVIDADE RECENTE DO GITHUB
// ============================================================
const EVENT_LABELS = {
    PushEvent:             { icon: 'fa-code-branch', label: 'Push' },
    CreateEvent:           { icon: 'fa-plus-circle', label: 'Criado' },
    WatchEvent:            { icon: 'fa-star',         label: 'Starred' },
    ForkEvent:             { icon: 'fa-code-branch',  label: 'Fork' },
    PullRequestEvent:      { icon: 'fa-code-merge',   label: 'Pull Request' },
    IssuesEvent:           { icon: 'fa-exclamation-circle', label: 'Issue' },
    IssueCommentEvent:     { icon: 'fa-comment',      label: 'Comentário' },
    DeleteEvent:           { icon: 'fa-trash',        label: 'Deletado' },
    ReleaseEvent:          { icon: 'fa-tag',          label: 'Release' },
    PublicEvent:           { icon: 'fa-globe',        label: 'Público' },
};

async function loadRecentActivity() {
    const el = document.getElementById('recent-activity');
    if (!el) return;

    try {
        const res = await fetch(
            'https://api.github.com/users/Rilen/events/public?per_page=20'
        );
        if (!res.ok) throw new Error(`Events API: ${res.status}`);

        const events = await res.json();

        // Deduplicate by repo+type — show max 5 items
        const seen = new Set();
        const items = [];
        for (const ev of events) {
            const key = `${ev.repo.name}:${ev.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                items.push(ev);
                if (items.length >= 5) break;
            }
        }

        if (items.length === 0) {
            el.innerHTML = '<span class="feed-empty">Sem atividade recente.</span>';
            return;
        }

        el.innerHTML = '';
        items.forEach(ev => {
            const meta  = EVENT_LABELS[ev.type] || { icon: 'fa-code', label: ev.type.replace('Event', '') };
            const repo  = ev.repo.name.split('/')[1] || ev.repo.name;
            const date  = new Date(ev.created_at).toLocaleDateString('pt-BR');
            const href  = `https://github.com/${ev.repo.name}`;

            const item = document.createElement('a');
            item.href      = href;
            item.target    = '_blank';
            item.rel       = 'noopener noreferrer';
            item.className = 'feed-item';
            item.innerHTML = `
                <i class="fas ${meta.icon} feed-icon"></i>
                <span class="feed-text">
                    <strong>${meta.label}</strong> em
                    <span class="feed-repo">${repo}</span>
                </span>
                <small class="feed-date">${date}</small>
            `;
            el.appendChild(item);
        });

    } catch (err) {
        console.error('Erro ao carregar atividade:', err);
        const el = document.getElementById('recent-activity');
        if (el) el.innerHTML =
            '<span class="feed-empty">Atividade indisponível.</span>';
    }
}

// ============================================================
//  3. ACESSIBILIDADE — Fonte & Contraste
// ============================================================
function changeFontSize(delta) {
    const current = parseFloat(
        getComputedStyle(document.documentElement).fontSize
    );
    const next = Math.min(Math.max(current + delta, 12), 22);
    document.documentElement.style.fontSize = `${next}px`;
    localStorage.setItem('rilen-fontsize', next);
}

function toggleContrast() {
    document.body.classList.toggle('high-contrast');
    localStorage.setItem(
        'rilen-contrast',
        document.body.classList.contains('high-contrast') ? '1' : '0'
    );
}

function restoreAccessibilityPrefs() {
    const fs = localStorage.getItem('rilen-fontsize');
    const hc = localStorage.getItem('rilen-contrast');
    if (fs) document.documentElement.style.fontSize = `${fs}px`;
    if (hc === '1') document.body.classList.add('high-contrast');
}

// ============================================================
//  4. CHAT BOT NELIR
// ============================================================
function initNelirChat() {
    const trigger      = document.getElementById('rilenbot-trigger');
    const container    = document.getElementById('chat-container');
    const chatInput    = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const chatSend     = document.getElementById('chat-send');

    if (!trigger || !container) return;

    // Toggle ao clicar no avatar
    trigger.addEventListener('click', () => {
        const isVisible = container.style.display === 'flex';
        container.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible && chatInput) setTimeout(() => chatInput.focus(), 100);
    });

    if (!chatSend || !chatInput) return;

    // Envio de mensagem
    chatSend.addEventListener('click', async () => {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMsg('user', text);
        chatInput.value = '';

        // Indicador de digitação
        const typingId = 'typing-' + Date.now();
        appendMsg('bot', '<i class="fas fa-ellipsis-h"></i>', typingId);

        try {
            const workerUrl = 'https://rilen-bot-api.rilen-lima.workers.dev';
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: text })
            });
            if (!response.ok) throw new Error('Worker error');
            const data = await response.json();
            removeMsg(typingId);
            appendMsg('bot', data.reply);
        } catch (err) {
            console.warn('Fallback local ativado:', err);
            removeMsg(typingId);
            const t = text.toLowerCase();
            let reply = 'Interessante! Como especialista em IA e Infra, o Rilen foca muito nesse ponto. Para mais detalhes, confira o LinkedIn ou pergunte sobre um projeto específico!';
            if (t.includes('ostras'))   reply = 'O Preve-Ostras monitora marés e chuvas em tempo real em Rio das Ostras usando D3.js e Firebase.';
            else if (t.includes('deep')) reply = 'O Deep Work nativo do Rilen vem da concentração absoluta potencializada pelo implante coclear. Silêncio = precisão.';
            else if (t.includes('segurança') || t.includes('security')) reply = 'Segurança é a base. Rilen aplica hardening sênior e GRC em todos os deploys.';
            else if (t.includes('dados') || t.includes('data')) reply = 'Trabalho com Big Data desde Spark/Databricks até pipelines Python Polars, sempre com observabilidade.';
            appendMsg('bot', reply);
        }
    });

    // Enter para enviar, Space não deve sair do campo
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === ' ')     e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); chatSend.click(); }
    });

    function appendMsg(type, html, id) {
        const div = document.createElement('div');
        div.className = `message ${type === 'bot' ? 'bot' : 'user'}`;
        if (id) div.id = id;
        div.innerHTML = html;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeMsg(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    // Perguntas rápidas (sugestões)
    window.sendQuickQuestion = function (text) {
        chatInput.value = text;
        chatSend.click();
        const suggestions = document.getElementById('chat-suggestions');
        if (suggestions) suggestions.style.display = 'none';
    };
}

// ============================================================
//  5. D3 GITHUB ACTIVITY PULSE
// ============================================================
async function initGithubPulse() {
    const pulseContainer = document.getElementById('githubPulse');
    if (!pulseContainer) return;

    try {
        const response = await fetch('https://api.github.com/users/rilen/events/public');
        const events = await response.json();

        const now   = new Date();
        const dates = d3.timeDays(d3.timeDay.offset(now, -14), d3.timeDay.offset(now, 1));
        const counts = new Map(dates.map(d => [d.toISOString().slice(0, 10), 0]));

        events.forEach(e => {
            const date = e.created_at.slice(0, 10);
            if (counts.has(date)) counts.set(date, (counts.get(date) || 0) + 1);
        });

        const data = dates.map(d => ({ date: d, count: counts.get(d.toISOString().slice(0, 10)) }));
        const container = d3.select('#githubPulse');
        const width = container.node().getBoundingClientRect().width || 300;
        const height = 80;
        const margin = { top: 5, right: 5, bottom: 5, left: 5 };

        const svg = container.append('svg')
            .attr('width', '100%').attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count) || 5]).range([height - margin.bottom, margin.top]);

        const grad = svg.append('defs').append('linearGradient')
            .attr('id', 'pulse-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#e37b7c');
        grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(114,97,147,0)');

        const area = d3.area().x(d => x(d.date)).y0(height - margin.bottom).y1(d => y(d.count)).curve(d3.curveMonotoneX);
        const line = d3.line().x(d => x(d.date)).y(d => y(d.count)).curve(d3.curveMonotoneX);

        svg.append('path').datum(data).attr('fill', 'url(#pulse-gradient)').attr('d', area);
        svg.append('path').datum(data).attr('fill', 'none').attr('stroke', '#ffe4b4').attr('stroke-width', 1.5).attr('d', line);
        svg.selectAll('circle').data(data.filter(d => d.count > 0)).enter().append('circle')
            .attr('cx', d => x(d.date)).attr('cy', d => y(d.count)).attr('r', 2).attr('fill', '#ffe4b4');

    } catch (err) {
        console.error('Error loading GitHub activity:', err);
        d3.select('#githubPulse').text('Offline');
    }
}

// ============================================================
//  6. BOOTSTRAP
// ============================================================
function init() {
    restoreAccessibilityPrefs();
    loadLatestRepositories();
    loadRecentActivity();
    initNelirChat();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.addEventListener('load', initGithubPulse);