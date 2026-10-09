import { useMemo } from 'react';
import { IconTrending, IconArrowLeft, IconChart } from './Icons';
import { currency } from '../lib/storage';

interface Props {
  productId: string;
  productName: string;
  currentPrice: number;
  store: string;
  onBack: () => void;
}

/** Série histórica determinística a partir do id (mesma lista em visitas diferentes). */
function buildSeries(productId: string, currentPrice: number) {
  let seed = 0;
  for (let i = 0; i < productId.length; i += 1) seed = (seed * 31 + productId.charCodeAt(i)) % 100000;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const months = ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];
  const points = months.map((month, index) => {
    const drift = (rand() - 0.45) * currentPrice * 0.12;
    const value = currentPrice + drift + (index === months.length - 1 ? 0 : (months.length - 1 - index) * currentPrice * 0.008);
    return { month, value: Math.max(currentPrice * 0.7, value) };
  });
  points[points.length - 1] = { ...points[points.length - 1], value: currentPrice };
  return points;
}

export default function PriceHistory({ productId, productName, currentPrice, store, onBack }: Props) {
  const series = useMemo(() => buildSeries(productId, currentPrice), [productId, currentPrice]);
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const lowest = min >= currentPrice - 0.01;

  const width = 320;
  const height = 140;
  const stepX = width / (series.length - 1);
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 24) - 12;
  const line = series.map((p, i) => `${i * stepX},${y(p.value)}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <div className="animate-fadeIn">
      <button onClick={onBack} className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="px-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid w-12 h-12 rounded-2xl place-items-center bg-accent-light text-accent">
            <IconChart size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Histórico de Preços</h1>
            <p className="text-sm text-slate-500">{store}</p>
          </div>
        </div>

        <div className="p-5 mb-4 bg-white border rounded-2xl border-line">
          <h2 className="mb-4 text-base font-bold">{productName}</h2>

          <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full" role="img" aria-label={`Variação de preço de ${productName} nos últimos 6 meses`}>
            <polygon points={area} fill="rgba(15,139,100,0.12)" />
            <polyline points={line} fill="none" stroke="#0f8b64" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {series.map((p, i) => (
              <circle key={p.month} cx={i * stepX} cy={y(p.value)} r={i === series.length - 1 ? 5 : 3} fill="#0f8b64" />
            ))}
            {series.map((p, i) => (
              <text key={`t-${p.month}`} x={i * stepX} y={height + 18} textAnchor="middle" fontSize="11" fill="#9ca3af">{p.month}</text>
            ))}
          </svg>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="p-3 text-center rounded-xl bg-slate-50">
              <div className="text-xs text-slate-400">Menor</div>
              <div className="text-sm font-bold text-accent">{currency(min)}</div>
            </div>
            <div className="p-3 text-center rounded-xl bg-slate-50">
              <div className="text-xs text-slate-400">Média</div>
              <div className="text-sm font-bold">{currency(avg)}</div>
            </div>
            <div className="p-3 text-center rounded-xl bg-slate-50">
              <div className="text-xs text-slate-400">Maior</div>
              <div className="text-sm font-bold text-danger">{currency(max)}</div>
            </div>
          </div>
        </div>

        <div className={`flex items-start gap-3 p-4 rounded-2xl ${lowest ? 'bg-accent-light' : 'bg-amber-50'}`}>
          <IconTrending className={lowest ? 'text-accent' : 'text-warning'} size={20} />
          <p className={`m-0 text-sm ${lowest ? 'text-accent-dark' : 'text-amber-800'}`}>
            {lowest
              ? `Ótimo momento: o preço atual (${currency(currentPrice)}) é o menor dos últimos 6 meses.`
              : `O preço atual está ${currency(currentPrice - min)} acima do menor valor já registrado (${currency(min)}).`}
          </p>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Série ilustrativa gerada localmente. Para o histórico real, é preciso salvar o preço de cada
          produto por data no banco.
        </p>
      </div>
    </div>
  );
}
