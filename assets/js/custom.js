// ============================================================
//  custom.js — Rilen Portfolio Dynamic Features
// ============================================================

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
            'https://api.github.com/users/Rilen/repos?sort=updated&per_page=9&type=public'
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
//  4. BOOTSTRAP
// ============================================================
function init() {
    restoreAccessibilityPrefs();
    loadLatestRepositories();
    loadRecentActivity();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}