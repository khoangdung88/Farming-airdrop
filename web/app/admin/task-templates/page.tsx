"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type TemplateRow = {
  id: string;
  name: string;
  chain: string;
  wallet_type: string;
  action: string;
  is_active: boolean;
  created_at: string;
  params: any;
};

export default function AdminTaskTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'evm_swap_0x' | 'sol_swap_jupiter' | 'http_request'>('evm_swap_0x');
  const [chain, setChain] = useState('base-sepolia');
  const [isActive, setIsActive] = useState(true);

  // Params
  const [sellToken, setSellToken] = useState('WETH');
  const [buyToken, setBuyToken] = useState('USDC');
  const [inputMint, setInputMint] = useState('So11111111111111111111111111111111111111112');
  const [outputMint, setOutputMint] = useState('Es9vMFrzaCER9a');
  const [minAmount, setMinAmount] = useState('0.00001');
  const [maxAmount, setMaxAmount] = useState('0.00002');
  const [slippageBps, setSlippageBps] = useState(50);

  // HTTP request params
  const [httpUrl, setHttpUrl] = useState('https://httpbin.org/post');
  const [httpMethod, setHttpMethod] = useState<'GET'|'POST'|'PUT'|'PATCH'|'DELETE'>('POST');
  const [httpHeaders, setHttpHeaders] = useState('{"content-type":"application/json"}');
  const [httpBody, setHttpBody] = useState('{"address":"{{wallet.address}}","chain":"{{wallet.chain}}"}');

  const EVM_TESTNETS = ['base-sepolia','arbitrum-sepolia','op-sepolia','polygon-amoy','zksync-sepolia'];
  const SOL_NETWORKS = ['solana-devnet','solana-testnet'];

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('task_templates')
      .select('id,name,chain,wallet_type,action,is_active,created_at,params')
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
    let payload:any = {
      name,
      chain,
      wallet_type: kind === 'evm_swap_0x' ? 'evm' : (kind === 'sol_swap_jupiter' ? 'solana' : 'evm'),
      action: kind,
      is_active: isActive,
      params: {}
    };
    if (kind === 'evm_swap_0x') {
      payload.params = { sellToken, buyToken, minAmount, maxAmount, slippageBps };
    } else if (kind === 'sol_swap_jupiter') {
      payload.params = { inputMint, outputMint, minAmount, maxAmount, slippageBps };
    } else {
      let headersObj:any = {};
      let bodyObj:any = undefined;
      try { headersObj = JSON.parse(httpHeaders || '{}'); } catch {}
      try { bodyObj = httpBody ? JSON.parse(httpBody) : undefined; } catch {}
      payload.params = { method: httpMethod, url: httpUrl, headers: headersObj, body: bodyObj };
    }
    const { error } = await supabase.from('task_templates').insert(payload);
    if (error) setError(error.message);
    else { setName(''); await load(); }
  };

  const toggleActive = async (id: string, v: boolean) => {
    setError(null);
    const { error } = await supabase.from('task_templates').update({ is_active: v }).eq('id', id);
    if (error) setError(error.message); else await load();
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('task_templates').delete().eq('id', id);
    if (error) setError(error.message); else await load();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Task Templates (Airdrop Free)</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-4 space-y-3">
        <h2 className="font-semibold">Tạo template</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <label className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">Template name</span>
            <input className="border rounded px-3 py-2" placeholder="Template name" value={name} onChange={e=>setName(e.target.value)} required />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">Type</span>
            <select className="border rounded px-3 py-2" value={kind} onChange={e=>setKind(e.target.value as any)}>
              <option value="evm_swap_0x">EVM swap (0x API)</option>
              <option value="sol_swap_jupiter">Solana swap (Jupiter)</option>
              <option value="http_request">HTTP request (generic faucet)</option>
            </select>
          </label>
          {kind === 'evm_swap_0x' ? (
            <label className="flex flex-col">
              <span className="text-xs text-gray-600 mb-1">Chain</span>
              <select className="border rounded px-3 py-2" value={chain} onChange={e=>setChain(e.target.value)}>
                {EVM_TESTNETS.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            </label>
          ) : kind === 'sol_swap_jupiter' ? (
            <label className="flex flex-col">
              <span className="text-xs text-gray-600 mb-1">Network</span>
              <select className="border rounded px-3 py-2" value={chain} onChange={e=>setChain(e.target.value)}>
                {SOL_NETWORKS.map(c => (<option key={c} value={c}>{c}</option>))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col">
              <span className="text-xs text-gray-600 mb-1">Chain</span>
              <input className="border rounded px-3 py-2" placeholder="Chain (vd: base-sepolia)" value={chain} onChange={e=>setChain(e.target.value)} />
            </label>
          )}
          <label className="flex flex-col">
            <span className="text-xs text-gray-600 mb-1">Status</span>
            <select className="border rounded px-3 py-2" value={isActive? '1':'0'} onChange={e=>setIsActive(e.target.value==='1')}>
              <option value="1">active</option>
              <option value="0">inactive</option>
            </select>
          </label>
          <div className="col-span-2" />

          {kind === 'evm_swap_0x' ? (
            <>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">sellToken</span>
                <input className="border rounded px-3 py-2" placeholder="sellToken (vd: WETH)" value={sellToken} onChange={e=>setSellToken(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">buyToken</span>
                <input className="border rounded px-3 py-2" placeholder="buyToken (vd: USDC)" value={buyToken} onChange={e=>setBuyToken(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">minAmount</span>
                <input className="border rounded px-3 py-2" placeholder="minAmount" value={minAmount} onChange={e=>setMinAmount(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">maxAmount</span>
                <input className="border rounded px-3 py-2" placeholder="maxAmount" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">slippageBps</span>
                <input className="border rounded px-3 py-2" placeholder="slippageBps" type="number" value={slippageBps} onChange={e=>setSlippageBps(parseInt(e.target.value||'0',10))} />
              </label>
            </>
          ) : kind === 'sol_swap_jupiter' ? (
            <>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">inputMint</span>
                <input className="border rounded px-3 py-2" placeholder="inputMint (SOL)" value={inputMint} onChange={e=>setInputMint(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">outputMint</span>
                <input className="border rounded px-3 py-2" placeholder="outputMint (USDC)" value={outputMint} onChange={e=>setOutputMint(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">minAmount</span>
                <input className="border rounded px-3 py-2" placeholder="minAmount" value={minAmount} onChange={e=>setMinAmount(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">maxAmount</span>
                <input className="border rounded px-3 py-2" placeholder="maxAmount" value={maxAmount} onChange={e=>setMaxAmount(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">slippageBps</span>
                <input className="border rounded px-3 py-2" placeholder="slippageBps" type="number" value={slippageBps} onChange={e=>setSlippageBps(parseInt(e.target.value||'0',10))} />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">URL</span>
                <input className="border rounded px-3 py-2" placeholder="URL" value={httpUrl} onChange={e=>setHttpUrl(e.target.value)} />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-600 mb-1">Method</span>
                <select className="border rounded px-3 py-2" value={httpMethod} onChange={e=>setHttpMethod(e.target.value as any)}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </label>
              <label className="flex flex-col md:col-span-2">
                <span className="text-xs text-gray-600 mb-1">Headers (JSON)</span>
                <textarea className="border rounded px-3 py-2" rows={3} placeholder="Headers (JSON)" value={httpHeaders} onChange={e=>setHttpHeaders(e.target.value)} />
              </label>
              <label className="flex flex-col md:col-span-2">
                <span className="text-xs text-gray-600 mb-1">Body (JSON)</span>
                <textarea className="border rounded px-3 py-2" rows={3} placeholder="Body (JSON)" value={httpBody} onChange={e=>setHttpBody(e.target.value)} />
              </label>
            </>
          )}
          <button className="px-3 py-2 bg-black text-white rounded">Tạo template</button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Danh sách templates</h2>
        {loading ? <p>Đang tải...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Chain</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-3">{r.name}</td>
                    <td className="py-2 pr-3">{r.chain}</td>
                    <td className="py-2 pr-3">{r.action}</td>
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
