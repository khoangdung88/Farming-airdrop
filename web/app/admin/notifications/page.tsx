"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Noti = {
  id: string;
  user_id: string | null;
  title: string | null;
  message: string | null;
  is_read: boolean | null;
  priority: string | null;
  channel: string | null;
  created_at: string | null;
};

export default function AdminNotificationsPage() {
  const [rows, setRows] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [user_id, setUserId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [channel, setChannel] = useState('in_app');

  const [users, setUsers] = useState<{id:string; email:string|null}[]>([]);

  const load = async () => {
    setLoading(true);
    const [nRes, uRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id,user_id,title,message,is_read,priority,channel,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('users')
        .select('id,email')
        .order('email', { ascending: true })
        .limit(200)
    ]);
    if (nRes.error) setError(nRes.error.message);
    setRows(nRes.data || []);
    setUsers(uRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: any = { title, message, priority, channel };
    if (user_id) payload.user_id = user_id;
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) setError(error.message);
    else { setTitle(''); setMessage(''); setUserId(''); setPriority('normal'); setChannel('in_app'); await load(); }
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) setError(error.message); else await load();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý Notifications</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Thêm Notification</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} required />
          <input className="border rounded px-3 py-2" placeholder="Message" value={message} onChange={e=>setMessage(e.target.value)} />
          <select className="border rounded px-3 py-2" value={user_id} onChange={e=>setUserId(e.target.value)}>
            <option value="">(In-app broadcast)</option>
            {users.map(u => (<option key={u.id} value={u.id}>{u.email || u.id}</option>))}
          </select>
          <select className="border rounded px-3 py-2" value={priority} onChange={e=>setPriority(e.target.value)}>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="high">high</option>
          </select>
          <select className="border rounded px-3 py-2" value={channel} onChange={e=>setChannel(e.target.value)}>
            <option value="in_app">in_app</option>
            <option value="email">email</option>
            <option value="webhook">webhook</option>
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
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(n => (
                  <tr key={n.id} className="border-b">
                    <td className="py-2 pr-3">{n.title}</td>
                    <td className="py-2 pr-3">{users.find(u=>u.id===n.user_id)?.email || (n.user_id ? n.user_id : 'broadcast')}</td>
                    <td className="py-2 pr-3">{n.priority}</td>
                    <td className="py-2 pr-3">{n.channel}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      {/* Edit page có thể bổ sung sau */}
                      <button className="px-2 py-1 border rounded" onClick={()=>onDelete(n.id)}>Xóa</button>
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
