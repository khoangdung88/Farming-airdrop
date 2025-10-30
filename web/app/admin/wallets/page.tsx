"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { HDNodeWallet } from 'ethers';

type Wallet = {
  id: string;
  user_id: string | null;
  wallet_address: string | null;
  chain: string | null;
  label: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

export default function AdminWalletsPage() {
  const [rows, setRows] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form đơn giản, KHÔNG đụng tới private_key/mnemonic
  const [wallet_address, setWalletAddress] = useState('');
  const [chain, setChain] = useState('');
  const [label, setLabel] = useState('');
  const [user_id, setUserId] = useState('');

  const [users, setUsers] = useState<{id:string; email:string|null}[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [checkingAll, setCheckingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    const [wRes, uRes] = await Promise.all([
      supabase
        .from('wallets')
        .select('id,user_id,wallet_address,chain,label,is_active,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('users')
        .select('id,email')
        .order('email', { ascending: true })
        .limit(200)
    ]);
    if (wRes.error) setError(wRes.error.message);
    setRows(wRes.data || []);
    setUsers(uRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ===== Helpers: RPC check balance (Solana Devnet only for now) =====
  const devnetRpc = 'https://api.devnet.solana.com';
  const checkOneBalance = async (w: Wallet) => {
    if (!w.wallet_address) return;
    try {
      // Support Solana only for now
      if (String(w.chain || '').includes('solana')) {
        const body = {
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [w.wallet_address]
        };
        const res = await fetch(devnetRpc, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        });
        const j = await res.json();
        const lamports = j?.result?.value ?? 0;
        const sol = (lamports / 1_000_000_000).toFixed(6);
        setBalances(prev => ({ ...prev, [w.id]: sol + ' SOL' }));
      } else {
        setBalances(prev => ({ ...prev, [w.id]: 'N/A' }));
      }
    } catch (e:any) {
      setBalances(prev => ({ ...prev, [w.id]: 'err' }));
    }
  };
  const checkAllBalances = async () => {
    try {
      setCheckingAll(true);
      for (const w of rows) {
        // chỉ check nhanh cho solana để tránh rate limit
        if (String(w.chain || '').includes('solana')) {
          // thêm delay nhỏ tránh 429
          // eslint-disable-next-line no-await-in-loop
          await checkOneBalance(w);
          // eslint-disable-next-line no-await-in-loop
          await new Promise(r => setTimeout(r, 300));
        }
      }
    } finally {
      setCheckingAll(false);
    }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('wallets').insert({ wallet_address, chain, label, user_id: user_id || null });
    if (error) setError(error.message);
    else { setWalletAddress(''); setChain(''); setLabel(''); setUserId(''); await load(); }
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('wallets').delete().eq('id', id);
    if (error) setError(error.message); else await load();
  };

  const [exporting, setExporting] = useState(false);

  const exportPrivateKeysCSV = async () => {
    try {
      setExporting(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('wallet_address,private_key,label,chain,environment,derivation_index')
        .order('created_at', { ascending: true })
        .limit(10000);
      if (error) throw error;
      const rows = data || [];
      const header = ['address','private_key','label','chain','environment','derivation_index'];
      const csv = [header.join(',')].concat(
        rows.map((r: any) => [r.wallet_address, r.private_key, r.label || '', r.chain || '', r.environment || '', r.derivation_index ?? ''].map(v => {
          const s = String(v ?? '');
          if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g,'""') + '"';
          return s;
        }).join(','))
      ).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wallets_private_keys.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setExporting(false);
    }
  };

  const exportSeedPhraseJSON = async () => {
    try {
      setExporting(true);
      const { data, error } = await supabase
        .from('wallets')
        .select('mnemonic,derivation_index,wallet_address')
        .order('derivation_index', { ascending: true })
        .limit(10000);
      if (error) throw error;
      const rows = (data || []).filter((r: any) => !!r.mnemonic);
      const byMnemonic: Record<string, { mnemonic: string; indices: number[]; addresses: string[]; }> = {};
      for (const r of rows) {
        const key = r.mnemonic as string;
        if (!byMnemonic[key]) byMnemonic[key] = { mnemonic: key, indices: [], addresses: [] };
        byMnemonic[key].indices.push(r.derivation_index ?? 0);
        byMnemonic[key].addresses.push(r.wallet_address);
      }
      const out = Object.values(byMnemonic).map(x => ({
        mnemonic: x.mnemonic,
        indices: x.indices.sort((a,b)=>a-b),
        addresses: x.addresses
      }));
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metamask_seed_batches.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setExporting(false);
    }
  };

  // ===================== Bulk Generate (Batch) =====================
  const [batchName, setBatchName] = useState('Batch ' + new Date().toISOString().slice(0,19).replace('T',' '));
  const [batchSize, setBatchSize] = useState<number>(10);
  const [envTarget, setEnvTarget] = useState('testnet');
  const [genChain, setGenChain] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const onGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenMsg(null);
    setError(null);
    if (!batchName || batchSize <= 0) {
      setError('Tên batch và số lượng phải hợp lệ.');
      return;
    }
    try {
      setGenerating(true);
      // Lấy user hiện tại để set created_by cho batch (nếu có)
      const { data: sess } = await supabase.auth.getSession();
      const created_by = sess.session?.user?.id || null;

      // Tạo batch record
      const { data: batchInsert, error: batchErr } = await supabase
        .from('wallet_batches')
        .insert({ name: batchName, size: batchSize, created_by })
        .select('id')
        .single();
      if (batchErr) throw batchErr;
      const batch_id = batchInsert.id as string;

      // Tạo 1 mnemonic cho cả batch và derive nhiều địa chỉ theo chỉ số
      const mnemonicWallet = HDNodeWallet.createRandom();
      const phrase = mnemonicWallet.mnemonic?.phrase as string;

      const rowsToInsert: any[] = [];
      for (let i = 0; i < batchSize; i++) {
        const path = `m/44'/60'/0'/0/${i}`;
        const child = HDNodeWallet.fromPhrase(phrase, undefined, path);
        rowsToInsert.push({
          wallet_address: child.address,
          private_key: child.privateKey,
          mnemonic: phrase,
          chain: genChain || null,
          label: `${batchName} #${i}`,
          user_id: assignUserId || null,
          batch_id,
          derivation_index: i,
          source: 'generated',
          environment: envTarget,
        });
      }

      const { error: insErr } = await supabase.from('wallets').insert(rowsToInsert);
      if (insErr) throw insErr;
      setGenMsg(`Đã tạo ${rowsToInsert.length} ví trong batch.`);
      await load();
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý Wallets</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Tạo ví hàng loạt (Batch)</h2>
        <form onSubmit={onGenerateBatch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Batch name</span>
            <input className="border rounded px-3 py-2" placeholder="Batch name" value={batchName} onChange={e=>setBatchName(e.target.value)} />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Số lượng</span>
            <input className="border rounded px-3 py-2" placeholder="Số lượng" type="number" min={1} value={batchSize} onChange={e=>setBatchSize(parseInt(e.target.value || '0', 10))} />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Chain (vd: ethereum / solana-devnet)</span>
            <input className="border rounded px-3 py-2" placeholder="ethereum / solana-devnet" value={genChain} onChange={e=>setGenChain(e.target.value)} />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Environment</span>
            <select className="border rounded px-3 py-2" value={envTarget} onChange={e=>setEnvTarget(e.target.value)}>
              <option value="testnet">testnet</option>
              <option value="mainnet">mainnet</option>
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Gán cho user (tuỳ chọn)</span>
            <select className="border rounded px-3 py-2" value={assignUserId} onChange={e=>setAssignUserId(e.target.value)}>
              <option value="">(Gán cho user)</option>
              {users.map(u => (<option key={u.id} value={u.id}>{u.email || u.id}</option>))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="px-4 py-2 bg-black text-white rounded w-full md:w-auto" disabled={generating}>{generating ? 'Đang tạo...' : 'Tạo batch'}</button>
          </div>
        </form>
        <p className="text-xs text-gray-600 mt-2">Lưu ý: Mnemonic và private key sẽ được lưu trong DB cho mục đích test. Không dùng cho tài sản thật.</p>
        {genMsg && <p className="text-sm text-green-700 mt-2">{genMsg}</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Thêm Wallet</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Wallet address</span>
            <input className="border rounded px-3 py-2" placeholder="0x... / Solana address" value={wallet_address} onChange={e=>setWalletAddress(e.target.value)} required />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Chain</span>
            <input className="border rounded px-3 py-2" placeholder="ethereum / solana-devnet" value={chain} onChange={e=>setChain(e.target.value)} />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Label</span>
            <input className="border rounded px-3 py-2" placeholder="Ghi chú" value={label} onChange={e=>setLabel(e.target.value)} />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Gán user (tuỳ chọn)</span>
            <select className="border rounded px-3 py-2" value={user_id} onChange={e=>setUserId(e.target.value)}>
              <option value="">(Không gán user)</option>
              {users.map(u => (<option key={u.id} value={u.id}>{u.email || u.id}</option>))}
            </select>
          </label>
          <div className="flex items-end">
            <button className="px-4 py-2 bg-black text-white rounded w-full md:w-auto">Thêm</button>
          </div>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      <section className="rounded border bg-white p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Danh sách</h2>
          <div className="flex gap-2">
            <button className="px-3 py-2 border rounded" disabled={exporting} onClick={exportSeedPhraseJSON}>
              {exporting ? 'Đang export...' : 'Export MetaMask Seed JSON'}
            </button>
            <button className="px-3 py-2 border rounded" disabled={exporting} onClick={exportPrivateKeysCSV}>
              {exporting ? 'Đang export...' : 'Export Private Keys CSV'}
            </button>
            <button className="px-3 py-2 border rounded" disabled={checkingAll} onClick={checkAllBalances}>
              {checkingAll ? 'Đang check...' : 'Check all balances (Solana)'}
            </button>
          </div>
        </div>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Address</th>
                  <th className="py-2 pr-3">Chain</th>
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2 pr-3">Balance</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(w => (
                  <tr key={w.id} className="border-b">
                    <td className="py-2 pr-3">{w.wallet_address}</td>
                    <td className="py-2 pr-3">{w.chain}</td>
                    <td className="py-2 pr-3">{w.label}</td>
                    <td className="py-2 pr-3">{balances[w.id] || '-'}</td>
                    <td className="py-2 pr-3">{users.find(u=>u.id===w.user_id)?.email || w.user_id}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      <button className="px-2 py-1 border rounded" onClick={()=>checkOneBalance(w)}>Check</button>
                      <button className="px-2 py-1 border rounded" onClick={()=>onDelete(w.id)}>Xóa</button>
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
