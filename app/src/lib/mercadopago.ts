/* =========================================================
   Mercado Pago — integração do lado do cliente
   ---------------------------------------------------------
   ⚠️  NUNCA coloque o Access Token aqui.
       Variáveis VITE_* são injetadas no bundle e qualquer
       pessoa consegue lê-las no DevTools do navegador.
       Quem usa o Access Token é o BACKEND (server/api).

   Este arquivo só faz duas coisas:
     1. inicializa o SDK com a PUBLIC KEY (que é pública mesmo)
     2. chama os endpoints do seu backend (/api/*)

   Se o backend ainda não existe, o modo mock (VITE_MP_MOCK=true)
   devolve respostas falsas para a interface funcionar.
   ========================================================= */

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export interface CartItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export interface BuyerData {
  email: string;
  firstName: string;
  lastName: string;
  identification: { type: 'CPF' | 'CNPJ'; number: string };
}

export interface CardData {
  number: string;
  holderName: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
  cpf: string;
  installments: number;
}

export interface PixPayment {
  qr_code: string;
  qr_code_base64: string;
  expiration_date: string;
  mock?: boolean;
}

export interface PaymentResult {
  status: 'pending' | 'approved' | 'rejected';
  id?: string;
  message?: string;
  mock?: boolean;
}

const API_URL = (import.meta.env.VITE_API_URL as string) || '/api';
const PUBLIC_KEY = (import.meta.env.VITE_MP_PUBLIC_KEY as string) || '';
/** Modo demonstração: não processa nada, só simula as respostas. */
const MOCK = import.meta.env.VITE_MP_MOCK === 'true';

let sdkPromise: Promise<unknown> | null = null;

/** Carrega o SDK do Mercado Pago e inicializa com a Public Key. */
export async function initMercadoPago(publicKey: string = PUBLIC_KEY) {
  if (!publicKey) {
    console.warn('[MP] VITE_MP_PUBLIC_KEY não configurada — SDK não inicializado.');
    return null;
  }
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      if ((window as any).MercadoPago) return resolve((window as any).MercadoPago);
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => resolve((window as any).MercadoPago);
      script.onerror = () => reject(new Error('Falha ao carregar o SDK do Mercado Pago'));
      document.body.appendChild(script);
    });
  }
  const SDK: any = await sdkPromise;
  return new SDK(publicKey, { locale: 'pt-BR' });
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backend respondeu ${res.status}`);
  return res.json() as Promise<T>;
}

/** Cria a preferência de pagamento no backend. */
export async function createPaymentPreference(items: CartItem[], buyer: BuyerData) {
  if (MOCK) {
    console.warn('[MP] MOCK ativo — nenhuma preferência real foi criada.');
    return { id: 'mock-preference', init_point: '#', mock: true as const };
  }
  return post<{ id: string; init_point: string }>('/create-preference', { items, buyer });
}

/** Gera o PIX no backend (o Access Token nunca sai de lá). */
export async function generatePixQRCode(amount: number, description: string): Promise<PixPayment> {
  if (MOCK) {
    console.warn('[MP] MOCK ativo — QR Code PIX falso.');
    return {
      qr_code: '00020101021226930014br.gov.bcb.pix2571MOCK-PRECO-PERTO5204000053039865802BR6304ABCD',
      qr_code_base64:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      expiration_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      mock: true,
    };
  }
  return post<PixPayment>('/create-pix', { amount, description });
}

/** Cobrança com cartão — tokenizada pelo backend. */
export async function payWithCard(
  card: CardData,
  buyer: BuyerData,
  amount: number
): Promise<PaymentResult> {
  if (MOCK) {
    console.warn('[MP] MOCK ativo — pagamento com cartão simulado.');
    return { status: 'approved', id: 'mock-payment', mock: true };
  }
  return post<PaymentResult>('/pay-card', {
    card: {
      number: card.number.replace(/\s/g, ''),
      holderName: card.holderName,
      expirationMonth: card.expirationMonth,
      expirationYear: card.expirationYear,
      cvv: card.cvv,
      cpf: card.cpf.replace(/\D/g, ''),
    },
    buyer,
    amount,
    installments: card.installments,
  });
}

/** Gera o boleto no backend. */
export async function generateBoleto(amount: number, buyer: BuyerData): Promise<PaymentResult> {
  if (MOCK) {
    console.warn('[MP] MOCK ativo — boleto simulado.');
    return { status: 'pending', id: 'mock-boleto', mock: true };
  }
  return post<PaymentResult>('/create-boleto', { amount, buyer });
}

/* ------------------------- validação ------------------------- */

function luhnValid(digits: string) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardData(card: CardData) {
  const errors: string[] = [];
  const number = card.number.replace(/\s/g, '');

  if (number.length < 13 || number.length > 19 || !luhnValid(number)) errors.push('Número de cartão inválido.');
  if (card.holderName.trim().length < 3) errors.push('Informe o nome impresso no cartão.');

  const month = Number(card.expirationMonth);
  const year = Number(card.expirationYear);
  const now = new Date();
  const expired = !month || month < 1 || month > 12 || !year || year < now.getFullYear() % 100 ||
    (year === now.getFullYear() % 100 && month < now.getMonth() + 1);
  if (expired) errors.push('Validade inválida ou cartão vencido.');

  if (!/^\d{3,4}$/.test(card.cvv)) errors.push('CVV inválido.');
  if (card.cpf.replace(/\D/g, '').length !== 11) errors.push('CPF do titular inválido.');

  return { valid: errors.length === 0, errors };
}

/* ------------------------- máscaras ------------------------- */

export const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();

export const formatCPF = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatExpirationDate = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export const formatPhone = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return d.length > 10
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
};
