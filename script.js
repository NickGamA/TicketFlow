// =========================================================================
// 1. INICIALIZAÇÃO E CONTROLE DE FLUXO (Executa ao carregar a página)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // ---- FLUXO A: TELA DE REGISTRO / CADASTRO (index.html) ----
    // Alterado para capturar o ID correto do formulário de registo
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const dadosDoUsuario = {
                username: username,
                email: email,
                password: password,
                terms_accepted: true
            };

            try {
                const resposta = await fetch('http://127.0.0.1:8000/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosDoUsuario)
                });

                const resultado = await resposta.json();

                if (resposta.ok) {
                    localStorage.setItem('username', username);
                    alert("🎉 Perfeito! Conta criada com sucesso. Entrando no painel...");
                    window.location.href = 'dashboard.html';
                } else {
                    alert("⚠️ Erro no cadastro: " + resultado.detail);
                }
            } catch (erro) {
                alert("🚨 Servidor Python offline. Verifique o terminal Uvicorn!");
                console.error(erro);
            }
        });
    }

    // ---- FLUXO B: TELA DE LOGIN REAL (login.html) ----
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            const credenciais = {
                email: email,
                password: password
            };

            try {
                const resposta = await fetch('http://127.0.0.1:8000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credenciais)
                });

                const resultado = await resposta.json();

                if (resposta.ok) {
                    // Como o teu main.py já devolve o "username" certinho no login, 
                    // capturamos ele diretamente aqui de forma fiel ao banco de dados!
                    const nomeParaExibir = resultado.username || email.split('@')[0];
                    
                    localStorage.setItem('username', nomeParaExibir); 
                    
                    alert(`🔓 Acesso autorizado! Bem-vindo de volta, ${nomeParaExibir}.`);
                    window.location.href = 'dashboard.html';
                } else {
                    alert("⚠️ Erro de validação: " + resultado.detail);
                }
            } catch (erro) {
                alert("🚨 Falha ao conectar ao servidor de autenticação.");
                console.error(erro);
            }
        });
    }

    // ---- FLUXO C: CONFIGURAÇÃO DE ENTRADA NO DASHBOARD (dashboard.html) ----
    const matchesContainer = document.getElementById('matchesContainer');
    if (matchesContainer) {
        const savedUsername = localStorage.getItem('username');
        const welcomeElement = document.getElementById('welcomeUsername');
        if (savedUsername && welcomeElement) {
            welcomeElement.textContent = savedUsername;
        }
        loadMatchesFromBackend();
    }

    // ---- FLUXO D: SAÍDA SEGURA (LOGOUT) ----
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.clear(); 
            alert("Sessão encerrada com segurança.");
            window.location.href = 'login.html'; 
        });
    }
});

// =========================================================================
// 2. FUNÇÕES AUXILIARES DO DASHBOARD
// =========================================================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

async function loadMatchesFromBackend() {
    const container = document.getElementById('matchesContainer');
    if (!container) return;
    
    try {
        const resposta = await fetch('http://127.0.0.1:8000/api/matches');
        const jogos = await resposta.json();

        if (resposta.ok && jogos.length > 0) {
            container.innerHTML = '';
            jogos.forEach(jogo => {
                const card = document.createElement('div');
                card.className = 'match-card';
                card.innerHTML = `
                    <div class="match-teams">
                        <span>${jogo.team_a}</span>
                        <span class="vs-badge">VS</span>
                        <span>${jogo.team_b}</span>
                    </div>
                    <div class="match-info-row">
                        <i class="fas fa-map-marker-alt"></i> Local: ${jogo.stadium}
                    </div>
                    <div class="match-info-row">
                        <i class="fas fa-clock"></i> Data: ${jogo.date_time}
                    </div>
                    <div class="match-info-row">
                        <i class="fas fa-ticket-alt"></i> Disponíveis: ${jogo.available_tickets.toLocaleString()}
                    </div>
                    <button class="btn-buy-ticket" onclick="alert('Funcionalidade de pagamento será integrada a seguir!')">Comprar Bilhete</button>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<div class="loading-status">Nenhum jogo encontrado no banco de dados.</div>';
        }
    } catch (erro) {
        container.innerHTML = '<div class="loading-status" style="color: red;">Erro ao conectar com o servidor Python para trazer os jogos.</div>';
        console.error(erro);
    }
}