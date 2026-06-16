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
                const resposta = await fetch('https://ticketflow-u6mx.onrender.com/api/auth/register', {
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
                const resposta = await fetch('https://ticketflow-u6mx.onrender.com/api/auth/login', {
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
        loadMyTickets(); // <-- ADICIONE ESTA LINHA AQUI!
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
// Variável de controle global para guardar os dados do jogo selecionado
let selectedMatch = null;
const TICKET_PRICE = 150.00;

// Atualização da função de carregamento para conectar ao Modal de compra real
async function loadMatchesFromBackend() {
    const container = document.getElementById('matchesContainer');
    if (!container) return;
    
    try {
        const resposta = await fetch('https://ticketflow-u6mx.onrender.com/api/matches');
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
                    <button class="btn-buy-ticket" onclick="openCheckout(${JSON.stringify(jogo).replace(/"/g, '&quot;')})">Comprar Bilhete</button>
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

// CONTROLES DO MODAL DE CHECKOUT
function openCheckout(jogo) {
    selectedMatch = jogo;
    document.getElementById('modalMatchTeams').textContent = `${jogo.team_a} VS ${jogo.team_b}`;
    document.getElementById('modalMatchStadium').textContent = jogo.stadium;
    document.getElementById('ticketQuantity').value = 1;
    updateTotalPrice();
    document.getElementById('checkoutModal').style.display = 'flex';
}

function closeCheckout() {
    document.getElementById('checkoutModal').style.display = 'none';
}

function updateTotalPrice() {
    const qty = document.getElementById('ticketQuantity').value;
    const total = qty * TICKET_PRICE;
    document.getElementById('modalTotalPrice').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function togglePaymentFields() {
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const cardFields = document.getElementById('creditCardFields');
    cardFields.style.display = (method === 'Cartão de Crédito') ? 'block' : 'none';
}

// PROCESSAMENTO E ANEXO DE CONFIRMAÇÃO
function processPurchase(event) {
    event.preventDefault();
    
    const qty = document.getElementById('ticketQuantity').value;
    const method = document.querySelector('input[name="paymentMethod"]:checked').value;
    const total = qty * TICKET_PRICE;
    const username = localStorage.getItem('username') || 'Usuário';

    // Gerando código de autenticação único
    const authCode = 'TKF-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + qty;
    const timestamp = new Date().toLocaleString('pt-BR');

    // 1. SALVAR O INGRESSO COMPRADO NO LOCALSTORAGE (MÉMÓRIA DO NAVEGADOR)
    const novoIngresso = {
        confronto: `${selectedMatch.team_a} VS ${selectedMatch.team_b}`,
        estadio: selectedMatch.stadium,
        dataJogo: selectedMatch.date_time,
        quantidade: qty,
        totalPago: `R$ ${total.toFixed(2).replace('.', ',')}`,
        metodoPagamento: method,
        dataCompra: timestamp,
        codigo: authCode
    };

    // Pega os ingressos que já existem ou cria uma lista vazia se for o primeiro
    let listaIngressos = JSON.parse(localStorage.getItem('meusIngressos')) || [];
    listaIngressos.push(novoIngresso);
    localStorage.setItem('meusIngressos', JSON.stringify(listaIngressos));

    // Preenchendo o anexo/voucher oficial da tela de sucesso
    document.getElementById('vchTeams').textContent = novoIngresso.confronto;
    document.getElementById('vchStadium').textContent = novoIngresso.estadio;
    document.getElementById('vchDate').textContent = novoIngresso.dataJogo;
    document.getElementById('vchUser').textContent = username;
    document.getElementById('vchQty').textContent = `${qty}x Ingresso(s)`;
    document.getElementById('vchTotal').textContent = novoIngresso.totalPago;
    document.getElementById('vchMethod').textContent = novoIngresso.metodoPagamento;
    document.getElementById('vchTimestamp').textContent = novoIngresso.dataCompra;
    document.getElementById('vchCode').textContent = novoIngresso.codigo;

    // Fechar tela de pagamento e abrir comprovante oficial
    closeCheckout();
    document.getElementById('voucherModal').style.display = 'flex';
}

function closeVoucherSuccess() {
    document.getElementById('voucherModal').style.display = 'none';
    loadMatchesFromBackend(); // Recarrega os jogos da tela principal
    loadMyTickets();          // Atualiza a aba de ingressos comprados imediatamente
}

// 2. NOVA FUNÇÃO: LER OS INGRESSOS SALVOS E MOSTRAR NA ABA DO DASHBOARD
function loadMyTickets() {
    const container = document.getElementById('myTicketsContainer');
    if (!container) return;

    const ingressos = JSON.parse(localStorage.getItem('meusIngressos')) || [];

    if (ingressos.length === 0) {
        container.innerHTML = '<p class="no-tickets">Você ainda não comprou nenhum ingresso.</p>';
        return;
    }

    container.innerHTML = ''; // Limpa o texto de "nenhum ingresso"

    // Renderiza cada ingresso comprado de forma elegante
    ingressos.forEach(ing => {
        const ticketCard = document.createElement('div');
        ticketCard.className = 'ticket-history-card';
        ticketCard.style.cssText = "background: #16213e; border: 1px dashed #00f2fe; padding: 15px; border-radius: 8px; margin-bottom: 15px; color: #fff;";
        
        ticketCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #0f3460; padding-bottom: 8px; margin-bottom: 10px;">
                <strong style="color: #00f2fe; font-size: 16px;">${ing.confronto}</strong>
                <span style="font-size: 12px; background: #0f3460; padding: 2px 6px; border-radius: 4px;">${ing.quantidade}x</span>
            </div>
            <p style="margin: 4px 0; font-size: 14px;"><i class="fas fa-map-marker-alt"></i> ${ing.estadio}</p>
            <p style="margin: 4px 0; font-size: 14px;"><i class="fas fa-calendar-alt"></i> ${ing.dataJogo}</p>
            <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; color: #bbb;">
                <span>Pago via: ${ing.metodoPagamento}</span>
                <strong>Total: ${ing.totalPago}</strong>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #888; text-align: right;">
                Cod: ${ing.codigo} | Compra: ${ing.dataCompra}
            </div>
        `;
        container.appendChild(ticketCard);
    });
}
