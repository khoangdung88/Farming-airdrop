"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { HDNodeWallet } from 'ethers';
import * as bip39 from 'bip39';
import { derivePath as solDerivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

type Group = {
  id: string;
  group_name: string;
  description: string | null;
  total_wallets: number | null;
  created_at: string | null;
};

export default function AdminWalletGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [group_name, setGroupName] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('wallet_groups')
      .select('id,group_name,description,total_wallets,created_at,is_deleted')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    setGroups((data as any) || []);
    setLoading(false);
  };

  // ============ Run Now by template for this group ============
  const onRunNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorRun(null);
    setGenMsgRun(null);
    if (!groupId) { setErrorRun('Vui lòng chọn nhóm ví.'); return; }
    if (!selectedTemplate) { setErrorRun('Vui lòng chọn template.'); return; }
    try {
      setEnqueueing(true);
      // lấy N ví đầu của group
      const { data: wallets, error: wErr } = await supabase
        .from('wallets')
        .select('id')
        .eq('wallet_group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(runCount);
      if (wErr) throw wErr;
      const rows = (wallets || []).map(w => ({
        template_id: selectedTemplate,
        wallet_id: w.id,
        wallet_group_id: groupId,
        status: 'pending'
      }));
      if (rows.length === 0) { setErrorRun('Nhóm chưa có ví để chạy.'); setEnqueueing(false); return; }
      const { error: insErr } = await supabase.from('task_runs').insert(rows);
      if (insErr) throw insErr;
      setGenMsgRun(`Đã enqueue ${rows.length} task_runs (pending).`);
    } catch (err:any) {
      setErrorRun(err.message || String(err));
    } finally {
      setEnqueueing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('wallet_groups').insert({ group_name, description });
    if (error) setError(error.message); else { setGroupName(''); setDescription(''); await load(); }
  };

  const onDeleteGroup = async (id: string) => {
    setError(null);
    // Xóa mềm
    const { error } = await supabase.from('wallet_groups').update({ is_deleted: true }).eq('id', id);
    if (error) setError(error.message); else await load();
  };

  // ============ Bulk generate wallets by group ============
  const [batchName, setBatchName] = useState('Batch ' + new Date().toISOString().slice(0,19).replace('T',' '));
  const [batchSize, setBatchSize] = useState<number>(10);
  const [envTarget, setEnvTarget] = useState('testnet');
  // Multi-chain chọn từ danh sách
  const CHAINS = [
    'ethereum','arbitrum','optimism','polygon','base','bsc','avalanche','fantom','zksync','linea','scroll'
  ];
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const SOLANA_NETWORKS = ['solana-mainnet','solana-testnet','solana-devnet'];
  const [solanaNetwork, setSolanaNetwork] = useState<string>('solana-devnet');
  const [accountType, setAccountType] = useState<'evm'|'solana'>('evm');
  const [assignUserId, setAssignUserId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genMsgCreate, setGenMsgCreate] = useState<string | null>(null);
  const [errorCreate, setErrorCreate] = useState<string | null>(null);
  const [users, setUsers] = useState<{id:string; email:string|null}[]>([]);
  const [templates, setTemplates] = useState<{id:string; name:string; chain:string; action:string}[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [runCount, setRunCount] = useState<number>(10);
  const [enqueueing, setEnqueueing] = useState(false);
  const [genMsgRun, setGenMsgRun] = useState<string | null>(null);
  const [errorRun, setErrorRun] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('users').select('id,email').order('email', { ascending: true }).limit(200);
      setUsers((data as any) || []);
    })();
    (async () => {
      const { data } = await supabase
        .from('task_templates')
        .select('id,name,chain,action')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200);
      setTemplates((data as any) || []);
    })();
  }, []);

  const onGenerateToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCreate(null);
    setGenMsgCreate(null);
    if (!groupId) { setError('Vui lòng chọn nhóm ví.'); return; }
    if (!batchName || batchSize <= 0) { setError('Batch name và số lượng không hợp lệ.'); return; }
    const rotateChains = selectedChains.length > 0 ? selectedChains : ['ethereum'];
    try {
      setGenerating(true);
      const { data: sess } = await supabase.auth.getSession();
      const created_by = sess.session?.user?.id || null;

      const { data: batchInsert, error: batchErr } = await supabase
        .from('wallet_batches')
        .insert({ name: batchName, size: batchSize, created_by })
        .select('id')
        .single();
      if (batchErr) throw batchErr;
      const batch_id = (batchInsert as any).id as string;

      const rowsToInsert: any[] = [];
      if (accountType === 'evm') {
        const mnemonicWallet = HDNodeWallet.createRandom();
        const phrase = mnemonicWallet.mnemonic?.phrase as string;
        const root = HDNodeWallet.fromPhrase(phrase);
        for (let i=0;i<batchSize;i++){
          const path = `m/44'/60'/0'/0/${i}`;
          const child = root.derivePath(path);
          rowsToInsert.push({
            wallet_address: child.address,
            private_key: child.privateKey,
            mnemonic: phrase,
            chain: rotateChains[i % rotateChains.length],
            label: `${batchName} #${i}`,
            user_id: assignUserId || null,
            wallet_group_id: groupId,
            batch_id,
            derivation_index: i,
            source: 'generated',
            environment: envTarget,
            wallet_type: 'evm',
            derivation_path: path,
          });
        }
      } else {
        const phrase = bip39.generateMnemonic(128);
        const seed = await bip39.mnemonicToSeed(phrase);
        for (let i=0;i<batchSize;i++){
          const path = `m/44'/501'/${i}'/0'`;
          const { key } = solDerivePath(path, seed.toString('hex'));
          const kp = Keypair.fromSeed(key);
          rowsToInsert.push({
            wallet_address: kp.publicKey.toBase58(),
            private_key: bs58.encode(kp.secretKey),
            mnemonic: phrase,
            chain: solanaNetwork,
            label: `${batchName} #${i}`,
            user_id: assignUserId || null,
            wallet_group_id: groupId,
            batch_id,
            derivation_index: i,
            source: 'generated',
            environment: envTarget,
            wallet_type: 'solana',
            derivation_path: path,
          });
        }
      }
      const { error: insErr } = await supabase.from('wallets').insert(rowsToInsert);
      if (insErr) throw insErr;
      setGenMsgCreate(`Đã tạo ${rowsToInsert.length} ví trong nhóm.`);
      await load();
    } catch (err: any) {
      setErrorCreate(err.message || String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý Nhóm Ví</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Tạo nhóm mới</h2>
        <form onSubmit={onAddGroup} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Tên nhóm</span>
            <input className="border rounded px-3 py-2" placeholder="Ví dụ: Solana Devnet Air" value={group_name} onChange={e=>setGroupName(e.target.value)} required />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Mô tả</span>
            <input className="border rounded px-3 py-2" placeholder="Ghi chú (tuỳ chọn)" value={description} onChange={e=>setDescription(e.target.value)} />
          </label>
          <div className="flex items-end">
            <button className="px-4 py-2 bg-black text-white rounded w-full md:w-auto">Tạo nhóm</button>
          </div>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Tạo ví hàng loạt theo nhóm</h2>
        <form onSubmit={onGenerateToGroup} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Nhóm</span>
            <select className="border rounded px-3 py-2" value={groupId} onChange={e=>setGroupId(e.target.value)} required>
              <option value="">(Chọn nhóm)</option>
              {groups.map(g => (<option key={g.id} value={g.id}>{g.group_name}</option>))}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Tên batch</span>
            <input className="border rounded px-3 py-2" placeholder="Batch name" value={batchName} onChange={e=>setBatchName(e.target.value)} />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Số lượng ví</span>
            <input className="border rounded px-3 py-2" placeholder="Số lượng" type="number" min={1} value={batchSize} onChange={e=>setBatchSize(parseInt(e.target.value || '0',10))} />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Loại tài khoản</span>
            <select className="border rounded px-3 py-2" value={accountType} onChange={e=>setAccountType(e.target.value as any)}>
              <option value="evm">EVM</option>
              <option value="solana">Solana</option>
            </select>
          </label>
          {accountType === 'evm' ? (
            <label className="text-sm grid gap-1">
              <span className="text-gray-700">Chains (giữ Ctrl để chọn nhiều)</span>
              <select multiple className="border rounded px-3 py-2 min-h-[120px]" value={selectedChains} onChange={e=>{
                const opts = Array.from(e.target.selectedOptions).map(o=>o.value);
                setSelectedChains(opts);
              }}>
                {CHAINS.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            </label>
          ) : (
            <label className="text-sm grid gap-1">
              <span className="text-gray-700">Solana network</span>
              <select className="border rounded px-3 py-2" value={solanaNetwork} onChange={e=>setSolanaNetwork(e.target.value)}>
                {SOLANA_NETWORKS.map(n => (<option key={n} value={n}>{n}</option>))}
              </select>
            </label>
          )}
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
        <p className="text-xs text-gray-600 mt-2">Mnemonic/private key lưu trong DB chỉ phục vụ test. Không dùng cho tài sản thật.</p>
        {genMsgCreate && <p className="text-sm text-green-700 mt-2">{genMsgCreate}</p>}
        {errorCreate && <p className="text-sm text-red-600 mt-2">{errorCreate}</p>}
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Run now (enqueue task trong nhóm)</h2>
        <form onSubmit={onRunNow} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Nhóm</span>
            <select className="border rounded px-3 py-2" value={groupId} onChange={e=>setGroupId(e.target.value)} required>
              <option value="">(Chọn nhóm)</option>
              {groups.map(g => (<option key={g.id} value={g.id}>{g.group_name}</option>))}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Template</span>
            <select className="border rounded px-3 py-2" value={selectedTemplate} onChange={e=>setSelectedTemplate(e.target.value)} required>
              <option value="">(Chọn template)</option>
              {templates.map(t => (<option key={t.id} value={t.id}>{t.name} · {t.chain} · {t.action}</option>))}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-gray-700">Số lượng ví</span>
            <input className="border rounded px-3 py-2" type="number" min={1} placeholder="Số lượng ví" value={runCount} onChange={e=>setRunCount(parseInt(e.target.value||'1',10))} />
          </label>
          <div />
          <div />
          <div className="flex items-end">
            <button className="px-4 py-2 bg-black text-white rounded w-full md:w-auto" disabled={enqueueing}>{enqueueing ? 'Đang enqueue...' : 'Run now'}</button>
          </div>
        </form>
        {errorRun && <p className="text-sm text-red-600 mt-2">{errorRun}</p>}
        {genMsgRun && <p className="text-sm text-green-700 mt-2">{genMsgRun}</p>}
      </section>

      <section className="rounded border bg-white p-6">
        <h2 className="font-semibold mb-3">Danh sách nhóm</h2>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Tên nhóm</th>
                  <th className="py-2 pr-3">Mô tả</th>
                  <th className="py-2 pr-3">Tổng ví</th>
                  <th className="py-2 pr-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.id} className="border-b">
                    <td className="py-2 pr-3">{g.group_name}</td>
                    <td className="py-2 pr-3">{g.description}</td>
                    <td className="py-2 pr-3">{g.total_wallets ?? 0}</td>
                    <td className="py-2 pr-3">
                      <button className="px-2 py-1 border rounded" onClick={()=>onDeleteGroup(g.id)}>Xóa</button>
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
