"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

// Đơn giản: ưu tiên Solana Devnet; các chain khác hiển thị N/A
// Có throttle nhẹ để tránh 429

type Group = { id: string; group_name: string };
type Wallet = { id: string; wallet_address: string | null; chain: string | null; wallet_group_id: string | null };
type RpcEndpoint = { chain: string; name: string; url: string; weight: number; is_active: boolean };

export default function GroupBalancesPage(){
  const [groups, setGroups] = useState<Group[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const [balances, setBalances] = useState<Record<string, number>>({}); // key: wallet.id -> lamports
  const [groupTotals, setGroupTotals] = useState<Record<string, number>>({}); // key: group.id -> lamports
  const [rpcByChain, setRpcByChain] = useState<Record<string, RpcEndpoint[]>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [gRes, wRes, rRes] = await Promise.all([
        supabase.from('wallet_groups').select('id,group_name').eq('is_deleted', false).order('group_name', { ascending: true }).limit(200),
        supabase.from('wallets').select('id,wallet_address,chain,wallet_group_id').order('created_at', { ascending: true }).limit(5000),
        supabase.from('rpc_endpoints').select('chain,name,url,weight,is_active').eq('is_active', true).limit(1000)
      ]);
      if (gRes.error) setError(gRes.error.message);
      if (wRes.error) setError(wRes.error.message);
      if (rRes.error) setError(rRes.error.message);
      setGroups((gRes.data as any) || []);
      setWallets((wRes.data as any) || []);
      const endpoints = (rRes.data as any as RpcEndpoint[]) || [];
      const byChain: Record<string, RpcEndpoint[]> = {};
      for (const e of endpoints) {
        if (!byChain[e.chain]) byChain[e.chain] = [];
        byChain[e.chain].push(e);
      }
      setRpcByChain(byChain);
      setLoading(false);
    })();
  }, []);

  const weightedPick = (arr: RpcEndpoint[]): RpcEndpoint | null => {
    if (!arr || arr.length === 0) return null;
    const total = arr.reduce((s,a)=>s + (a.weight>0?a.weight:1), 0);
    let r = Math.random() * total;
    for (const a of arr) {
      const w = a.weight>0?a.weight:1;
      if ((r -= w) <= 0) return a;
    }
    return arr[0];
  };

  const getRpcUrl = (chain: string | null | undefined): string => {
    const key = String(chain || '').trim();
    const list = rpcByChain[key];
    const picked = weightedPick(list || []);
    if (picked?.url) return picked.url;
    // Fallbacks
    if (key === 'solana-devnet') return 'https://api.devnet.solana.com';
    if (key === 'solana-testnet') return 'https://api.testnet.solana.com';
    if (key === 'solana-mainnet') return 'https://api.mainnet-beta.solana.com';
    return 'https://api.devnet.solana.com';
  };

  const fetchSolBalance = async (address: string, chain: string): Promise<number> => {
    const rpc = getRpcUrl(chain);
    const body = { jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] };
    const res = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    return j?.result?.value ?? 0; // lamports
  };

  const [checking, setChecking] = useState(false);
  const checkAll = async () => {
    try {
      setChecking(true);
      const nextBalances: Record<string, number> = {};
      const nextTotals: Record<string, number> = {};
      for (const w of wallets) {
        if (!w.wallet_address) continue;
        const gid = w.wallet_group_id || 'ungrouped';
        let lamports = 0;
        if (String(w.chain || '').includes('solana')) {
          try {
            lamports = await fetchSolBalance(w.wallet_address, String(w.chain));
            // throttle nhẹ
            // eslint-disable-next-line no-await-in-loop
            await new Promise(r=>setTimeout(r, 250));
          } catch {}
        }
        nextBalances[w.id] = lamports;
        nextTotals[gid] = (nextTotals[gid] || 0) + lamports;
      }
      setBalances(nextBalances);
      setGroupTotals(nextTotals);
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Số dư theo Nhóm</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Tổng quan</h2>
          <button className="px-3 py-2 border rounded" onClick={checkAll} disabled={checking || loading}>
            {checking ? 'Đang quét...' : 'Quét tất cả số dư (Solana)'}
          </button>
        </div>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Nhóm</th>
                  <th className="py-2 pr-3">Tổng ví</th>
                  <th className="py-2 pr-3">Tổng số dư (SOL)</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => {
                  const walletsIn = wallets.filter(w => w.wallet_group_id === g.id);
                  const lamports = groupTotals[g.id] || 0;
                  const sol = (lamports / 1_000_000_000).toFixed(6);
                  return (
                    <tr key={g.id} className="border-b">
                      <td className="py-2 pr-3">{g.group_name}</td>
                      <td className="py-2 pr-3">{walletsIn.length}</td>
                      <td className="py-2 pr-3">{sol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Chi tiết ví (Solana hiển thị số dư)</h2>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Nhóm</th>
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Chain</th>
                  <th className="py-2 pr-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map(w => {
                  const g = groups.find(x => x.id === w.wallet_group_id);
                  const lamports = balances[w.id] ?? null;
                  const show = String(w.chain || '').includes('solana') ? (lamports===null? '-' : (lamports/1_000_000_000).toFixed(6)+ ' SOL') : 'N/A';
                  return (
                    <tr key={w.id} className="border-b">
                      <td className="py-2 pr-3">{g?.group_name || '-'}</td>
                      <td className="py-2 pr-3">{w.wallet_address}</td>
                      <td className="py-2 pr-3">{w.chain}</td>
                      <td className="py-2 pr-3">{show}</td>
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
