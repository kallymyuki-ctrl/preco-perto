import { useEffect, useMemo, useState } from 'react';
import {
  IconBell, IconWallet, IconGift, IconCamera, IconTruck, IconChef,
  IconBook, IconCalendar, IconArrowLeft, IconPlus, IconClose, IconCheck, IconTag,
} from './Icons';
import { load, save, currency } from '../lib/storage';

interface Props { onBack: () => void; }

const Header = ({ icon, title, subtitle, onBack }: Props & { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="animate-fadeIn">
    <button onClick={onBack} className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">
      <IconArrowLeft size={16} /> Voltar
    </button>
    <div className="px-4 pb-4">
      <div className="flex items-center gap-3">
        <div className="grid w-12 h-12 rounded-2xl place-items-center bg-accent-light text-accent">{icon}</div>
        <div>
          <h1 className="text-2xl font-bold font-display">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  </div>
);

const Empty = ({ emoji, text }: { emoji: string; text: string }) => (
  <div className="p-8 text-center bg-white border border-dashed rounded-[20px] border-slate-300">
    <div className="mb-2 text-4xl">{emoji}</div>
    <p className="m-0 text-sm text-slate-500">{text}</p>
  </div>
);

/* ───────────── Alertas de preço ───────────── */
export const PriceAlerts = ({ onBack }: Props) => {
  const [alerts, setAlerts] = useState<{ id: string; product: string; target: number }[]>(() => load('pp_alerts', []));
  const [product, setProduct] = useState('');
  const [target, setTarget] = useState('');

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(target.replace(',', '.'));
    if (product.trim().length < 2 || !Number.isFinite(value) || value <= 0) return;
    const next = [...alerts, { id: crypto.randomUUID(), product: product.trim(), target: value }];
    setAlerts(next);
    save('pp_alerts', next);
    setProduct('');
    setTarget('');
  };

  const remove = (id: string) => {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    save('pp_alerts', next);
  };

  return (
    <>
      <Header icon={<IconBell size={24} />} title="Alertas de Preço" subtitle="Avise quando o preço cair" onBack={onBack} />
      <div className="px-4">
        <form onSubmit={add} className="p-4 mb-4 bg-white border rounded-2xl border-line">
          <label className="label">Produto</label>
          <input className="input mb-3" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Ex.: Arroz 5kg" />
          <label className="label">Preço-alvo (R$)</label>
          <input className="input mb-3" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0,00" inputMode="decimal" />
          <button type="submit" className="btn btn-primary w-full"><IconPlus size={18} /> Criar alerta</button>
        </form>

        {alerts.length === 0 ? (
          <Empty emoji="🔔" text="Você ainda não tem alertas. Crie um e avisaremos quando o preço atingir o alvo." />
        ) : (
          <div className="grid gap-3">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4 bg-white border rounded-2xl border-line">
                <IconTag className="text-accent" size={20} />
                <div className="flex-1">
                  <div className="text-sm font-bold">{a.product}</div>
                  <div className="text-xs text-slate-500">Avisar abaixo de {currency(a.target)}</div>
                </div>
                <button onClick={() => remove(a.id)} className="p-2 border-0 rounded-xl text-danger bg-red-50" aria-label={`Remover alerta de ${a.product}`}>
                  <IconClose size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-slate-400">
          Aviso: nesta versão os alertas ficam salvos no dispositivo. Para receber notificações reais é
          necessário backend com push.
        </p>
      </div>
    </>
  );
};

/* ───────────── Carteira de cashback ───────────── */
export const CashbackWallet = ({ onBack }: Props) => {
  const [balance, setBalance] = useState(() => load('pp_balance', 0));
  const [pix, setPix] = useState(() => load('pp_pix', ''));
  const [history, setHistory] = useState<{ id: string; label: string; value: number; date: string }[]>(() => load('pp_history', []));

  const withdraw = () => {
    if (balance < 10) return alert('Saldo mínimo para saque: R$ 10,00');
    if (pix.trim().length < 5) return alert('Cadastre uma chave Pix válida.');
    const entry = { id: crypto.randomUUID(), label: `Saque Pix · ${pix}`, value: -balance, date: new Date().toISOString() };
    const next = [entry, ...history];
    setHistory(next); save('pp_history', next);
    setBalance(0); save('pp_balance', 0);
    alert('Saque solicitado! Pago em até 2 dias úteis.');
  };

  return (
    <>
      <Header icon={<IconWallet size={24} />} title="Cashback" subtitle="Receba de volta em cada compra" onBack={onBack} />
      <div className="px-4">
        <div className="p-6 mb-4 text-white rounded-3xl bg-gradient-to-br from-[#0a1f1c] to-[#0f8b64]">
          <div className="text-xs uppercase opacity-80">Saldo disponível</div>
          <div className="my-2 text-4xl font-bold font-display">{currency(balance)}</div>
          <div className="text-xs opacity-80">Saque mínimo: R$ 10,00 · PIX em até 2 dias úteis</div>
        </div>

        <div className="p-4 mb-4 bg-white border rounded-2xl border-line">
          <label className="label">Chave Pix</label>
          <input className="input mb-3" value={pix} onChange={(e) => { setPix(e.target.value); save('pp_pix', e.target.value); }} placeholder="E-mail, telefone, CPF ou chave aleatória" />
          <button onClick={withdraw} className="btn btn-primary w-full">Sacar agora</button>
        </div>

        <h2 className="mb-3 text-lg font-bold font-display">Extrato</h2>
        {history.length === 0 ? (
          <Empty emoji="💰" text="Nenhuma movimentação ainda." />
        ) : (
          <div className="grid gap-2">
            {history.slice(0, 20).map((h) => (
              <div key={h.id} className="flex items-center justify-between p-3 bg-white border rounded-xl border-line">
                <div>
                  <div className="text-sm font-semibold">{h.label}</div>
                  <div className="text-xs text-slate-400">{new Date(h.date).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className={`font-bold ${h.value < 0 ? 'text-danger' : 'text-accent'}`}>
                  {h.value < 0 ? '−' : '+'} {currency(Math.abs(h.value))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

/* ───────────── Fidelidade ───────────── */
export const LoyaltyCard = ({ onBack }: Props) => {
  const [points, setPoints] = useState(() => load('pp_points', 240));
  const levels = [
    { name: 'Bronze', min: 0, color: 'text-amber-700' },
    { name: 'Prata', min: 500, color: 'text-slate-500' },
    { name: 'Ouro', min: 1500, color: 'text-amber-500' },
  ];
  const level = [...levels].reverse().find((l) => points >= l.min)!;

  return (
    <>
      <Header icon={<IconGift size={24} />} title="Cartão Fidelidade" subtitle="Acumule pontos nas lojas parceiras" onBack={onBack} />
      <div className="px-4">
        <div className="p-6 mb-4 text-white rounded-3xl bg-gradient-to-br from-[#0a1f1c] to-[#0f8b64]">
          <div className="text-xs uppercase opacity-80">Seus pontos</div>
          <div className="my-2 text-4xl font-bold font-display">{points}</div>
          <div className={`text-sm font-bold ${level.color.replace('text-', 'text-')} opacity-90`}>Nível {level.name}</div>
        </div>
        <button onClick={() => { const n = points + 50; setPoints(n); save('pp_points', n); }} className="w-full mb-4 btn btn-primary">
          <IconPlus size={18} /> Simular +50 pontos
        </button>
        <p className="text-xs text-slate-400">
          Cada R$ 1,00 em compras validadas vira 1 ponto. Troque por cupons nas lojas parceiras.
        </p>
      </div>
    </>
  );
};

/* ───────────── Scanner ───────────── */
export const BarcodeScanner = ({ onBack }: Props) => {
  const [code, setCode] = useState('');
  const supported = 'BarcodeDetector' in window;

  return (
    <>
      <Header icon={<IconCamera size={24} />} title="Scanner de Código" subtitle="Compare o preço na hora" onBack={onBack} />
      <div className="px-4">
        <div className="grid h-56 mb-4 border-2 border-dashed rounded-3xl place-items-center border-line bg-slate-50">
          <div className="text-center">
            <div className="mb-2 text-5xl">📷</div>
            <div className="text-sm font-bold text-slate-600">
              {supported ? 'Câmera pronta para leitura' : 'Leitura nativa não suportada neste navegador'}
            </div>
          </div>
        </div>
        <label className="label">Ou digite o código EAN</label>
        <input className="input mb-3" value={code} onChange={(e) => setCode(e.target.value)} placeholder="7891000055120" inputMode="numeric" />
        <button className="w-full btn btn-primary" onClick={() => alert(code ? `Buscando produto ${code}…` : 'Informe ou escaneie um código.')}>
          Buscar produto
        </button>
        <p className="mt-4 text-xs text-slate-400">
          Para escanear de verdade é preciso ativar a câmera (BarcodeDetector ou biblioteca como
          html5-qrcode) — posso implementar quando quiser.
        </p>
      </div>
    </>
  );
};

/* ───────────── Tracking de entrega ───────────── */
export const DeliveryTracking = ({ onBack }: Props) => {
  const steps = [
    { label: 'Pedido confirmado', done: true, icon: <IconCheck size={16} /> },
    { label: 'Itens separados na loja', done: true, icon: <IconCheck size={16} /> },
    { label: 'Saiu para entrega', done: true, icon: <IconTruck size={16} /> },
    { label: 'Chegando ao destino', done: false, icon: <IconTruck size={16} /> },
  ];
  return (
    <>
      <Header icon={<IconTruck size={24} />} title="Acompanhar Entrega" subtitle="Pedido #PP-2481" onBack={onBack} />
      <div className="px-4">
        <div className="p-4 mb-4 bg-white border rounded-2xl border-line">
          {steps.map((s, i) => (
            <div key={s.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 grid place-items-center rounded-full ${s.done ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500'}`}>{s.icon}</div>
                {i < steps.length - 1 && <div className={`w-0.5 flex-1 ${s.done ? 'bg-accent' : 'bg-slate-200'}`} style={{ minHeight: 24 }} />}
              </div>
              <div className="pb-4">
                <div className={`text-sm font-bold ${s.done ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</div>
                {s.done && <div className="text-xs text-slate-400">Concluído</div>}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">Exemplo ilustrativo. O tracking real depende do parceiro de entrega.</p>
      </div>
    </>
  );
};

/* ───────────── Receitas ───────────── */
const RECIPES = [
  { id: 1, name: 'Arroz de forno cremoso', time: '40 min', items: ['Arroz 5kg', 'Queijo Mussarela 200g', 'Molho de Tomate 340g'], emoji: '🍚' },
  { id: 2, name: 'Bolo de cenoura simples', time: '50 min', items: ['Farinha de Trigo 1kg', 'Óleo de Soja 900ml', 'Açúcar Cristal 1kg'], emoji: '🥕' },
  { id: 3, name: 'Café da tarde reforçado', time: '15 min', items: ['Café 500g', 'Leite Integral 1L', 'Pão de Forma'], emoji: '☕' },
];

export const Recipes = ({ onBack }: Props) => (
  <>
    <Header icon={<IconChef size={24} />} title="Receitas" subtitle="Inspire-se com o que você comprou" onBack={onBack} />
    <div className="px-4 grid gap-3">
      {RECIPES.map((r) => (
        <div key={r.id} className="p-4 bg-white border rounded-2xl border-line">
          <div className="flex items-center gap-3">
            <div className="grid w-12 h-12 text-2xl rounded-xl place-items-center bg-slate-50">{r.emoji}</div>
            <div className="flex-1">
              <div className="text-sm font-bold">{r.name}</div>
              <div className="text-xs text-slate-500">⏱ {r.time}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {r.items.map((i) => (
              <span key={i} className="px-2 py-1 text-xs font-semibold rounded-full bg-accent-light text-accent-dark">{i}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  </>
);

/* ───────────── Catálogos ───────────── */
const FLYERS = [
  { id: 1, store: 'Supermercado Zaffari', title: 'Ofertas da semana', valid: 'Até 31/10', emoji: '🛒' },
  { id: 2, store: 'Panvel Farmácias', title: 'Genéricos com até 60% OFF', valid: 'Até 28/10', emoji: '💊' },
  { id: 3, store: 'Petz', title: 'Tudo para seu pet', valid: 'Até 05/11', emoji: '🐾' },
];

export const DigitalFlyers = ({ onBack }: Props) => (
  <>
    <Header icon={<IconBook size={24} />} title="Catálogos Digitais" subtitle="Folhetos de ofertas" onBack={onBack} />
    <div className="px-4 grid gap-3">
      {FLYERS.map((f) => (
        <button key={f.id} className="flex items-center gap-3 p-4 text-left bg-white border rounded-2xl border-line card-interactive">
          <div className="grid w-14 h-14 text-2xl rounded-2xl place-items-center bg-slate-50">{f.emoji}</div>
          <div className="flex-1">
            <div className="text-sm font-bold">{f.store}</div>
            <div className="text-xs text-slate-500">{f.title}</div>
            <div className="mt-1 text-[11px] font-bold text-accent">{f.valid}</div>
          </div>
        </button>
      ))}
    </div>
  </>
);

/* ───────────── Agendamento ───────────── */
export const DeliveryScheduling = ({ onBack }: Props) => {
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const slots = ['08:00 – 10:00', '10:00 – 12:00', '14:00 – 16:00', '18:00 – 20:00'];
  const booked = useMemo(() => load('pp_schedule', null as null | { date: string; slot: string }), []);

  return (
    <>
      <Header icon={<IconCalendar size={24} />} title="Agendar Entrega" subtitle="Escolha data e horário" onBack={onBack} />
      <div className="px-4">
        <div className="p-4 mb-4 bg-white border rounded-2xl border-line">
          <label className="label">Data</label>
          <input type="date" className="input mb-4" value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="label">Horário</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {slots.map((s) => (
              <button key={s} onClick={() => setSlot(s)} className={`p-3 text-sm font-bold border rounded-xl ${slot === s ? 'border-accent bg-accent-light text-accent-dark' : 'border-line bg-white'}`}>
                {s}
              </button>
            ))}
          </div>
          <button
            className="w-full btn btn-primary"
            onClick={() => {
              if (!date || !slot) return alert('Escolha data e horário.');
              save('pp_schedule', { date, slot });
              alert(`Entrega agendada para ${new Date(date).toLocaleDateString('pt-BR')} — ${slot}`);
            }}
          >
            Confirmar agendamento
          </button>
        </div>
        {booked && (
          <p className="text-xs text-slate-400">
            Último agendamento salvo: {new Date(booked.date).toLocaleDateString('pt-BR')} — {booked.slot}
          </p>
        )}
      </div>
    </>
  );
};
