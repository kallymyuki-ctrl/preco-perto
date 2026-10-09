import { useState } from 'react';
import { IconShare, IconPlus, IconClose, IconCopy, IconArrowLeft, IconList } from './Icons';
import { load, save } from '../lib/storage';

interface SharedList {
  id: string;
  name: string;
  code: string;
  items: { id: string; name: string; qty: number }[];
  createdAt: string;
}

interface Props {
  userId: string;
  onBack: () => void;
}

const newCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function SharedLists({ userId, onBack }: Props) {
  const key = `pp_lists_${userId || 'anon'}`;
  const [lists, setLists] = useState<SharedList[]>(() => load<SharedList[]>(key, []));
  const [name, setName] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [item, setItem] = useState('');

  const persist = (next: SharedList[]) => {
    setLists(next);
    save(key, next);
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    const list: SharedList = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code: newCode(),
      items: [],
      createdAt: new Date().toISOString(),
    };
    persist([list, ...lists]);
    setName('');
    setOpenId(list.id);
  };

  const addItem = (listId: string) => {
    if (item.trim().length < 2) return;
    persist(lists.map((l) =>
      l.id === listId
        ? { ...l, items: [...l.items, { id: crypto.randomUUID(), name: item.trim(), qty: 1 }] }
        : l));
    setItem('');
  };

  const removeItem = (listId: string, itemId: string) =>
    persist(lists.map((l) =>
      l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l));

  const removeList = (listId: string) => persist(lists.filter((l) => l.id !== listId));

  const share = async (list: SharedList) => {
    const text = `${list.name} — Preço Perto\nCódigo: ${list.code}\n${list.items.map((i) => `• ${i.qty}x ${i.name}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Lista copiada! Envie para quem quiser.');
    } catch {
      alert(`Compartilhe o código: ${list.code}`);
    }
  };

  return (
    <div className="animate-fadeIn">
      <button onClick={onBack} className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-bold border-0 bg-transparent text-accent">
        <IconArrowLeft size={16} /> Voltar
      </button>

      <div className="px-4 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid w-12 h-12 rounded-2xl place-items-center bg-accent-light text-accent">
            <IconList size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Listas Compartilhadas</h1>
            <p className="text-sm text-slate-500">Monte junto com a família</p>
          </div>
        </div>

        <form onSubmit={create} className="p-4 mb-4 bg-white border rounded-2xl border-line">
          <label className="label">Nova lista</label>
          <div className="flex gap-2">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Churrasco de domingo" />
            <button type="submit" className="btn btn-primary"><IconPlus size={18} /></button>
          </div>
        </form>

        {lists.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed rounded-[20px] border-slate-300">
            <div className="mb-2 text-4xl">📋</div>
            <p className="m-0 text-sm text-slate-500">Crie uma lista e compartilhe com quem quiser.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lists.map((list) => (
              <div key={list.id} className="overflow-hidden bg-white border rounded-2xl border-line">
                <button
                  onClick={() => setOpenId(openId === list.id ? null : list.id)}
                  className="flex items-center w-full gap-3 p-4 text-left border-0 bg-transparent"
                  aria-expanded={openId === list.id}
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold">{list.name}</div>
                    <div className="text-xs text-slate-500">
                      {list.items.length} {list.items.length === 1 ? 'item' : 'itens'} · código {list.code}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-accent">{openId === list.id ? 'Fechar' : 'Abrir'}</span>
                </button>

                {openId === list.id && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <div className="flex gap-2 mt-3">
                      <input
                        className="input"
                        value={item}
                        onChange={(e) => setItem(e.target.value)}
                        placeholder="Adicionar item..."
                        onKeyDown={(e) => e.key === 'Enter' && addItem(list.id)}
                      />
                      <button onClick={() => addItem(list.id)} className="btn btn-primary"><IconPlus size={18} /></button>
                    </div>

                    <div className="grid gap-2 mt-3">
                      {list.items.map((i) => (
                        <div key={i.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                          <span className="text-sm font-semibold">{i.qty}x {i.name}</span>
                          <button onClick={() => removeItem(list.id, i.id)} className="p-2 border-0 rounded-xl text-danger bg-red-50" aria-label={`Remover ${i.name}`}>
                            <IconClose size={14} />
                          </button>
                        </div>
                      ))}
                      {list.items.length === 0 && <p className="text-xs text-slate-400">Nenhum item ainda.</p>}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => share(list)} className="flex-1 btn btn-secondary">
                        <IconCopy size={16} /> Copiar
                      </button>
                      <button onClick={() => removeList(list.id)} className="btn btn-secondary text-danger">
                        <IconClose size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 mt-4 text-xs text-slate-400">
          <IconShare size={14} /> As listas ficam salvas neste dispositivo. Para sincronizar em tempo
          real entre pessoas é necessário backend (Supabase Realtime).
        </div>
      </div>
    </div>
  );
}
