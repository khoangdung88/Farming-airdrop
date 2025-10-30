"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Referral = {
  id: string;
  referrer_id: string | null;
  referred_id: string | null;
  referral_code: string | null;
  commission_rate: number | null;
  total_earned: number | null;
  status: string | null;
  created_at: string | null;
};

export default function AdminReferralsPage() {
  const [rows, setRows] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [referral_code, setReferralCode] = useState('');
  const [referrer_id, setReferrerId] = useState('');
  const [referred_id, setReferredId] = useState('');
  const [commission_rate, setCommissionRate] = useState<number | ''>('');

  const [users, setUsers] = useState<{id:string; email:string|null}[]>([]);

  const load = async () => {
    setLoading(true);
    const [rRes, uRes] = await Promise.all([
      supabase
        .from('referrals')
        .select('id,referral_code,referrer_id,referred_id,commission_rate,total_earned,status,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('users')
        .select('id,email')
        .order('email', { ascending: true })
        .limit(200)
    ]);
    if (rRes.error) setError(rRes.error.message);
    setRows(rRes.data || []);
    setUsers(uRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: any = { referral_code };
    if (referrer_id) payload.referrer_id = referrer_id;
    if (referred_id) payload.referred_id = referred_id;
    if (commission_rate !== '') payload.commission_rate = Number(commission_rate);
    const { error } = await supabase.from('referrals').insert(payload);
    if (error) setError(error.message);
    else { setReferralCode(''); setReferrerId(''); setReferredId(''); setCommissionRate(''); await load(); }
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('referrals').delete().eq('id', id);
    if (error) setError(error.message); else await load();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý Referrals</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Thêm Referral</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Referral code" value={referral_code} onChange={e=>setReferralCode(e.target.value)} required />
          <select className="border rounded px-3 py-2" value={referrer_id} onChange={e=>setReferrerId(e.target.value)}>
            <option value="">(Referrer)</option>
            {users.map(u => (<option key={u.id} value={u.id}>{u.email || u.id}</option>))}
          </select>
          <select className="border rounded px-3 py-2" value={referred_id} onChange={e=>setReferredId(e.target.value)}>
            <option value="">(Referred)</option>
            {users.map(u => (<option key={u.id} value={u.id}>{u.email || u.id}</option>))}
          </select>
          <input className="border rounded px-3 py-2" placeholder="Commission %" value={commission_rate} onChange={e=>setCommissionRate(e.target.value as any)} />
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
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Referrer</th>
                  <th className="py-2 pr-3">Referred</th>
                  <th className="py-2 pr-3">Commission</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-3">{r.referral_code}</td>
                    <td className="py-2 pr-3">{users.find(u=>u.id===r.referrer_id)?.email || r.referrer_id}</td>
                    <td className="py-2 pr-3">{users.find(u=>u.id===r.referred_id)?.email || r.referred_id}</td>
                    <td className="py-2 pr-3">{r.commission_rate}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      {/* Edit page có thể bổ sung sau */}
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
