"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Project = {
  id: string;
  name: string;
  status: string | null;
  chain: string | null;
  created_at: string | null;
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [chain, setChain] = useState('base-sepolia');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('id,name,status,chain,created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) setError(error.message);
    setProjects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('projects').insert({ name, status, chain });
    if (error) setError(error.message);
    else {
      setName('');
      setStatus('active');
      setChain('');
      await load();
    }
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) setError(error.message);
    else await load();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý Projects</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Thêm Project</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} required />
          <select className="border rounded px-3 py-2" value={chain} onChange={(e)=>setChain(e.target.value)}>
            <option value="">(không chỉ định)</option>
            <option value="base-sepolia">base-sepolia</option>
            <option value="arbitrum-sepolia">arbitrum-sepolia</option>
            <option value="op-sepolia">op-sepolia</option>
            <option value="polygon-amoy">polygon-amoy</option>
            <option value="zksync-sepolia">zksync-sepolia</option>
            <option value="solana-devnet">solana-devnet</option>
            <option value="solana-testnet">solana-testnet</option>
          </select>
          <select className="border rounded px-3 py-2" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="ended">ended</option>
          </select>
          <button className="px-3 py-2 bg-black text-white rounded">Thêm</button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Danh sách</h2>
        {loading ? (
          <p>Đang tải...</p>
        ) : projects.length === 0 ? (
          <p>Chưa có project.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Chain</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-3">{p.name}</td>
                    <td className="py-2 pr-3">{p.chain}</td>
                    <td className="py-2 pr-3">{p.status}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      <Link className="px-2 py-1 border rounded" href={`/admin/projects/${p.id}`}>Sửa</Link>
                      <button className="px-2 py-1 border rounded" onClick={()=>onDelete(p.id)}>Xóa</button>
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
