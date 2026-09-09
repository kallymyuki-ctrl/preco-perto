const SUPABASE_URL = 'https://jfwlkzjgzghufuperhyz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-GvvuQDs3tTnSbw-QhQrdA_W93rvvzA';

const supabase = {
  async from(table) {
    return {
      select: async (columns = '*') => {
        const url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}`;
        const response = await fetch(url, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' } });
        if (!response.ok) throw new Error(`Erro ao buscar ${table}`);
        return await response.json();
      }
    };
  }
};

let stores = [];
let products = [];
let cart = JSON.parse(localStorage.getItem("pp_cart")) || [];
let favorites = JSON.parse(localStorage.getItem("pp_favs")) || [];
let currentCategory = 'todos';
let currentCity = localStorage.getItem("pp_city") || 'Porto Alegre, RS';
let currentUser = JSON.parse(localStorage.getItem("pp_user")) || null;
let transactions = JSON.parse(localStorage.getItem("pp_transactions")) || [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!currentUser) {
    showPage('login');
  } else {
    showPage('home');
    await loadData();
    updateCartUI();
    updateStats();
    updateProfileUI();
    updateWalletUI();
    setupSearch();
    document.getElementById('city-name').textContent = currentCity;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
});

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(`page-${page}`).style.display = 'block';
  if (page === 'cart') document.getElementById('cart-full-content').innerHTML = document.getElementById('cart-list').outerHTML;
  document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-button[onclick="showPage('${page}')"]`);
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('login-form').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'flex' : 'none';
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const users = JSON.parse(localStorage.getItem("pp_users")) || [];
  const user = users.find(u => (u.email === email || u.phone === email) && u.password === password);
  if (user) {
    currentUser = user;
    localStorage.setItem("pp_user", JSON.stringify(user));
    toast(`Bem-vindo de volta, ${user.name}!`);
    showPage('home');
    loadData();
    updateProfileUI();
    updateWalletUI();
  } else {
    toast('Email/telefone ou senha incorretos');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;
  const users = JSON.parse(localStorage.getItem("pp_users")) || [];
  if (users.find(u => u.email === email)) { toast('Email já cadastrado'); return; }
  const newUser = { id: Date.now(), name, email, phone, password, city: currentCity, avatar: null, missions: 0, cashback: 0, savings: 0, balance: 0 };
  users.push(newUser);
  localStorage.setItem("pp_users", JSON.stringify(users));
  currentUser = newUser;
  localStorage.setItem("pp_user", JSON.stringify(newUser));
  toast('Conta criada com sucesso!');
  showPage('home');
  loadData();
  updateProfileUI();
  updateWalletUI();
}

function logout() {
  if (confirm('Deseja realmente sair?')) {
    currentUser = null;
    localStorage.removeItem("pp_user");
    showPage('login');
    toast('Você saiu da conta');
  }
}

function updateProfileUI() {
  if (!currentUser) return;
  document.getElementById('profile-display-name').textContent = currentUser.name;
  document.getElementById('profile-display-email').textContent = currentUser.email;
  document.getElementById('profile-name').value = currentUser.name;
  document.getElementById('profile-email').value = currentUser.email;
  document.getElementById('profile-phone').value = currentUser.phone;
  document.getElementById('profile-city').value = currentUser.city || currentCity;
  const avatarEl = document.getElementById('profile-avatar');
  avatarEl.innerHTML = currentUser.avatar ? `<img src="${currentUser.avatar}" alt="Avatar">` : '👤';
  document.getElementById('profile-missions').textContent = currentUser.missions || 0;
  document.getElementById('profile-cashback').textContent = `R$ ${(currentUser.cashback || 0).toFixed(2).replace('.', ',')}`;
  document.getElementById('profile-savings').textContent = `R$ ${(currentUser.savings || 0).toFixed(2).replace('.', ',')}`;
}

function changeProfilePhoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        currentUser.avatar = event.target.result;
        localStorage.setItem("pp_user", JSON.stringify(currentUser));
        updateProfileUI();
        toast('Foto atualizada!');
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function saveProfile(e) {
  e.preventDefault();
  currentUser.name = document.getElementById('profile-name').value;
  currentUser.email = document.getElementById('profile-email').value;
  currentUser.phone = document.getElementById('profile-phone').value;
  currentUser.city = document.getElementById('profile-city').value;
  localStorage.setItem("pp_user", JSON.stringify(currentUser));
  const users = JSON.parse(localStorage.getItem("pp_users")) || [];
  const index = users.findIndex(u => u.id === currentUser.id);
  if (index > -1) { users[index] = currentUser; localStorage.setItem("pp_users", JSON.stringify(users)); }
  updateProfileUI();
  toast('Perfil atualizado!');
}

function updateWalletUI() {
  if (!currentUser) return;
  document.getElementById('wallet-balance').textContent = `R$ ${(currentUser.balance || 0).toFixed(2).replace('.', ',')}`;
  document.getElementById('wallet-missions').textContent = currentUser.missions || 0;
  document.getElementById('wallet-cashback').textContent = `R$ ${(currentUser.cashback || 0).toFixed(2).replace('.', ',')}`;
  document.getElementById('wallet-bonus').textContent = `R$ ${(currentUser.bonus || 0).toFixed(2).replace('.', ',')}`;
  const list = document.getElementById('transaction-list');
  if (transactions.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-emoji">💰</div><h2>Nenhuma transação ainda</h2><p>Complete missões para começar a ganhar!</p></div>`;
  } else {
    list.innerHTML = transactions.slice(0, 10).map(t => `
      <div class="transaction-item">
        <div class="transaction-icon">${t.type === 'cashback' ? '💰' : t.type === 'mission' ? '✅' : '💸'}</div>
        <div class="transaction-info"><strong>${t.description}</strong><small>${new Date(t.date).toLocaleDateString('pt-BR')}</small></div>
        <div class="transaction-amount ${t.amount < 0 ? 'negative' : ''}">${t.amount < 0 ? '-' : '+'} R$ ${Math.abs(t.amount).toFixed(2).replace('.', ',')}</div>
      </div>`).join('');
  }
}

function withdraw() {
  if (!currentUser || currentUser.balance < 10) { toast('Saldo mínimo para saque: R$ 10,00'); return; }
  const pixKey = prompt('Digite sua chave Pix:');
  if (pixKey) {
    transactions.unshift({ type: 'withdraw', description: 'Saque via Pix', amount: -currentUser.balance, date: new Date().toISOString() });
    localStorage.setItem("pp_transactions", JSON.stringify(transactions));
    const amount = currentUser.balance;
    currentUser.balance = 0;
    localStorage.setItem("pp_user", JSON.stringify(currentUser));
    updateWalletUI();
    toast(`Saque de R$ ${amount.toFixed(2).replace('.', ',')} solicitado!`);
  }
}

function applyForWork(type) {
  if (!currentUser) { toast('Faça login para se candidatar'); showPage('login'); return; }
  const titles = { digital: 'Avaliador Digital (Remoto)', store: 'Consultor de Loja (Híbrido)', mapper: 'Mapeador Urbano (Em Movimento)' };
  document.getElementById('modal-title').textContent = titles[type];
  document.getElementById('work-name').value = currentUser.name;
  document.getElementById('work-email').value = currentUser.email;
  document.getElementById('work-phone').value = currentUser.phone;
  document.getElementById('work-city').value = currentUser.city || currentCity;
  document.getElementById('work-modal').classList.add('open');
}

function closeWorkModal() { document.getElementById('work-modal').classList.remove('open'); }

function submitWorkApplication(e) {
  e.preventDefault();
  closeWorkModal();
  toast('Candidatura enviada! Entraremos em contato em breve.');
  setTimeout(() => {
    currentUser.missions = (currentUser.missions || 0) + 1;
    currentUser.balance = (currentUser.balance || 0) + 25;
    currentUser.cashback = (currentUser.cashback || 0) + 25;
    localStorage.setItem("pp_user", JSON.stringify(currentUser));
    transactions.unshift({ type: 'mission', description: 'Bônus de boas-vindas - Primeira missão', amount: 25, date: new Date().toISOString() });
    localStorage.setItem("pp_transactions", JSON.stringify(transactions));
    updateWalletUI();
    updateProfileUI();
    toast('🎉 Parabéns! Você recebeu R$ 25,00 de bônus!');
  }, 2000);
}

async function loadData() {
  try {
    stores = await (await supabase.from('stores').select('*'));
    products = await (await supabase.from('products').select('*'));
    renderStores();
    renderProducts('todos');
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    loadLocalData();
  }
}

function loadLocalData() {
  stores = [
    {id:1,name:"Carrefour",category:"mercado",emoji:"🛒",color:"#005c9e",hours:"07h - 22h",benefits:"Preço baixo todo dia",sponsored:true},
    {id:2,name:"Pão de Açúcar",category:"mercado",emoji:"🥖",color:"#006636",hours:"07h - 23h",benefits:"Qualidade e frescor",sponsored:true},
    {id:3,name:"Drogasil",category:"farmacia",emoji:"💊",color:"#003399",hours:"24 horas",benefits:"Clube de descontos",sponsored:false},
    {id:4,name:"Panvel",category:"farmacia",emoji:"🏥",color:"#e30613",hours:"08h - 22h",benefits:"Genéricos com desconto",sponsored:false},
    {id:5,name:"Petz",category:"pet",emoji:"🐾",color:"#ff6600",hours:"09h - 21h",benefits:"Banho e tosa com 10% OFF",sponsored:false}
  ];
  products = [
    {id:1,name:"Arroz Branco 5kg",store_id:1,category:"mercado",emoji:"🍚",price:24.90},
    {id:2,name:"Arroz Branco 5kg",store_id:2,category:"mercado",emoji:"🍚",price:27.50},
    {id:3,name:"Dipirona 500mg 10cp",store_id:3,category:"farmacia",emoji:"💊",price:4.99},
    {id:4,name:"Dipirona 500mg 10cp",store_id:4,category:"farmacia",emoji:"💊",price:3.89},
    {id:5,name:"Ração Cão Adulto 15kg",store_id:5,category:"pet",emoji:"🐕",price:149.90},
    {id:6,name:"Leite Integral 1L",store_id:1,category:"mercado",emoji:"🥛",price:4.79},
    {id:7,name:"Leite Integral 1L",store_id:2,category:"mercado",emoji:"🥛",price:5.29},
    {id:8,name:"Shampoo Pet 500ml",store_id:5,category:"pet",emoji:"🧴",price:22.90}
  ];
  renderStores();
  renderProducts('todos');
}

function renderStores() {
  const container = document.getElementById("store-list");
  document.getElementById("stat-stores").textContent = stores.length;
  if (stores.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-emoji">🏪</div><h2>Nenhuma loja encontrada</h2><p>Tente novamente mais tarde.</p></div>`; return; }
  const sponsored = stores.filter(s => s.sponsored);
  const regular = stores.filter(s => !s.sponsored);
  container.innerHTML = [...sponsored, ...regular].map(store => `
    <div class="store-card ${store.sponsored ? 'sponsored' : ''}">
      ${store.sponsored ? '<div class="sponsored-badge">⭐ Patrocinado</div>' : ''}
      <button class="store-favorite ${favorites.includes(store.id) ? 'active' : ''}" onclick="toggleFavorite(${store.id})">${favorites.includes(store.id) ? '❤️' : '🤍'}</button>
      <div class="store-logo" style="background: ${store.color || '#0f8b64'}">${store.emoji || '🏪'}</div>
      <div class="store-info">
        <div class="store-top"><h3>${store.name}</h3><span>${store.category}</span></div>
        <p>${store.hours || 'Horário não informado'}</p>
        <small>${store.benefits || 'Sem benefícios cadastrados'}</small>
      </div>
      <div><button class="ghost-button" onclick="viewStoreProducts(${store.id})">Ver ofertas</button></div>
    </div>`).join("");
}

function renderProducts(category) {
  currentCategory = category;
  const container = document.getElementById("product-list");
  let filtered = category === 'todos' ? products : products.filter(p => p.category === category);
  if (filtered.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-emoji">🔍</div><h2>Nenhum produto encontrado</h2><p>Tente outra categoria ou busca.</p></div>`; return; }
  container.innerHTML = filtered.map(product => {
    const store = stores.find(s => s.id === product.store_id);
    const inCart = cart.some(item => item.id === product.id);
    return `<div class="product-card">
      <div class="product-emoji">${product.emoji || '📦'}</div>
      <div class="product-info"><h3>${product.name}</h3><p>${store ? store.name : 'Loja não encontrada'}</p></div>
      <div style="text-align: right;">
        <div class="product-card-price">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
        <button class="add-button ${inCart ? 'added' : ''}" onclick="toggleCart(${product.id})">${inCart ? '✓' : '+'}</button>
      </div>
    </div>`;
  }).join("");
}

function setupSearch() {
  document.getElementById("search-input").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) { renderProducts(currentCategory); return; }
    const filtered = products.filter(p => {
      const store = stores.find(s => s.id === p.store_id);
      return p.name.toLowerCase().includes(query) || (store && store.name.toLowerCase().includes(query));
    });
    const container = document.getElementById("product-list");
    if (filtered.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-emoji">🔍</div><h2>Nenhum resultado</h2><p>Tente buscar por outro termo.</p></div>`; return; }
    container.innerHTML = filtered.map(product => {
      const store = stores.find(s => s.id === product.store_id);
      const inCart = cart.some(item => item.id === product.id);
      return `<div class="product-card">
        <div class="product-emoji">${product.emoji || '📦'}</div>
        <div class="product-info"><h3>${product.name}</h3><p>${store ? store.name : 'Loja não encontrada'}</p></div>
        <div style="text-align: right;">
          <div class="product-card-price">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
          <button class="add-button ${inCart ? 'added' : ''}" onclick="toggleCart(${product.id})">${inCart ? '✓' : '+'}</button>
        </div>
      </div>`;
    }).join("");
  });
}

function filterCategory(category, btn) {
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
  renderProducts(category);
}

function viewStoreProducts(storeId) {
  const storeProducts = products.filter(p => p.store_id === storeId);
  if (storeProducts.length === 0) { toast('Esta loja ainda não tem produtos cadastrados'); return; }
  document.getElementById("product-list").innerHTML = storeProducts.map(product => {
    const inCart = cart.some(item => item.id === product.id);
    return `<div class="product-card">
      <div class="product-emoji">${product.emoji || '📦'}</div>
      <div class="product-info"><h3>${product.name}</h3><p>${product.category}</p></div>
      <div style="text-align: right;">
        <div class="product-card-price">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
        <button class="add-button ${inCart ? 'added' : ''}" onclick="toggleCart(${product.id})">${inCart ? '✓' : '+'}</button>
      </div>
    </div>`;
  }).join("");
  scrollToSection('products');
}

function toggleCart(productId) {
  const index = cart.findIndex(item => item.id === productId);
  const product = products.find(p => p.id === productId);
  if (index > -1) {
    cart.splice(index, 1);
    toast("Item removido da lista");
  } else if (product) {
    cart.push({ id: product.id, name: product.name, price: parseFloat(product.price), store_id: product.store_id, emoji: product.emoji });
    toast("✓ Item adicionado!");
    if (currentUser) {
      currentUser.cashback = (currentUser.cashback || 0) + 0.50;
      currentUser.balance = (currentUser.balance || 0) + 0.50;
      localStorage.setItem("pp_user", JSON.stringify(currentUser));
      updateWalletUI();
      updateProfileUI();
    }
  }
  localStorage.setItem("pp_cart", JSON.stringify(cart));
  updateCartUI();
  renderProducts(currentCategory);
  updateStats();
}

function updateCartUI() {
  const container = document.getElementById("cart-list");
  const summary = document.getElementById("basket-summary");
  document.getElementById("cart-total-items").textContent = cart.length;
  if (cart.length === 0) {
    summary.style.display = "none";
    container.innerHTML = `<div class="empty-state"><div class="empty-emoji">🛒</div><h2>Lista vazia</h2><p>Busque produtos abaixo e adicione-os para calcular a melhor compra.</p></div>`;
    return;
  }
  summary.style.display = "block";
  const storeTotals = {};
  cart.forEach(item => {
    const store = stores.find(s => s.id === item.store_id);
    if (!storeTotals[item.store_id]) storeTotals[item.store_id] = { total: 0, name: store ? store.name : 'Loja desconhecida', count: 0 };
    storeTotals[item.store_id].total += item.price;
    storeTotals[item.store_id].count += 1;
  });
  let bestStore = null, bestTotal = Infinity;
  Object.keys(storeTotals).forEach(storeId => {
    if (storeTotals[storeId].total < bestTotal) { bestTotal = storeTotals[storeId].total; bestStore = storeTotals[storeId]; }
  });
  if (bestStore) {
    document.getElementById("best-store-name").textContent = bestStore.name;
    document.getElementById("cart-total-value").textContent = `R$ ${bestTotal.toFixed(2).replace('.', ',')}`;
  }
  container.innerHTML = cart.map(item => {
    const store = stores.find(s => s.id === item.store_id);
    return `<div class="list-item">
      <div class="product-emoji">${item.emoji || '📦'}</div>
      <div><h3>${item.name}</h3><p>R$ ${item.price.toFixed(2).replace('.', ',')} · ${store ? store.name : '?'}</p></div>
      <button class="remove-button" onclick="toggleCart(${item.id})">✕</button>
    </div>`;
  }).join("");
}

function clearCart() {
  if (cart.length === 0) { toast("A lista já está vazia"); return; }
  if (confirm("Deseja limpar toda a lista?")) {
    cart = [];
    localStorage.setItem("pp_cart", JSON.stringify(cart));
    updateCartUI();
    renderProducts(currentCategory);
    updateStats();
    toast("Lista limpa");
  }
}

function toggleFavorite(storeId) {
  const index = favorites.indexOf(storeId);
  if (index > -1) { favorites.splice(index, 1); toast("Removido dos favoritos"); }
  else { favorites.push(storeId); toast("❤️ Adicionado aos favoritos!"); }
  localStorage.setItem("pp_favs", JSON.stringify(favorites));
  renderStores();
  updateStats();
}

function updateStats() {
  document.getElementById("stat-items").textContent = cart.length;
  document.getElementById("stat-favs").textContent = favorites.length;
  document.getElementById("stat-savings").textContent = `R$ ${(cart.length * 3.50).toFixed(2).replace('.', ',')}`;
}

function scrollToSection(id) {
  if (id === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  else { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth" }); }
}

function changeCity() {
  const cities = ["Porto Alegre, RS", "São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG", "Curitiba, PR", "Florianópolis, SC", "Brasília, DF", "Salvador, BA", "Recife, PE", "Fortaleza, CE"];
  const selected = prompt("Digite o número da cidade:\n\n" + cities.map((c, i) => `${i + 1}. ${c}`).join("\n") + "\n\nOu deixe em branco para Porto Alegre");
  if (selected === null) return;
  const index = parseInt(selected) - 1;
  currentCity = (index >= 0 && index < cities.length) ? cities[index] : (selected.trim() === "" ? "Porto Alegre, RS" : selected.trim());
  localStorage.setItem("pp_city", currentCity);
  document.getElementById("city-name").textContent = currentCity;
  toast(`📍 Cidade alterada para ${currentCity}`);
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}