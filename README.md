# 🛍️ Preço Perto

Compare preços de supermercados, farmácias e pet shops da sua região, monte a lista de compras e descubra **em qual loja a cesta inteira sai mais barata**.

PWA instalável, sem build e sem dependências: HTML + CSS + JavaScript puro, com dados vindos do Supabase e funcionamento offline.

---

## 📋 Checklist do projeto

### ✅ Corrigido nesta versão (v4)

**Bugs de funcionamento**

| # | Problema | Status |
|---|----------|--------|
| 1 | A busca só era ligada quando o usuário já estava logado — quem fazia login ficava com o campo de busca morto | ✅ |
| 2 | `switchAuthTab()` dependia do `event` global (quebra em alguns navegadores) | ✅ |
| 3 | A página "Lista" clonava o HTML da home, gerando **IDs duplicados** no documento | ✅ |
| 4 | Cálculo da "melhor compra" comparava somas parciais: a loja com 1 item barato sempre ganhava | ✅ |
| 5 | "Economia do mês" era um valor inventado (`itens × R$ 3,50`) | ✅ |
| 6 | `JSON.parse(localStorage)` sem proteção travava o app inteiro se o dado estivesse corrompido | ✅ |
| 7 | Cashback de R$ 0,50 por item **não era estornado** ao remover (saldo inflava infinitamente) | ✅ |
| 8 | Bônus de R$ 25 da candidatura podia ser resgatado infinitas vezes | ✅ |
| 9 | Saque zerava o saldo sem validar a chave Pix | ✅ |
| 10 | Emojis vazios no HTML (`<span></span>` em "Lojas Parceiras", botão Perfil e estado vazio) | ✅ |
| 11 | Menu inferior desaparecia nas telas internas, deixando o usuário sem navegação | ✅ |
| 12 | Service worker em *cache-first* para tudo: o usuário **nunca** recebia atualizações | ✅ |
| 13 | Código duplicado entre a listagem de produtos e a busca | ✅ |

**Segurança**

| # | Problema | Status |
|---|----------|--------|
| 14 | `innerHTML` com nome de produto/loja/usuário sem escape (XSS) | ✅ Escapado em 100% das saídas + teste automatizado |
| 15 | Senha salva em texto puro no `localStorage` | ✅ Hash SHA-256 (com migração automática de contas antigas) |
| 16 | IDs de produto com apóstrofo quebravam o `onclick` gerado | ✅ `encodeURIComponent` em todos os atributos |
| 17 | Foto de perfil sem compressão podia estourar a cota do `localStorage` | ✅ Redimensionada para 320 px antes de salvar |

**Qualidade e acessibilidade**

| # | Item | Status |
|---|------|--------|
| 18 | Modo escuro (respeita `prefers-color-scheme` + botão de alternância) | ✅ |
| 19 | Modais acessíveis: `aria-modal`, foco preso no diálogo, Esc fecha, foco restaurado | ✅ |
| 20 | `aria-label`, `aria-pressed`, `aria-live`, `role`, `aria-current` nos componentes | ✅ |
| 21 | Link "pular para o conteúdo", foco visível, `prefers-reduced-motion`, alvos de toque ≥ 40 px | ✅ |
| 22 | `prompt()`/`confirm()` nativos substituídos por modais do app (cidade, saque, confirmações) | ✅ |
| 23 | Máscara de telefone, validação de e-mail/senha, medidor de força de senha, "mostrar senha" | ✅ |
| 24 | Skeletons de carregamento em vez de tela parada em "Carregando..." | ✅ |

**Produto**

| # | Recurso | Status |
|---|---------|--------|
| 25 | **Comparação real da cesta**: soma todos os itens em cada loja e mostra o total de cada uma | ✅ |
| 26 | Produtos agrupados por nome com todas as ofertas lado a lado ("Comparar N lojas") | ✅ |
| 27 | Controle de quantidade na lista (+/−) | ✅ |
| 28 | Ordenação (menor preço, maior preço, mais ofertas, A-Z) e contador de resultados | ✅ |
| 29 | Roteamento por URL (`#/cart`, `#/wallet`) com botão voltar do navegador funcionando | ✅ |
| 30 | Transações com status ("em análise" / "concluído") e tipos (cashback, bônus, saque, missão) | ✅ |

