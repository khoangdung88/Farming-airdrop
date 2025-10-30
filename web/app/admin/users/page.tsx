"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type User = {
  id: string;
  email: string | null;
  username: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await supabase
      .from('users')
      .select('id,email,username,role,is_active,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) setError(error.message);
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('users').insert({ email, username, role });
    if (error) setError(error.message);
    else { setEmail(''); setUsername(''); setRole('user'); setPage(1); await load(); }
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) setError(error.message); else await load();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý Users</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Thêm User (bản ghi app)</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
          <select className="border rounded px-3 py-2" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="user">user</option>
            <option value="admin">admin</option>
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
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.username}</td>
                    <td className="py-2 pr-3">{u.role}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      <Link className="px-2 py-1 border rounded" href={`/admin/users/${u.id}`}>Sửa</Link>
                      <button className="px-2 py-1 border rounded" onClick={()=>onDelete(u.id)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3 text-sm">
              <div>
                Tổng: {total} | Trang {page}/{Math.max(1, Math.ceil(total / pageSize))}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 border rounded disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  ← Trước
                </button>
                <button
                  className="px-2 py-1 border rounded disabled:opacity-50"
                  disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
                  onClick={() => setPage(p => p + 1)}
                >
                  Sau →
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

