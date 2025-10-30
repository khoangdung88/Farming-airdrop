"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// Hiển thị danh sách task_runs với filter theo nhóm, template, trạng thái

type TaskRun = {
  id: string;
  template_id: string | null;
  wallet_id: string | null;
  wallet_group_id: string | null;
  status: string | null;
  error_message?: string | null;
  created_at: string | null;
};

type Group = { id: string; group_name: string };

type Template = { id: string; name: string; chain: string; action: string };

type Wallet = { id: string; wallet_address: string | null };

export default function TaskRunsPage(){
  const [rows, setRows] = useState<TaskRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [walletsMap, setWalletsMap] = useState<Record<string, Wallet>>({});

  const [qGroup, setQGroup] = useState('');
  const [qTpl, setQTpl] = useState('');
  const [qStatus, setQStatus] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    const filters: any[] = [];
    let query = supabase.from('task_runs').select('id,template_id,wallet_id,wallet_group_id,status,error_message,created_at').order('created_at', { ascending: false }).limit(200);
    if (qGroup) query = query.eq('wallet_group_id', qGroup);
    if (qTpl) query = query.eq('template_id', qTpl);
    if (qStatus) query = query.eq('status', qStatus);

    const [trRes, gRes, tRes] = await Promise.all([
      query,
      supabase.from('wallet_groups').select('id,group_name').eq('is_deleted', false).order('group_name', { ascending: true }).limit(500),
      supabase.from('task_templates').select('id,name,chain,action').order('created_at', { ascending: false }).limit(500),
    ]);

    if (trRes.error) setError(trRes.error.message);
    if (gRes.error) setError(gRes.error.message);
    if (tRes.error) setError(tRes.error.message);

    const taskRuns = (trRes.data as any as TaskRun[]) || [];
    setRows(taskRuns);
    setGroups((gRes.data as any) || []);
    setTemplates((tRes.data as any) || []);

    // Nạp địa chỉ ví để hiển thị nhanh
    const walletIds = taskRuns.map(r=>r.wallet_id).filter(Boolean) as string[];
    const uniqIds = Array.from(new Set(walletIds)).slice(0, 1000);
    if (uniqIds.length > 0) {
      const wRes = await supabase.from('wallets').select('id,wallet_address').in('id', uniqIds).limit(1000);
      if (!wRes.error) {
        const mp: Record<string, Wallet> = {};
        (wRes.data as any as Wallet[]).forEach(w => { if (w.id) mp[w.id] = w; });
        setWalletsMap(mp);
      }
    }

    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const statusClass = (s?: string | null) => {
    const v = (s||'').toLowerCase();
    if (v==='success') return 'text-green-700';
    if (v==='failed') return 'text-red-600';
    if (v==='pending') return 'text-yellow-700';
    return '';
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Task Runs</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Bộ lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Nhóm</span>
            <select className="border rounded px-3 py-2" value={qGroup} onChange={e=>setQGroup(e.target.value)}>
              <option value="">(Tất cả)</option>
              {groups.map(g => (<option key={g.id} value={g.id}>{g.group_name}</option>))}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Template</span>
            <select className="border rounded px-3 py-2" value={qTpl} onChange={e=>setQTpl(e.target.value)}>
              <option value="">(Tất cả)</option>
              {templates.map(t => (<option key={t.id} value={t.id}>{t.name} · {t.chain} · {t.action}</option>))}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Trạng thái</span>
            <select className="border rounded px-3 py-2" value={qStatus} onChange={e=>setQStatus(e.target.value)}>
              <option value="">(Tất cả)</option>
              <option value="pending">pending</option>
              <option value="success">success</option>
              <option value="failed">failed</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="px-3 py-2 border rounded" onClick={load} disabled={loading}>{loading?'Đang tải...':'Lọc / Tải lại'}</button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Danh sách</h2>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Thời gian</th>
                  <th className="py-2 pr-3">Nhóm</th>
                  <th className="py-2 pr-3">Template</th>
                  <th className="py-2 pr-3">Wallet</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const g = groups.find(x => x.id === r.wallet_group_id);
                  const t = templates.find(x => x.id === r.template_id);
                  const w = r.wallet_id ? walletsMap[r.wallet_id] : null;
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-3 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                      <td className="py-2 pr-3">{g?.group_name || '-'}</td>
                      <td className="py-2 pr-3">{t ? `${t.name} · ${t.chain} · ${t.action}` : r.template_id}</td>
                      <td className="py-2 pr-3">{w?.wallet_address || r.wallet_id || '-'}</td>
                      <td className={`py-2 pr-3 ${statusClass(r.status)}`}>{r.status}</td>
                      <td className="py-2 pr-3 max-w-[360px] truncate" title={r.error_message || ''}>{r.error_message || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