**Infraestrutura**

| # | Item | Status |
|---|------|--------|
| 31 | Ícones reais em PNG (192, 512, maskable, apple-touch, favicon.ico) | ✅ |
| 32 | Manifesto completo: `id`, `scope`, atalhos, categorias, ícones por finalidade | ✅ |
| 33 | Service worker por estratégia (network-first p/ HTML, stale-while-revalidate p/ assets) + página offline | ✅ |
| 34 | SEO: Open Graph, Twitter cards, canonical, `robots.txt`, metatags por tema | ✅ |
| 35 | CI no GitHub (sintaxe, JSON do manifesto, referências quebradas) e deploy automático no Pages | ✅ |
| 36 | README, LICENSE (MIT) e `.gitignore` | ✅ |

### 🚧 Próximos passos sugeridos

- [ ] Migrar login/cadastro para o **Supabase Auth** (hoje é local, apenas demonstração)
- [ ] Salvar lista, favoritos e transações por usuário no banco (sync entre dispositivos)
- [ ] Filtro por distância/raio usando a geolocalização do navegador
- [ ] Histórico de preços por produto (gráfico de variação)
- [ ] Notificação de queda de preço dos favoritos
- [ ] Leitura de código de barras/EAN para buscar produtos
- [ ] Painel do lojista para cadastrar ofertas
- [ ] Testes end-to-end (Playwright) no CI

---

## 🚀 Como rodar

Basta servir a pasta (o service worker exige `http://`, não funciona com `file://`):

```bash
python3 -m http.server 8080
# ou
npx serve .
```

Abra <http://localhost:8080>. Para testar, use **"Entrar como visitante"** ou crie uma conta — os dados ficam no seu navegador.

## 🗂️ Estrutura

```
.
├── index.html              # todas as telas (login, home, perfil, carteira, trabalho, lista)
├── styles.css              # tokens de tema, componentes, responsivo e modo escuro
├── app.js                  # lógica: dados, comparação de cestas, UI
├── sw.js                   # service worker (PWA)
├── offline.html            # fallback sem conexão
├── manifest.webmanifest    # instalação como app
├── icon.svg                # ícone vetorial
├── icons/                  # ícones PNG/ICO gerados (192, 512, maskable, apple-touch, favicon)
├── tools/generate-icons.py # regenera os ícones (pip install Pillow)
└── .github/workflows/      # CI + deploy no GitHub Pages
```

## 🗄️ Supabase

O app lê duas tabelas via REST:

```sql
-- Lojas
create table stores (
  id        bigint primary key generated always as identity,
  name      text    not null,
  category  text,                 -- mercado | farmacia | pet
  emoji     text,
  color     text,
  hours     text,
  benefits  text,
  sponsored boolean default false
);

-- Produtos (uma linha por oferta: mesmo produto em lojas diferentes = várias linhas)
create table products (
  id       bigint primary key generated always as identity,
  name     text    not null,
  category text,
  emoji    text,
  store_id bigint  references stores(id),
  price    numeric not null
);
```

> ⚠️ A chave `publishable` no `app.js` é pública por design — **os dados são protegidos pelas políticas de RLS**. Habilite RLS nas duas tabelas e libere apenas `select` para o papel `anon`.

Se o Supabase estiver fora do ar, o app usa o último dado salvo no navegador e, na falta deste, um catálogo de demonstração — nunca fica em branco.

## 📦 Deploy

O workflow `.github/workflows/pages.yml` publica o site no **GitHub Pages** a cada push na `main`.
Ative em *Settings → Pages → Source: GitHub Actions*.

## 📄 Licença

MIT — veja [LICENSE](./LICENSE).
