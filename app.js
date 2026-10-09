/* =========================================================
   Preço Perto — app.js
   App de comparação de preços (PWA, sem build).
   - Consome as tabelas `stores` e `products` do Supabase (REST)
   - Funciona offline com o último dados salvo + dataset de demonstração
   - Todo dado vindo de rede/localStorage é escapado antes de virar HTML
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     Configuração
     A chave abaixo é a chave pública (publishable/anon) do Supabase.
     Ela é feita para ficar no cliente — o que protege os dados são as
     políticas de RLS configuradas no painel do Supabase.
     --------------------------------------------------------- */
  const CONFIG = {
    supabaseUrl: 'https://jfwlkzjgzghufuperhyz.supabase.co',
    supabaseKey: 'sb_publishable_-GvvuQDs3tTnSbw-QhQrdA_W93rvvzA',
    requestTimeout: 9000,
    cacheTTL: 5 * 60 * 1000,
    cashbackPerItem: 0.5,
    minWithdraw: 10,
    welcomeBonus: 25,
    avatarSize: 320
  };

  const KEY = {
    cart: 'pp_cart',
    favs: 'pp_favs',
    city: 'pp_city',
    user: 'pp_user',
    users: 'pp_users',
    tx: 'pp_transactions',
    theme: 'pp_theme',
    cache: 'pp_data_cache',
    apps: 'pp_applications'
  };

  const CITIES = [
    'Porto Alegre, RS', 'São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG',
    'Curitiba, PR', 'Florianópolis, SC', 'Brasília, DF', 'Salvador, BA',
    'Recife, PE', 'Fortaleza, CE'
  ];

  /* ---------------------------------------------------------
     Utilidades
     --------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtMoney = (value) => money.format(Number.isFinite(+value) ? +value : 0);

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  /** Escapa qualquer texto antes de inseri-lo via innerHTML (previne XSS). */
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

  const norm = (value) =>
    String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  /**
   * Prepara um valor para ser usado dentro de um atributo onclick="fn('<aqui>')".
   * Passa por encodeURIComponent (e escapa aspas simples) para que nenhum
   * caractere do dado possa "fechar" a string do JavaScript.
   */
  const jsKey = (value) => encodeURIComponent(String(value ?? '')).replace(/'/g, '%27');
  const jsVal = (value) => decodeURIComponent(String(value ?? ''));

  const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value || '').trim());

  const isValidPhone = (value) => {
    const d = onlyDigits(value);
    return d.length === 10 || d.length === 11;
  };

  const maskPhone = (value) => {
    let d = onlyDigits(value).slice(0, 11);
    if (d.length <= 2) return d;
    let out = `(${d.slice(0, 2)}) `;
    if (d.length <= 6) return out + d.slice(2);
    out += d.slice(2, d.length > 10 ? 7 : 6) + '-';
    return out + d.slice(d.length > 10 ? 7 : 6);
  };

  /** localStorage nunca deve derrubar o app: toda leitura/escrita é protegida. */
  const store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        console.warn(`[preco-perto] não foi possível ler "${key}"`, err);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.warn(`[preco-perto] não foi possível salvar "${key}"`, err);
        toast('Sem espaço no navegador para salvar seus dados.');
        return false;
      }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (err) { /* ignora */ }
    }
  };

  const debounce = (fn, wait = 220) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  };

  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  /** Hash de senha (demo): evita guardar a senha em texto puro no navegador. */
  async function hashPassword(plain) {
    try {
      if (globalThis.crypto?.subtle) {
        const data = new TextEncoder().encode(`preco-perto::${plain}`);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (err) {
      console.warn('[preco-perto] crypto indisponível, usando fallback de senha', err);
    }
    // Fallback para contextos não seguros (ex.: abrir o arquivo via file://)
    let h = 0;
    const str = `preco-perto::${plain}`;
    for (let i = 0; i < str.length; i += 1) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return `weak-${h}`;
  }

  /* ---------------------------------------------------------
     Estado
     --------------------------------------------------------- */
  const state = {
    stores: [],
    products: [],
    groups: [],
    groupIndex: new Map(),
    cart: [],
    favorites: [],
    transactions: [],
    user: null,
    city: 'Porto Alegre, RS',
    category: 'todos',
    sort: 'price-asc',
    query: '',
    expanded: new Set(),
    loading: false
  };

  const normalizeCart = (cart) =>
    (Array.isArray(cart) ? cart : []).map((item) => ({
      id: item.id,
      name: item.name || 'Produto',
      price: Number(item.price) || 0,
      storeId: item.storeId ?? item.store_id ?? null,
      emoji: item.emoji || '📦',
      qty: Math.max(1, parseInt(item.qty, 10) || 1)
    }));

  /* ---------------------------------------------------------
     Dados — Supabase com cache e fallback
     --------------------------------------------------------- */
  async function fetchTable(table) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
    try {
      const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: CONFIG.supabaseKey,
          Authorization: `Bearer ${CONFIG.supabaseKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } finally {
      clearTimeout(timer);
    }
  }

  function readCache() {
    const cached = store.get(KEY.cache, null);
    if (!cached || !Array.isArray(cached.stores) || !Array.isArray(cached.products)) return null;
    return cached;
  }

  function applyData({ stores, products }) {
    state.stores = stores;
    state.products = products;
    buildGroups();
    renderStores();
    renderProducts();
    renderCartHome();
    updateStats();
  }

  async function loadData({ silent = false } = {}) {
    const cached = readCache();
    if (cached) applyData(cached);

    state.loading = true;
    if (!cached) {
      $('#store-list').innerHTML = skeleton(3);
      $('#product-list').innerHTML = skeleton(4);
    }
    try {
      const [stores, products] = await Promise.all([fetchTable('stores'), fetchTable('products')]);
      if (stores.length === 0 && products.length === 0) throw new Error('tabelas vazias');
      store.set(KEY.cache, { ts: Date.now(), stores, products });
      applyData({ stores, products });
      if (!silent) toast(`${stores.length} lojas e ${products.length} ofertas atualizadas`);
    } catch (err) {
      console.warn('[preco-perto] usando dados locais:', err.message);
      if (!cached) {
        const demo = demoData();
        applyData(demo);
        toast('Mostrando catálogo de demonstração (sem conexão).');
      } else if (!silent) {
        toast('Sem conexão — mantendo os últimos preços salvos.');
      }
    } finally {
      state.loading = false;
      updateOfflineBanner();
    }
  }

  /** Catálogo usado quando o Supabase está inacessível (ou em modo demonstração). */
  function demoData() {
    const stores = [
      { id: 1, name: 'Carrefour', category: 'mercado', emoji: '🛒', color: '#005c9e', hours: '07h - 22h', benefits: 'Preço baixo todo dia', sponsored: true },
      { id: 2, name: 'Pão de Açúcar', category: 'mercado', emoji: '🥖', color: '#006636', hours: '07h - 23h', benefits: 'Qualidade e frescor', sponsored: true },
      { id: 3, name: 'Zaffari', category: 'mercado', emoji: '🏬', color: '#0f8b64', hours: '08h - 22h', benefits: 'Marca própria com desconto', sponsored: false },
      { id: 4, name: 'Drogasil', category: 'farmacia', emoji: '💊', color: '#003399', hours: '24 horas', benefits: 'Clube de descontos', sponsored: false },
      { id: 5, name: 'Panvel', category: 'farmacia', emoji: '🏥', color: '#e30613', hours: '08h - 22h', benefits: 'Genéricos com desconto', sponsored: false },
      { id: 6, name: 'São João', category: 'farmacia', emoji: '💉', color: '#7b1fa2', hours: '08h - 23h', benefits: 'Programa de pontos', sponsored: false },
      { id: 7, name: 'Petz', category: 'pet', emoji: '🐾', color: '#ff6600', hours: '09h - 21h', benefits: 'Banho e tosa com 10% OFF', sponsored: false },
      { id: 8, name: 'Cobasi', category: 'pet', emoji: '🐕', color: '#1565c0', hours: '09h - 21h', benefits: 'Clube pet com cashback', sponsored: false }
    ];

    const rows = [
      ['Arroz Branco 5kg', 'mercado', '🍚', [[1, 24.9], [2, 27.5], [3, 26.49]]],
      ['Feijão Carioca 1kg', 'mercado', '🫘', [[1, 7.49], [2, 8.29], [3, 6.99]]],
      ['Leite Integral 1L', 'mercado', '🥛', [[1, 4.79], [2, 5.29], [3, 4.99]]],
      ['Café Torrado 500g', 'mercado', '☕', [[1, 18.9], [2, 21.9], [3, 17.49]]],
      ['Óleo de Soja 900ml', 'mercado', '🫗', [[1, 5.49], [2, 6.29], [3, 5.99]]],
      ['Azeite Extravirgem 500ml', 'mercado', '🫒', [[1, 27.9], [2, 29.9]]],
      ['Dipirona 500mg 10cp', 'farmacia', '💊', [[4, 4.99], [5, 3.89], [6, 4.29]]],
      ['Paracetamol 750mg 20cp', 'farmacia', '💉', [[4, 9.9], [5, 8.49], [6, 8.99]]],
      ['Vitamina C 1g 10cp', 'farmacia', '🍊', [[4, 12.9], [6, 11.49]]],
      ['Protetor Solar FPS 60', 'farmacia', '🧴', [[4, 59.9], [5, 54.9], [6, 62.9]]],
      ['Ração Cão Adulto 15kg', 'pet', '🐕', [[7, 149.9], [8, 139.9]]],
      ['Shampoo Pet 500ml', 'pet', '🧴', [[7, 22.9], [8, 19.9]]],
      ['Areia Higiênica 4kg', 'pet', '🐈', [[7, 24.9], [8, 21.9]]]
    ];

    const products = [];
    let id = 1;
    rows.forEach(([name, category, emoji, offers]) => {
      offers.forEach(([storeId, price]) => {
        products.push({ id: id++, name, category, emoji, store_id: storeId, price });
      });
    });

    return { stores, products };
  }

  /* ---------------------------------------------------------
     Produtos agrupados + análise da cesta
     --------------------------------------------------------- */
  /** Agrupa as ofertas pelo nome do produto e guarda um índice para consulta rápida. */
  function buildGroups() {
    state.groups = groupOffers(state.products);
    state.groupIndex = new Map(state.groups.map((g) => [g.key, g]));
  }

  function groupProducts() {
    return state.groups;
  }

  function groupOffers(list) {
    const map = new Map();
    (list || []).forEach((p) => {
      const key = norm(p.name);
      const price = Number(p.price) || 0;
      if (!map.has(key)) {
        map.set(key, { key, name: p.name, category: p.category, emoji: p.emoji || '📦', offers: [] });
      }
      map.get(key).offers.push({
        id: p.id,
        price,
        storeId: p.store_id ?? p.storeId ?? null,
        category: p.category,
        emoji: p.emoji || '📦'
      });
    });

    return [...map.values()].map((group) => {
      const prices = group.offers.map((o) => o.price).sort((a, b) => a - b);
      group.offers.sort((a, b) => a.price - b.price);
      group.best = group.offers[0];
      group.worst = group.offers[group.offers.length - 1];
      group.min = prices[0];
      group.max = prices[prices.length - 1];
      group.avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      return group;
    });
  }

  const storeById = (id) => state.stores.find((s) => String(s.id) === String(id));
  const offersFor = (name) => state.groupIndex.get(norm(name))?.offers || [];
  const isFavorite = (id) => state.favorites.some((f) => String(f) === String(id));

  /**
   * Calcula quanto a cesta inteira custa em cada loja.
   * Itens indisponíveis numa loja entram pelo menor preço encontrado
   * (e a loja é marcada como "compra incompleta").
   */
  function analyzeBasket() {
    if (state.cart.length === 0 || state.stores.length === 0) {
      return { rows: [], best: null, savings: 0, avg: 0 };
    }

    const rows = state.stores.map((store) => {
      let total = 0;
      let missing = 0;
      state.cart.forEach((item) => {
        const offers = offersFor(item.name);
        const inStore = offers.find((o) => String(o.storeId) === String(store.id));
        if (inStore) {
          total += inStore.price * item.qty;
        } else {
          const fallback = offers.length ? offers[0].price : item.price;
          if (!offers.some((o) => String(o.storeId) === String(store.id))) missing += 1;
          total += fallback * item.qty;
        }
      });
      return { storeId: store.id, name: store.name, emoji: store.emoji || '🏪', total, missing };
    });

    const complete = rows.filter((r) => r.missing === 0);
    const pool = complete.length ? complete : rows;
    const sorted = [...pool].sort((a, b) => a.total - b.total);
    const best = sorted[0];
    const avg = pool.reduce((sum, r) => sum + r.total, 0) / pool.length;
    const savings = best ? Math.max(0, avg - best.total) : 0;

    return { rows: sorted, best, savings, avg, completeOnly: complete.length > 0 };
  }

  /* ---------------------------------------------------------
     Renderização
     --------------------------------------------------------- */
  function skeleton(count) {
    return `<div class="skeleton">${Array.from({ length: count }).map(() => `
      <div class="skeleton-row">
        <div class="skeleton-box skeleton-avatar"></div>
        <div class="skeleton-box" style="width:70%"></div>
        <div class="skeleton-box" style="width:48px"></div>
      </div>`).join('')}</div>`;
  }

  function emptyState(emoji, title, text, action = '') {
    return `<div class="empty-state">
      <div class="empty-emoji" aria-hidden="true">${esc(emoji)}</div>
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      ${action}
    </div>`;
  }

  function renderStores() {
    const container = $('#store-list');
    if (!container) return;
    $('#stat-stores').textContent = state.stores.length;

    if (state.stores.length === 0) {
      container.innerHTML = emptyState('🏪', 'Nenhuma loja encontrada', 'Tente novamente em alguns instantes.');
      return;
    }

    const ordered = [...state.stores].sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
    container.innerHTML = ordered.map((store) => {
      const fav = isFavorite(store.id);
      const name = esc(store.name);
      return `<article class="store-card ${store.sponsored ? 'sponsored' : ''}">
        ${store.sponsored ? '<div class="sponsored-badge">⭐ Patrocinado</div>' : ''}
        <button type="button" class="store-favorite ${fav ? 'active' : ''}"
          onclick="toggleFavorite('${jsKey(store.id)}')"
          aria-pressed="${fav}"
          aria-label="${fav ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}">${fav ? '❤️' : '🤍'}</button>
        <div class="store-logo" style="background:${esc(store.color || '#0f8b64')}" aria-hidden="true">${esc(store.emoji || '🏪')}</div>
        <div class="store-info">
          <div class="store-top">
            <h3>${name}</h3>
            <span>${esc(store.category || 'geral')}</span>
          </div>
          <p>${esc(store.hours || 'Horário não informado')}</p>
          <small>${esc(store.benefits || 'Sem benefícios cadastrados')}</small>
        </div>
        <div><button type="button" class="ghost-button" onclick="viewStoreProducts('${jsKey(store.id)}')">Ver ofertas</button></div>
      </article>`;
    }).join('');
  }

  function visibleGroups() {
    const query = norm(state.query);
    let groups = groupProducts().filter((g) => state.category === 'todos' || g.category === state.category);

    if (query) {
      groups = groups.filter((g) => {
        const stores = g.offers.map((o) => storeById(o.storeId)?.name || '');
        return norm(g.name).includes(query) || stores.some((s) => norm(s).includes(query));
      });
    }

    const sorters = {
      'price-asc': (a, b) => a.min - b.min,
      'price-desc': (a, b) => b.min - a.min,
      offers: (a, b) => b.offers.length - a.offers.length,
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR')
    };
    return groups.sort(sorters[state.sort] || sorters['price-asc']);
  }

  function productCard(group) {
    const bestStore = storeById(group.best.storeId);
    const inCart = state.cart.some((i) => String(i.id) === String(group.best.id));
    const open = state.expanded.has(group.key);
    const hasMultiple = group.offers.length > 1;
    const diff = group.max - group.min;

    const offersHtml = hasMultiple ? `
      <button type="button" class="offer-toggle" onclick="toggleOffers('${jsKey(group.key)}')" aria-expanded="${open}">
        ${open ? 'Ocultar' : 'Comparar'} ${group.offers.length} lojas
        <span aria-hidden="true">${open ? '▲' : '▼'}</span>
      </button>
      ${open ? `<div class="offer-list">${group.offers.map((offer) => {
        const st = storeById(offer.storeId);
        const added = state.cart.some((i) => String(i.id) === String(offer.id));
        return `<div class="offer-row ${offer.price === group.min ? 'cheapest' : ''}">
          <span class="offer-store">${esc(st ? st.name : 'Loja')} ${offer.price === group.min ? '<span class="best-price-badge">menor preço</span>' : ''}</span>
          <span class="offer-price">${fmtMoney(offer.price)}</span>
          <button type="button" class="add-button ${added ? 'added' : ''}" onclick="toggleCart('${jsKey(offer.id)}')"
            aria-label="${added ? 'Remover' : 'Adicionar'} ${esc(group.name)} de ${esc(st ? st.name : 'loja')}">${added ? '✓' : '+'}</button>
        </div>`;
      }).join('')}</div>` : ''}
    ` : '';

    return `<article class="product-card ${hasMultiple && diff > 0 ? 'is-best' : ''}">
      <div class="product-card-main">
        <div class="product-emoji" aria-hidden="true">${esc(group.emoji)}</div>
        <div class="product-info">
          <h3>${esc(group.name)}</h3>
          <p>${esc(bestStore ? bestStore.name : 'Loja não encontrada')}${hasMultiple ? ` · ${group.offers.length} lojas` : ''}</p>
          ${hasMultiple ? `<span class="best-price-badge">Melhor preço</span>` : ''}
        </div>
        <div class="product-price-col">
          <span class="product-card-price">${fmtMoney(group.min)}</span>
          ${hasMultiple && diff > 0 ? `<span class="price-diff good">até ${fmtMoney(diff)} mais barato</span>` : ''}
          <button type="button" class="add-button ${inCart ? 'added' : ''}" onclick="toggleCart('${jsKey(group.best.id)}')"
            aria-label="${inCart ? 'Remover' : 'Adicionar'} ${esc(group.name)} à lista">${inCart ? '✓' : '+'}</button>
        </div>
      </div>
      ${offersHtml}
    </article>`;
  }

  function renderProducts() {
    const container = $('#product-list');
    if (!container) return;
    const groups = visibleGroups();
    const count = $('#result-count');
    if (count) {
      const offers = groups.reduce((sum, g) => sum + g.offers.length, 0);
      count.textContent = `${groups.length} ${groups.length === 1 ? 'produto' : 'produtos'} · ${offers} ${offers === 1 ? 'oferta' : 'ofertas'}`;
    }

    if (groups.length === 0) {
      container.innerHTML = state.query
        ? emptyState('🔍', 'Nenhum resultado', `Não encontramos nada para "${state.query}".`, '<button type="button" class="ghost-button" onclick="clearSearch()">Limpar busca</button>')
        : emptyState('📦', 'Nenhum produto encontrado', 'Tente outra categoria ou atualize os preços.');
      return;
    }

    container.innerHTML = groups.map(productCard).join('');
  }

  function renderCartHome() {
    const container = $('#cart-list');
    if (!container) return;
    const analysis = analyzeBasket();
    updateBasketSummary(analysis);

    if (state.cart.length === 0) {
      container.innerHTML = emptyState('🛒', 'Lista vazia', 'Busque produtos abaixo e adicione-os para calcular a melhor compra.');
      return;
    }

    container.innerHTML = state.cart.map((item) => {
      const st = storeById(item.storeId);
      return `<div class="list-item">
        <div class="product-emoji" aria-hidden="true">${esc(item.emoji)}</div>
        <div>
          <h3>${esc(item.name)}</h3>
          <p>${fmtMoney(item.price * item.qty)} · ${esc(st ? st.name : 'Loja')}</p>
        </div>
        <div class="item-actions">
          <span class="qty-stepper">
            <button type="button" onclick="changeQty('${jsKey(item.id)}', -1)" aria-label="Diminuir quantidade de ${esc(item.name)}">−</button>
            <span class="qty-value" aria-label="Quantidade">${item.qty}</span>
            <button type="button" onclick="changeQty('${jsKey(item.id)}', 1)" aria-label="Aumentar quantidade de ${esc(item.name)}">+</button>
          </span>
          <button type="button" class="remove-button" onclick="toggleCart('${jsKey(item.id)}')" aria-label="Remover ${esc(item.name)} da lista">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  function renderCartFull() {
    const container = $('#cart-full-content');
    if (!container) return;
    const analysis = analyzeBasket();

    if (state.cart.length === 0) {
      container.innerHTML = emptyState('🛒', 'Sua lista está vazia', 'Adicione produtos para comparar o preço da cesta inteira.', '<button type="button" class="primary-button wide-button" onclick="showPage(\'home\');scrollToSection(\'products\')">Ver produtos</button>');
      return;
    }

    const summary = analysis.best ? `
      <div class="basket-summary">
        <small>Melhor compra estimada em:</small>
        <strong>${esc(analysis.best.name)}</strong>
        <div><span>Itens na lista:</span><b>${state.cart.reduce((s, i) => s + i.qty, 0)}</b></div>
        <div><span>Total estimado:</span><b>${fmtMoney(analysis.best.total)}</b></div>
        <div><span>Economia vs. média das lojas:</span><b>${fmtMoney(analysis.savings)}</b></div>
        ${analysis.best.missing ? `<div><span>Itens faltando nessa loja:</span><b>${analysis.best.missing}</b></div>` : ''}
      </div>` : '';

    const comparison = analysis.rows.length ? `
      <h3 class="section-subtitle">Preço da cesta em cada loja</h3>
      <div class="comparison-table">${analysis.rows.map((row, index) => `
        <div class="comparison-row ${index === 0 ? 'best' : ''}">
          <span>${esc(row.emoji)} ${esc(row.name)}
            <span class="comparison-note">${row.missing ? `${row.missing} ${row.missing === 1 ? 'item' : 'itens'} indisponível(eis) — preço estimado` : 'todos os itens disponíveis'}</span>
          </span>
          <strong>${fmtMoney(row.total)}</strong>
        </div>`).join('')}
      </div>` : '';

    container.innerHTML = `
      ${summary}
      <div class="product-list" style="margin-top:18px">${state.cart.map((item) => {
        const st = storeById(item.storeId);
        return `<div class="list-item">
          <div class="product-emoji" aria-hidden="true">${esc(item.emoji)}</div>
          <div>
            <h3>${esc(item.name)}</h3>
            <p>${fmtMoney(item.price)} cada · ${esc(st ? st.name : 'Loja')}</p>
          </div>
          <div class="item-actions">
            <span class="qty-stepper">
              <button type="button" onclick="changeQty('${jsKey(item.id)}', -1)" aria-label="Diminuir quantidade de ${esc(item.name)}">−</button>
              <span class="qty-value">${item.qty}</span>
              <button type="button" onclick="changeQty('${jsKey(item.id)}', 1)" aria-label="Aumentar quantidade de ${esc(item.name)}">+</button>
            </span>
            <button type="button" class="remove-button" onclick="toggleCart('${jsKey(item.id)}')" aria-label="Remover ${esc(item.name)} da lista">✕</button>
          </div>
        </div>`;
      }).join('')}</div>
      ${comparison}`;
  }

  function updateBasketSummary(analysis) {
    const summary = $('#basket-summary');
    if (!summary) return;
    if (state.cart.length === 0 || !analysis.best) {
      summary.hidden = true;
      return;
    }
    summary.hidden = false;
    $('#best-store-name').textContent = analysis.best.name;
    $('#cart-total-items').textContent = state.cart.reduce((s, i) => s + i.qty, 0);
    $('#cart-total-value').textContent = fmtMoney(analysis.best.total);
    $('#cart-savings-value').textContent = fmtMoney(analysis.savings);
  }

  function updateStats() {
    const analysis = analyzeBasket();
    $('#stat-savings').textContent = fmtMoney(analysis.savings);
    $('#stat-items').textContent = state.cart.reduce((s, i) => s + i.qty, 0);
    $('#stat-favs').textContent = state.favorites.length;
    $('#stat-stores').textContent = state.stores.length;

    if (state.user) {
      state.user.savings = analysis.savings;
      persistUser();
    }
  }

  /* ---------------------------------------------------------
     Perfil, carteira e transações
     --------------------------------------------------------- */
  function persistUser() {
    store.set(KEY.user, state.user);
    const users = store.get(KEY.users, []) || [];
    const index = users.findIndex((u) => u.id === state.user?.id);
    if (index > -1) users[index] = state.user;
    store.set(KEY.users, users);
  }

  function updateProfileUI() {
    if (!state.user) return;
    $('#profile-display-name').textContent = state.user.name;
    $('#profile-display-email').textContent = state.user.email;
    $('#profile-name').value = state.user.name || '';
    $('#profile-email').value = state.user.email || '';
    $('#profile-phone').value = state.user.phone || '';
    $('#profile-city').value = state.user.city || state.city;
    $('#profile-pix').value = state.user.pix || '';

    const avatar = $('#profile-avatar');
    avatar.innerHTML = state.user.avatar
      ? `<img src="${esc(state.user.avatar)}" alt="Foto de perfil de ${esc(state.user.name)}">`
      : '👤';

    $('#profile-missions').textContent = state.user.missions || 0;
    $('#profile-cashback').textContent = fmtMoney(state.user.cashback || 0);
    $('#profile-savings').textContent = fmtMoney(analysisForProfile());
  }

  function analysisForProfile() {
    const analysis = analyzeBasket();
    return analysis.savings || 0;
  }

  function renderTransactions() {
    const list = $('#transaction-list');
    if (!list) return;

    if (state.transactions.length === 0) {
      list.innerHTML = emptyState('💰', 'Nenhuma transação ainda', 'Complete missões e adicione itens à lista para começar a ganhar.');
      return;
    }

    const icons = { cashback: '💰', mission: '✅', withdraw: '💸', bonus: '🎁' };
    list.innerHTML = state.transactions.slice(0, 30).map((t) => {
      const negative = t.amount < 0;
      return `<div class="transaction-item">
        <div class="transaction-icon" aria-hidden="true">${icons[t.type] || '💰'}</div>
        <div class="transaction-info">
          <strong>${esc(t.description)}
            ${t.status ? `<span class="status-badge ${t.status}">${t.status === 'pending' ? 'em análise' : 'concluído'}</span>` : ''}
          </strong>
          <small>${new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</small>
        </div>
        <div class="transaction-amount ${negative ? 'negative' : ''}">${negative ? '−' : '+'} ${fmtMoney(Math.abs(t.amount))}</div>
      </div>`;
    }).join('');
  }

  function updateWalletUI() {
    if (!state.user) return;
    $('#wallet-balance').textContent = fmtMoney(state.user.balance || 0);
    $('#wallet-missions').textContent = state.user.missions || 0;
    $('#wallet-cashback').textContent = fmtMoney(state.user.cashback || 0);
    $('#wallet-bonus').textContent = fmtMoney(state.user.bonus || 0);
    renderTransactions();
  }

  function addTransaction(type, description, amount, status = 'done') {
    state.transactions.unshift({ id: uid(), type, description, amount, status, date: new Date().toISOString() });
    state.transactions = state.transactions.slice(0, 100);
    store.set(KEY.tx, state.transactions);
  }

  /* ---------------------------------------------------------
     Navegação
     --------------------------------------------------------- */
  const PAGES = ['home', 'login', 'profile', 'wallet', 'work', 'cart'];

  function showPage(page, opts = {}) {
    if (!PAGES.includes(page)) page = 'home';
    if (page !== 'login' && !state.user) page = 'login';

    $$('.page').forEach((p) => { p.hidden = p.id !== `page-${page}`; });
    const nav = $('#bottom-nav');
    if (nav) nav.hidden = page === 'login';

    $$('.nav-button').forEach((btn) => {
      const active = btn.dataset.page === page;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-current', active ? 'page' : 'false');
    });

    if (page === 'cart') renderCartFull();
    if (page === 'wallet') updateWalletUI();
    if (page === 'profile') updateProfileUI();

    const current = $(`#page-${page}`);
    if (current) {
      current.focus?.({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }

    if (!opts.silent) {
      const hash = page === 'home' ? '#/' : `#/${page}`;
      if (location.hash !== hash) {
        try { history.pushState({ page }, '', hash); } catch (err) { /* file:// */ }
      }
    }
    document.title = page === 'home'
      ? 'Preço Perto — Compare preços e ganhe cashback'
      : `${{ login: 'Entrar', profile: 'Meu Perfil', wallet: 'Minha Carteira', work: 'Trabalhe Conosco', cart: 'Lista de Compras' }[page] || 'Preço Perto'} · Preço Perto`;
  }

  function scrollToSection(id) {
    if (state.currentPage !== 'home') showPage('home');
    requestAnimationFrame(() => {
      const el = id === 'top' ? document.body : document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    });
  }

  Object.defineProperty(state, 'currentPage', {
    get() {
      const visible = $$('.page').find((p) => !p.hidden);
      return visible ? visible.id.replace('page-', '') : 'home';
    }
  });

  /* ---------------------------------------------------------
     Toast (fila, para não perder mensagens em sequência)
     --------------------------------------------------------- */
  const toastQueue = [];
  let toastBusy = false;

  function toast(message, opts = {}) {
    toastQueue.push({ message, ...opts });
    if (!toastBusy) runToastQueue();
  }

  function runToastQueue() {
    const next = toastQueue.shift();
    if (!next) { toastBusy = false; return; }
    toastBusy = true;
    showToast(next);
  }

  function showToast({ message, duration = 2600, actionLabel, onAction }) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    el.style.pointerEvents = 'none';

    if (actionLabel) {
      el.style.pointerEvents = 'auto';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'link-button';
      btn.style.cssText = 'margin-left:10px;color:#91ecc6;text-decoration:underline';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => {
        hideToast(el);
        onAction?.();
      });
      el.appendChild(btn);
    }

    setTimeout(() => {
      hideToast(el);
      setTimeout(runToastQueue, 260);
    }, duration);
  }

  function hideToast(el) {
    el.classList.remove('show');
  }

  /* ---------------------------------------------------------
     Modal genérico (acessível: foco preso, Esc fecha, foco restaurado)
     --------------------------------------------------------- */
  let lastFocused = null;

  function openModal({ title, body, actions = '', onOpen }) {
    const overlay = $('#modal');
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = `${body}${actions ? `<div class="modal-actions">${actions}</div>` : ''}`;
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    const focusable = $('#modal-sheet').querySelector('button, [href], input, select, textarea');
    (focusable || $('.modal-close')).focus();

    onOpen?.();
  }

  function closeModal() {
    const overlay = $('#modal');
    if (overlay.hidden) return;
    overlay.hidden = true;
    $('#modal-body').innerHTML = '';
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  }

  function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, onConfirm }) {
    openModal({
      title,
      body: `<p class="modal-body-text">${esc(message)}</p>`,
      actions: `
        <button type="button" class="secondary-button" onclick="closeModal()">${esc(cancelLabel)}</button>
        <button type="button" class="${danger ? 'danger-button' : 'primary-button'}" id="modal-confirm">${esc(confirmLabel)}</button>`,
      onOpen: () => {
        $('#modal-confirm').addEventListener('click', () => {
          closeModal();
          onConfirm?.();
        });
      }
    });
  }

  /* ---------------------------------------------------------
     Ações do catálogo
     --------------------------------------------------------- */
  function toggleCart(productId) {
    const id = jsVal(productId);
    const index = state.cart.findIndex((i) => String(i.id) === id);
    const product = state.products.find((p) => String(p.id) === id);

    if (index > -1) {
      state.cart.splice(index, 1);
      removeCashback();
      toast('Item removido da lista');
    } else if (product) {
      state.cart.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        storeId: product.store_id ?? product.storeId ?? null,
        emoji: product.emoji || '📦',
        qty: 1
      });
      addCashback();
      toast(`✓ ${product.name} adicionado!`);
    } else {
      toast('Produto não encontrado');
      return;
    }

    persistCart();
    renderCartHome();
    if (!$('#page-cart').hidden) renderCartFull();
    renderProducts();
    updateStats();
  }

  function addCashback() {
    if (!state.user) return;
    state.user.cashback = (state.user.cashback || 0) + CONFIG.cashbackPerItem;
    state.user.balance = (state.user.balance || 0) + CONFIG.cashbackPerItem;
    persistUser();
    updateWalletUI();
    updateProfileUI();
  }

  function removeCashback() {
    if (!state.user) return;
    state.user.cashback = Math.max(0, (state.user.cashback || 0) - CONFIG.cashbackPerItem);
    state.user.balance = Math.max(0, (state.user.balance || 0) - CONFIG.cashbackPerItem);
    persistUser();
    updateWalletUI();
    updateProfileUI();
  }

  function changeQty(productId, delta) {
    const id = jsVal(productId);
    const item = state.cart.find((i) => String(i.id) === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      state.cart = state.cart.filter((i) => String(i.id) !== id);
      removeCashback();
      persistCart();
      renderCartHome();
      if (!$('#page-cart').hidden) renderCartFull();
      renderProducts();
      updateStats();
      toast('Item removido da lista');
      return;
    }
    persistCart();
    renderCartHome();
    if (!$('#page-cart').hidden) renderCartFull();
    updateStats();
  }

  function persistCart() {
    store.set(KEY.cart, state.cart);
  }

  function clearCart() {
    if (state.cart.length === 0) { toast('A lista já está vazia'); return; }
    confirmDialog({
      title: 'Limpar a lista?',
      message: 'Todos os itens serão removidos e o cashback devolvido.',
      confirmLabel: 'Limpar',
      danger: true,
      onConfirm: () => {
        state.cart.forEach(() => removeCashback());
        state.cart = [];
        persistCart();
        renderCartHome();
        renderCartFull();
        renderProducts();
        updateStats();
        toast('Lista limpa');
      }
    });
  }

  function toggleFavorite(storeId) {
    const id = String(jsVal(storeId));
    state.favorites = state.favorites.map(String);
    const index = state.favorites.indexOf(id);
    if (index > -1) {
      state.favorites.splice(index, 1);
      toast('Removido dos favoritos');
    } else {
      state.favorites.push(id);
      toast('❤️ Adicionado aos favoritos!');
    }
    store.set(KEY.favs, state.favorites);
    renderStores();
    updateStats();
  }

  function toggleOffers(rawKey) {
    const key = jsVal(rawKey);
    if (state.expanded.has(key)) state.expanded.delete(key);
    else state.expanded.add(key);
    renderProducts();
  }

  function filterCategory(category, btn) {
    state.category = category;
    $$('#category-chips .chip').forEach((c) => {
      const active = c === btn || c.dataset.category === category;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
  }

  function changeSort(value) {
    state.sort = value;
    renderProducts();
  }

  function clearSearch() {
    state.query = '';
    const input = $('#search-input');
    if (input) input.value = '';
    renderProducts();
  }

  function viewStoreProducts(storeId) {
    const store = storeById(jsVal(storeId));
    if (!store) return;
    state.query = store.name;
    state.category = 'todos';
    const input = $('#search-input');
    if (input) input.value = store.name;
    $$('#category-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.category === 'todos'));
    if (state.currentPage !== 'home') showPage('home');
    renderProducts();
    scrollToSection('products');
  }

  /* ---------------------------------------------------------
     Cidade
     --------------------------------------------------------- */
  function openCityPicker() {
    const options = [...new Set([...CITIES, state.city])];
    openModal({
      title: 'Escolha sua cidade',
      body: `
        <p class="modal-body-text">Os preços e as lojas parceiras mudam de acordo com a sua região.</p>
        <div class="city-options">${options.map((city) => `
          <button type="button" class="city-option" data-city="${esc(city)}" aria-pressed="${city === state.city}">
            <span>${esc(city)}</span>
            ${city === state.city ? '<span aria-hidden="true">✓</span>' : ''}
          </button>`).join('')}
        </div>
        <div class="form-group" style="margin-top:14px">
          <label for="city-other">Outra cidade</label>
          <input type="text" id="city-other" placeholder="Digite cidade e UF">
        </div>`,
      actions: `<button type="button" class="primary-button" id="city-save">Salvar cidade</button>`,
      onOpen: () => {
        $$('#modal .city-option').forEach((btn) => {
          btn.addEventListener('click', () => setCity(btn.dataset.city));
        });
        $('#city-save').addEventListener('click', () => {
          const value = $('#city-other').value.trim();
          if (value) setCity(value);
          else closeModal();
        });
      }
    });
  }

  function setCity(city) {
    state.city = city;
    store.set(KEY.city, city);
    $('#city-name').textContent = city;
    if (state.user) {
      state.user.city = city;
      persistUser();
      updateProfileUI();
    }
    closeModal();
    toast(`📍 Cidade alterada para ${city}`);
  }

  /* ---------------------------------------------------------
     Comparação de cestas / informações
     --------------------------------------------------------- */
  function openBasketComparison() {
    const analysis = analyzeBasket();
    if (!analysis.rows.length) { toast('Adicione itens à lista primeiro'); return; }
    openModal({
      title: 'Preço da cesta por loja',
      body: `
        <p class="modal-body-text">Somamos todos os itens da sua lista em cada loja. Quando um item não existe no catálogo da loja, usamos o menor preço encontrado e marcamos a linha.</p>
        <div class="comparison-table">${analysis.rows.map((row, index) => `
          <div class="comparison-row ${index === 0 ? 'best' : ''}">
            <span>${esc(row.emoji)} ${esc(row.name)}
              <span class="comparison-note">${row.missing ? `${row.missing} ${row.missing === 1 ? 'item' : 'itens'} indisponível(eis)` : 'todos os itens disponíveis'}</span>
            </span>
            <strong>${fmtMoney(row.total)}</strong>
          </div>`).join('')}
        </div>
        <p class="modal-body-text" style="margin-top:14px">Comparado com a média das lojas, comprar na <strong>${esc(analysis.best.name)}</strong> economiza cerca de <strong>${fmtMoney(analysis.savings)}</strong>.</p>`
    });
  }

  const INFO = {
    sobre: {
      title: 'Sobre o Preço Perto',
      body: `<p class="modal-body-text">O Preço Perto compara preços de supermercados, farmácias e pet shops da sua região e mostra em qual loja a sua cesta de compras inteira sai mais barata.</p>
        <h3>Como funciona</h3>
        <p class="modal-body-text">1. Monte sua lista de compras.<br>2. A gente soma o preço de todos os itens em cada loja parceira.<br>3. Você vê onde vale mais a pena comprar — e quanto economiza.</p>
        <h3>Versão</h3>
        <p class="modal-body-text">Versão 4.0 · Dados atualizados automaticamente quando há conexão.</p>`
    },
    privacidade: {
      title: 'Política de Privacidade',
      body: `<p class="modal-body-text">Seus dados ficam no seu próprio navegador (localStorage). Nenhuma informação pessoal é enviada para servidores do Preço Perto.</p>
        <h3>O que guardamos</h3>
        <p class="modal-body-text">Nome, e-mail, telefone, cidade, lista de compras, favoritos e histórico de transações — tudo local, no seu dispositivo. A senha é armazenada como hash, nunca em texto puro.</p>
        <h3>Seus direitos (LGPD)</h3>
        <p class="modal-body-text">Você pode apagar todos os seus dados a qualquer momento em Perfil → Sair da conta, ou limpando os dados do site no navegador.</p>`
    },
    termos: {
      title: 'Termos de Uso',
      body: `<p class="modal-body-text">Os preços exibidos são informados pelos parceiros e podem variar. Confira sempre o valor na gondola antes de finalizar a compra.</p>
        <h3>Cashback e saques</h3>
        <p class="modal-body-text">O cashback é creditado por item adicionado à lista e pode ser sacado a partir de R$ ${CONFIG.minWithdraw.toFixed(2).replace('.', ',')} via Pix, em até 2 dias úteis.</p>
        <h3>Missões</h3>
        <p class="modal-body-text">As candidaturas a vagas de trabalho são analisadas pela equipe; o bônus de boas-vindas é pago uma única vez por conta.</p>`
    }
  };

  function openInfo(key) {
    const info = INFO[key];
    if (!info) return;
    openModal({ title: info.title, body: info.body });
  }

  /* ---------------------------------------------------------
     Carteira
     --------------------------------------------------------- */
  function openWithdraw() {
    if (!state.user) return;
    const balance = state.user.balance || 0;
    if (balance < CONFIG.minWithdraw) {
      toast(`Saldo mínimo para saque: ${fmtMoney(CONFIG.minWithdraw)}`);
      return;
    }
    openModal({
      title: 'Sacar via Pix',
      body: `
        <p class="modal-body-text">Você vai sacar <strong>${fmtMoney(balance)}</strong>. Confira a chave Pix — ela precisa estar no seu nome.</p>
        <div class="form-group" style="margin-top:14px">
          <label for="pix-key">Chave Pix</label>
          <input type="text" id="pix-key" placeholder="E-mail, telefone, CPF, CNPJ ou chave aleatória" value="${esc(state.user.pix || '')}">
          <small class="hint" id="pix-hint">Aceitamos e-mail, telefone, CPF, CNPJ ou chave aleatória.</small>
        </div>`,
      actions: `
        <button type="button" class="secondary-button" onclick="closeModal()">Cancelar</button>
        <button type="button" class="primary-button" id="pix-confirm">Confirmar saque</button>`,
      onOpen: () => {
        $('#pix-confirm').addEventListener('click', () => {
          const key = $('#pix-key').value.trim();
          const hint = $('#pix-hint');
          if (!isValidPixKey(key)) {
            hint.textContent = 'Chave Pix inválida. Confira o valor digitado.';
            hint.style.color = 'var(--danger)';
            $('#pix-key').setAttribute('aria-invalid', 'true');
            $('#pix-key').focus();
            return;
          }
          doWithdraw(balance, key);
        });
      }
    });
  }

  function isValidPixKey(key) {
    const value = String(key || '').trim();
    if (value.length < 3) return false;
    if (isValidEmail(value)) return true;
    if (isValidPhone(value)) return true;
    if (/^\d{11}$/.test(onlyDigits(value))) return true; // CPF
    if (/^\d{14}$/.test(onlyDigits(value))) return true; // CNPJ
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); // chave aleatória
  }

  function doWithdraw(amount, pixKey) {
    state.user.balance = 0;
    state.user.pix = pixKey;
    persistUser();
    addTransaction('withdraw', `Saque via Pix · ${pixKey}`, -amount, 'pending');
    updateWalletUI();
    updateProfileUI();
    closeModal();
    toast(`Saque de ${fmtMoney(amount)} solicitado!`);
  }

  /* ---------------------------------------------------------
     Trabalhe conosco
     --------------------------------------------------------- */
  const WORK_TYPES = {
    digital: 'Avaliador Digital (Remoto)',
    store: 'Consultor de Loja (Híbrido)',
    mapper: 'Mapeador Urbano (Em Movimento)'
  };

  function applyForWork(type) {
    if (!state.user) { toast('Entre na sua conta para se candidatar'); showPage('login'); return; }
    const title = WORK_TYPES[type] || 'Candidatar-se';
    openModal({
      title,
      body: `
        <form id="work-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="work-name">Nome completo</label>
            <input type="text" id="work-name" value="${esc(state.user.name || '')}" required minlength="3">
          </div>
          <div class="form-group">
            <label for="work-email">E-mail</label>
            <input type="email" id="work-email" value="${esc(state.user.email || '')}" required>
          </div>
          <div class="form-group">
            <label for="work-phone">Telefone</label>
            <input type="tel" id="work-phone" value="${esc(state.user.phone || '')}" required data-mask="phone">
          </div>
          <div class="form-group">
            <label for="work-city">Cidade</label>
            <input type="text" id="work-city" value="${esc(state.user.city || state.city)}" required>
          </div>
          <div class="form-group">
            <label for="work-motivation">Por que quer trabalhar conosco?</label>
            <textarea id="work-motivation" rows="3" placeholder="Conte um pouco sobre você..."></textarea>
          </div>
          <p class="form-error" id="work-error" role="alert" hidden></p>
          <button type="submit" class="primary-button wide-button">Enviar candidatura</button>
        </form>`,
      onOpen: () => {
        $('#work-form').addEventListener('submit', (event) => submitWorkApplication(event, type));
      }
    });
  }

  function submitWorkApplication(event, type) {
    event.preventDefault();
    const error = $('#work-error');
    const payload = {
      type,
      name: $('#work-name').value.trim(),
      email: $('#work-email').value.trim(),
      phone: $('#work-phone').value.trim(),
      city: $('#work-city').value.trim(),
      motivation: $('#work-motivation').value.trim(),
      date: new Date().toISOString()
    };

    const problems = [];
    if (payload.name.length < 3) problems.push('Informe seu nome completo.');
    if (!isValidEmail(payload.email)) problems.push('E-mail inválido.');
    if (!isValidPhone(payload.phone)) problems.push('Telefone inválido.');
    if (payload.city.length < 2) problems.push('Informe sua cidade.');

    if (problems.length) {
      error.textContent = problems.join(' ');
      error.hidden = false;
      return;
    }

    const applications = store.get(KEY.apps, []) || [];
    applications.push(payload);
    store.set(KEY.apps, applications);

    state.user.missions = (state.user.missions || 0) + 1;
    let bonus = 0;
    if (!state.user.welcomeBonusPaid) {
      state.user.welcomeBonusPaid = true;
      bonus = CONFIG.welcomeBonus;
      state.user.balance = (state.user.balance || 0) + bonus;
      state.user.cashback = (state.user.cashback || 0) + bonus;
      state.user.bonus = (state.user.bonus || 0) + bonus;
      addTransaction('bonus', 'Bônus de boas-vindas — primeira missão', bonus);
    }
    persistUser();
    updateWalletUI();
    updateProfileUI();
    closeModal();
    toast(bonus ? `🎉 Candidatura enviada! Você ganhou ${fmtMoney(bonus)} de bônus.` : 'Candidatura enviada! Entraremos em contato.');
  }

  /* ---------------------------------------------------------
     Autenticação
     --------------------------------------------------------- */
  function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    $('#tab-login').classList.toggle('active', isLogin);
    $('#tab-register').classList.toggle('active', !isLogin);
    $('#tab-login').setAttribute('aria-selected', String(isLogin));
    $('#tab-register').setAttribute('aria-selected', String(!isLogin));
    $('#login-form').hidden = !isLogin;
    $('#register-form').hidden = isLogin;
    hideError('#login-error');
    hideError('#register-error');
  }

  function hideError(selector) {
    const el = $(selector);
    if (el) { el.hidden = true; el.textContent = ''; }
  }

  function showError(selector, message, fieldSelector) {
    const el = $(selector);
    if (el) { el.textContent = message; el.hidden = false; }
    if (fieldSelector) {
      const field = $(fieldSelector);
      if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    hideError('#login-error');
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;

    if (!email || !password) {
      showError('#login-error', 'Preencha e-mail e senha.', !email ? '#login-email' : '#login-password');
      return;
    }

    const users = store.get(KEY.users, []) || [];
    const login = email.toLowerCase();
    const digits = onlyDigits(email);
    const user = users.find((u) =>
      String(u.email || '').toLowerCase() === login || (digits && onlyDigits(u.phone) === digits));

    if (!user) {
      showError('#login-error', 'Conta não encontrada. Crie uma conta para continuar.', '#login-email');
      return;
    }

    const hash = await hashPassword(password);
    const legacyOk = !user.passwordHash && user.password === password;
    if (hash !== user.passwordHash && !legacyOk) {
      showError('#login-error', 'E-mail, telefone ou senha incorretos.', '#login-password');
      return;
    }

    if (legacyOk) {
      // Migra contas antigas (senha em texto puro) para o hash.
      user.passwordHash = hash;
      delete user.password;
      store.set(KEY.users, users);
    }

    enterApp(user, `Bem-vindo de volta, ${user.name}!`);
  }

  async function handleRegister(event) {
    event.preventDefault();
    hideError('#register-error');
    const name = $('#register-name').value.trim();
    const email = $('#register-email').value.trim().toLowerCase();
    const phone = $('#register-phone').value.trim();
    const password = $('#register-password').value;

    if (name.length < 3) return showError('#register-error', 'Informe seu nome completo.', '#register-name');
    if (!isValidEmail(email)) return showError('#register-error', 'E-mail inválido.', '#register-email');
    if (!isValidPhone(phone)) return showError('#register-error', 'Telefone inválido (DDD + número).', '#register-phone');
    if (password.length < 6) return showError('#register-error', 'A senha precisa de pelo menos 6 caracteres.', '#register-password');

    const users = store.get(KEY.users, []) || [];
    if (users.some((u) => String(u.email || '').toLowerCase() === email)) {
      return showError('#register-error', 'Este e-mail já está cadastrado. Faça login.', '#register-email');
    }

    const user = {
      id: uid(),
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
      city: state.city,
      avatar: null,
      pix: '',
      missions: 0,
      cashback: 0,
      savings: 0,
      balance: 0,
      bonus: 0,
      welcomeBonusPaid: false,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    store.set(KEY.users, users);
    enterApp(user, 'Conta criada com sucesso!');
  }

  function demoLogin() {
    const users = store.get(KEY.users, []) || [];
    let guest = users.find((u) => u.email === 'visitante@precoeperto.app');
    if (!guest) {
      guest = {
        id: 'guest',
        name: 'Visitante',
        email: 'visitante@precoeperto.app',
        phone: '(51) 99999-0000',
        passwordHash: 'demo',
        city: state.city,
        avatar: null,
        pix: '',
        missions: 0,
        cashback: 0,
        savings: 0,
        balance: 0,
        bonus: 0,
        welcomeBonusPaid: false,
        isGuest: true
      };
      users.push(guest);
      store.set(KEY.users, users);
    }
    enterApp(guest, 'Modo visitante ativado 👋');
  }

  function enterApp(user, message) {
    state.user = user;
    store.set(KEY.user, user);
    state.transactions = store.get(KEY.tx, []) || [];
    updateProfileUI();
    updateWalletUI();
    showPage('home');
    loadData({ silent: true });
    toast(message);
  }

  function logout() {
    confirmDialog({
      title: 'Sair da conta?',
      message: 'Sua lista de compras e favoritos continuam salvos neste navegador.',
      confirmLabel: 'Sair',
      danger: true,
      onConfirm: () => {
        state.user = null;
        store.remove(KEY.user);
        showPage('login');
        toast('Você saiu da conta');
      }
    });
  }

  /* ---------------------------------------------------------
     Perfil
     --------------------------------------------------------- */
  function saveProfile(event) {
    event.preventDefault();
    if (!state.user) return;
    const email = $('#profile-email').value.trim().toLowerCase();
    const name = $('#profile-name').value.trim();

    if (name.length < 3) { toast('Informe seu nome completo'); $('#profile-name').focus(); return; }
    if (!isValidEmail(email)) { toast('E-mail inválido'); $('#profile-email').focus(); return; }

    state.user.name = name;
    state.user.email = email;
    state.user.phone = $('#profile-phone').value.trim();
    state.user.city = $('#profile-city').value.trim() || state.city;
    state.user.pix = $('#profile-pix').value.trim();
    persistUser();
    updateProfileUI();
    updateWalletUI();
    toast('Perfil atualizado!');
  }

  function changeProfilePhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast('Escolha uma imagem de até 5 MB'); return; }
      const reader = new FileReader();
      reader.onload = () => compressImage(reader.result).then((dataUrl) => {
        state.user.avatar = dataUrl;
        persistUser();
        updateProfileUI();
        toast('Foto atualizada!');
      });
      reader.onerror = () => toast('Não foi possível ler a imagem');
      reader.readAsDataURL(file);
    });
    input.click();
  }

  /** Reduz a foto antes de salvar — evita estourar a cota do localStorage. */
  function compressImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = CONFIG.avatarSize;
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, size / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch (err) {
          console.warn('[preco-perto] falha ao comprimir imagem', err);
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function updatePasswordStrength(value) {
    const bar = $('#password-strength-bar');
    const text = $('#password-strength-text');
    if (!bar || !text) return;
    let score = 0;
    if (value.length >= 6) score += 1;
    if (value.length >= 10) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;

    const levels = [
      { w: '0%', label: 'Use ao menos 6 caracteres.', cls: '' },
      { w: '33%', label: 'Fraca — misture letras e números.', cls: '' },
      { w: '66%', label: 'Média — quase lá!', cls: 'medium' },
      { w: '100%', label: 'Forte 💪', cls: 'strong' }
    ];
    const level = levels[Math.min(score, 3)];
    bar.style.width = level.w;
    bar.className = level.cls;
    text.textContent = level.label;
  }

  /* ---------------------------------------------------------
     Tema, rede e atalhos
     --------------------------------------------------------- */
  const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = $('#theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
    }
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set(KEY.theme, next);
    applyTheme(next);
  }

  function updateOfflineBanner() {
    const banner = $('#offline-banner');
    if (!banner) return;
    banner.hidden = navigator.onLine !== false;
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('./sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Nova versão disponível', {
              duration: 8000,
              actionLabel: 'Atualizar',
              onAction: () => {
                worker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            });
          }
        });
      });
    }).catch((err) => console.warn('[preco-perto] service worker não registrado', err));
  }

  function bindEvents() {
    const search = $('#search-input');
    if (search) {
      search.addEventListener('input', debounce((event) => {
        state.query = event.target.value.trim();
        renderProducts();
      }, 200));
      search.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); scrollToSection('products'); }
        if (event.key === 'Escape') clearSearch();
      });
    }

    // Máscara de telefone
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (target.matches?.('[data-mask="phone"]')) {
        target.value = maskPhone(target.value);
      }
    });

    // Mostrar/ocultar senha
    document.addEventListener('click', (event) => {
      const btn = event.target.closest?.('[data-toggle-password]');
      if (!btn) return;
      const field = document.getElementById(btn.dataset.togglePassword);
      if (!field) return;
      const show = field.type === 'password';
      field.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
      btn.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });

    // Modal: Esc fecha, clique no fundo fecha, Tab fica preso no diálogo
    document.addEventListener('keydown', (event) => {
      if ($('#modal').hidden) return;
      if (event.key === 'Escape') { closeModal(); return; }
      if (event.key !== 'Tab') return;
      const focusables = $$('#modal-sheet button, #modal-sheet input, #modal-sheet select, #modal-sheet textarea, #modal-sheet [href]')
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    $('#modal').addEventListener('click', (event) => {
      if (event.target === $('#modal')) closeModal();
    });

    window.addEventListener('online', () => { updateOfflineBanner(); loadData({ silent: true }); });
    window.addEventListener('offline', updateOfflineBanner);

    window.addEventListener('popstate', () => {
      const page = location.hash.replace(/^#\/?/, '') || 'home';
      showPage(page, { silent: true });
    });

    // Atalho: "/" foca a busca, "g h" volta para o início
    document.addEventListener('keydown', (event) => {
      if (event.target.matches?.('input, textarea, select')) return;
      if (event.key === '/' && state.currentPage === 'home') {
        event.preventDefault();
        $('#search-input')?.focus();
      }
    });
  }

  /* ---------------------------------------------------------
     Inicialização
     --------------------------------------------------------- */
  function init() {
    state.cart = normalizeCart(store.get(KEY.cart, []));
    state.favorites = (store.get(KEY.favs, []) || []).map(String);
    state.transactions = store.get(KEY.tx, []) || [];
    state.user = store.get(KEY.user, null);
    state.city = store.get(KEY.city, 'Porto Alegre, RS');
    $('#city-name').textContent = state.city;

    applyTheme(store.get(KEY.theme, document.documentElement.dataset.theme || 'light'));
    bindEvents();
    updateOfflineBanner();
    registerServiceWorker();

    // As páginas usam foco programático: deixamos cada <section class="page"> focável.
    $$('.page').forEach((page) => page.setAttribute('tabindex', '-1'));

    const initial = location.hash.replace(/^#\/?/, '') || (state.user ? 'home' : 'login');
    showPage(initial, { silent: true });

    if (state.user) {
      const cached = readCache();
      if (cached) applyData(cached);
      loadData({ silent: true });
    } else {
      // Pré-carrega o catálogo para a tela de login não ficar vazia depois.
      const cached = readCache();
      if (cached) applyData(cached);
    }

    updateStats();
  }

  /* ---------------------------------------------------------
     API pública (usada pelos handlers inline do HTML)
     --------------------------------------------------------- */
  Object.assign(window, {
    showPage,
    scrollToSection,
    switchAuthTab,
    handleLogin,
    handleRegister,
    demoLogin,
    logout,
    saveProfile,
    changeProfilePhoto,
    updatePasswordStrength,
    toggleTheme,
    loadData: () => loadData(),
    filterCategory,
    changeSort,
    clearSearch,
    toggleCart,
    changeQty,
    clearCart,
    toggleFavorite,
    toggleOffers,
    viewStoreProducts,
    openCityPicker,
    openBasketComparison,
    openWithdraw,
    applyForWork,
    openInfo,
    closeModal
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
