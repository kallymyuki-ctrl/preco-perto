# Preço Perto — app React

Versão em **React 18 + Vite + TypeScript + Tailwind 4** do comparador de preços.
Comparador mobile-first (máx. 520px) de supermercado, farmácia e pet shop, com lista de
compras, carteira de cashback, perfil e Trabalhe Conosco. Toda a interface em pt-BR.

```
app/
├── index.html
├── public/
│   ├── icon.svg            logo do app
│   ├── manifest.webmanifest
│   ├── logos/*.svg         marcas das lojas (geradas no projeto)
│   └── banners/*.svg       banners promocionais locais
└── src/
    ├── App.tsx             telas e estado
    ├── main.tsx
    ├── index.css           tema, tokens e componentes de UI
    ├── lib/
    │   ├── mercadopago.ts  integração MP somente via backend
    │   └── storage.ts      helpers de localStorage
    └── components/
        ├── Icons.tsx       biblioteca de ícones SVG
        ├── Login.tsx
        ├── LegalPages.tsx  Termos, Privacidade, Regras para parceiros
        ├── Features.tsx    Alertas, Cashback, Fidelidade, Scanner, Entrega…
        ├── SharedLists.tsx listas compartilhadas
        └── PriceHistory.tsx histórico de preços
```

## Rodando

```bash
cd app
npm install
cp .env.example .env      # opcional
npm run dev               # http://localhost:5173
npm run build             # gera dist/
npm run preview           # serve o dist/
```

## Correções aplicadas nesta versão

### 1. CSS quebrado (prioridade 1) ✅

O redesign anterior trocou o nome dos tokens e apagou classes que os componentes usavam,
deixando o app visualmente desmontado. Em `src/index.css`:

| Problema | Correção |
|---|---|
| `text-green-brand`, `bg-green-pale`, `border-line`, `text-ink`, `text-muted` sem cor | tokens legados mantidos como **alias** da paleta nova |
| `.promo-badge` removido | recriado (badge de desconto) |
| `.card-3d` removido | recriado (hover 3D das lojas/produtos) |
| `.map-container` removido | recriado (página do mapa voltou a montar) |
| `.toast-notification` sem `opacity:0` → toast **fixo na tela** | corrigido |
| `.animate-fadeIn`, `.animate-scaleIn`, `.store-logo-img`, `.scroll-hidden` removidos | recriados |
| — | adicionados `prefers-reduced-motion` e `:focus-visible` |

Todas as classes estão presentes no CSS final (`dist/assets/*.css`).

### 2. Pagamento falso / token vazado ✅ (estrutura pronta)

Antes o Access Token de produção ficava em `VITE_MP_ACCESS_TOKEN` — ele ia para o bundle e
qualquer pessoa podia cobrar em seu nome. Agora:

- `src/lib/mercadopago.ts` usa **somente a Public Key** e chama o backend nos endpoints
  `/api/create-pix`, `/api/pay-card`, `/api/create-boleto`, `/api/create-preference`.
- O Access Token vai no `.env` do **servidor** (`MP_ACCESS_TOKEN`), nunca no front.
- Cartão é validado antes de enviar (Luhn, validade, CVV, CPF) e o resultado vem do backend:
  `approved` → sucesso; `rejected` → tela de falha com o motivo. **Nada mais é aprovado de mentira.**
- `VITE_MP_MOCK=true` (padrão no `.env.example`) simula respostas para o app funcionar sem
  backend; o aviso “modo demonstração” aparece na interface.

> ⚠️ **Ação necessária:** o Access Token que apareceu no chat (`APP_USR-8345…470`) foi
> exposto. Revogue e gere outro em mercadopago.com.br → *Seus integradores → Credenciais*.

### 3. Logos e dados ✅ (parcial)

- As imagens das lojas saíram de URLs temporárias (`image.qwenlm.ai`) e agora são arquivos
  locais em `public/logos/*.svg`.
- São **marcas próprias** (iniciais + cor, com brilho 3D), não a reprodução dos logotipos de
  terceiros — evita problema de marca registrada. Troque pelos arquivos oficiais quando
  tiver autorização das redes.
- Banners promocionais também são locais (`public/banners/*.svg`).
- Ainda há lojas sem produtos cadastrados; a tela de detalhe mostra um estado vazio honesto
  em vez de uma página quebrada.

## Próximos passos sugeridos

1. Subir o backend (`server/api`) com o Access Token e webhook do Mercado Pago.
2. Substituir o login local por autenticação real (Supabase Auth).
3. Sincronizar lista/favoritos na nuvem (Supabase), com Realtime para listas compartilhadas.
4. Histórico de preços real (salvar preço por data no banco) no lugar da série ilustrativa.
5. Cadastrar produtos para as lojas que ainda estão vazias.
