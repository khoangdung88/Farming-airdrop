"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type RpcRow = {
  id: string;
  chain: string;
  name: string;
  url: string;
  weight: number;
  is_active: boolean;
  created_at: string;
};

export default function AdminRpcPage() {
  const [rows, setRows] = useState<RpcRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chain, setChain] = useState('ethereum');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [weight, setWeight] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  const CHAINS = [
    'ethereum','arbitrum','optimism','polygon','base','bsc','avalanche','fantom','zksync','linea','scroll',
    'solana-mainnet','solana-testnet','solana-devnet'
  ];

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rpc_endpoints')
      .select('id,chain,name,url,weight,is_active,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) setError(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('rpc_endpoints').insert({ chain, name, url, weight, is_active: isActive });
    if (error) setError(error.message);
    else { setName(''); setUrl(''); setWeight(1); setIsActive(true); await load(); }
  };

  const toggleActive = async (id: string, value: boolean) => {
    setError(null);
    const { error } = await supabase.from('rpc_endpoints').update({ is_active: value }).eq('id', id);
    if (error) setError(error.message); else await load();
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('rpc_endpoints').delete().eq('id', id);
    if (error) setError(error.message); else await load();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý RPC</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Thêm RPC</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <select className="border rounded px-3 py-2" value={chain} onChange={e=>setChain(e.target.value)}>
            {CHAINS.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <input className="border rounded px-3 py-2" placeholder="Tên (vd: Alchemy)" value={name} onChange={e=>setName(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="RPC URL" value={url} onChange={e=>setUrl(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Weight" type="number" min={1} value={weight} onChange={e=>setWeight(parseInt(e.target.value||'1',10))} />
          <select className="border rounded px-3 py-2" value={isActive? '1':'0'} onChange={e=>setIsActive(e.target.value==='1')}>
            <option value="1">active</option>
            <option value="0">inactive</option>
          </select>
          <button className="px-3 py-2 bg-black text-white rounded">Thêm</button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Danh sách</h2>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Chain</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">URL</th>
                  <th className="py-2 pr-3">Weight</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-3">{r.chain}</td>
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3 max-w-[420px] truncate" title={r.url}>{r.url}</td>
                    <td className="py-2 pr-3">{r.weight}</td>
                    <td className="py-2 pr-3">
                      <select className="border rounded px-2 py-1" value={r.is_active? '1':'0'} onChange={e=>toggleActive(r.id, e.target.value==='1')}>
                        <option value="1">active</option>
                        <option value="0">inactive</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 flex gap-2">
                      <button className="px-2 py-1 border rounded" onClick={()=>onDelete(r.id)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
