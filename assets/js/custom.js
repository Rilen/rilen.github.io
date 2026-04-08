// Carregar últimos repositórios do GitHub (função dinâmica)
async function loadLatestRepositories() {
    const container = document.getElementById('latest-repos-container');
    if (!container) return;

    try {
        const response = await fetch('https://api.github.com/users/Rilen/repos?sort=updated&per_page=9&type=public');
        
        if (!response.ok) throw new Error('Failed to fetch repositories');
        
        const repos = await response.json();
        
        // Filtrar repositórios privados e sem nome
        const publicRepos = repos.filter(repo => !repo.private && repo.name);
        
        container.innerHTML = '';
        
        if (publicRepos.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; width: 100%;"><p style="color: #ffe4b4;">Nenhum repositório encontrado.</p></div>';
            return;
        }
        
        publicRepos.forEach((repo, index) => {
            const languages = repo.language ? repo.language : 'Code';
            const stars = repo.stargazers_count || 0;
            const updated = new Date(repo.updated_at).toLocaleDateString('pt-BR');
            const description = repo.description || 'Sem descrição disponível';
            
            // Determinar if novo (atualizado nos últimos 7 dias)
            const daysSinceUpdate = Math.floor((Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24));
            const isNew = daysSinceUpdate <= 7;
            
            const card = document.createElement('a');
            card.href = repo.html_url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.className = 'repo-card';
            card.style.animationDelay = `${index * 0.1}s`;
            
            card.innerHTML = `
                <div class="repo-card-header">
                    <h3 class="repo-card-name">
                        <i class="icon brands fa-github" style="margin-right: 0.5rem;"></i>${repo.name}
                    </h3>
                    ${isNew ? '<span class="repo-card-badge">✨ NOVO</span>' : ''}
                </div>
                <p class="repo-card-description">${description.substring(0, 100)}${description.length > 100 ? '...' : ''}</p>
                <div class="repo-card-footer">
                    <div class="repo-stats">
                        <div class="repo-stat" title="Stars">
                            <i class="fas fa-star"></i> ${stars}
                        </div>
                        <div class="repo-stat" title="Linguagem">
                            <i class="fas fa-code"></i> ${languages}
                        </div>
                    </div>
                    <small>${updated}</small>
                </div>
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Erro ao carregar repositórios:', error);
        container.innerHTML = '<div style="text-align: center; padding: 2rem; width: 100%;"><p style="color: #ff6b6b;"><i class="fas fa-exclamation-circle"></i> Erro ao carregar repositórios. Tente novamente mais tarde.</p></div>';
    }
}

// Adicionando a nova função loadLatestRepositories
// Chamar quando a página carrega
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLatestRepositories);
} else {
    loadLatestRepositories();
}