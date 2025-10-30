import 'cross-fetch/dist/node-polyfill.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '10000', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10', 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// =============== Utilities ===============
function substitutePlaceholders(input, wallet) {
  if (!input) return input;
  const addr = wallet?.wallet_address || '';
  const pk = wallet?.private_key || '';
  const mnemonic = wallet?.mnemonic || '';
  const chain = wallet?.chain || '';
  if (typeof input === 'string') {
    return input
      .replace(/\{\{wallet\.address\}\}/g, addr)
      .replace(/\{\{wallet\.private_key\}\}/g, pk)
      .replace(/\{\{wallet\.mnemonic\}\}/g, mnemonic)
      .replace(/\{\{wallet\.chain\}\}/g, chain);
  }
  if (Array.isArray(input)) {
    return input.map(v => substitutePlaceholders(v, wallet));
  }
  if (typeof input === 'object') {
    const out = {};
    for (const k of Object.keys(input)) out[k] = substitutePlaceholders(input[k], wallet);
    return out;
  }
  return input;
}

function parseTemplateParams(raw) {
  // params có thể là object hoặc chuỗi JSON
  if (!raw) return {};
  if (typeof raw === 'object') return raw || {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// =============== Actions ===============
async function runHttpRequest(template, wallet) {
  const params = parseTemplateParams(template?.params);
  const method = (params.method || 'GET').toUpperCase();
  let url = params.url || params.endpoint || '';
  let headers = params.headers || {};
  let body = params.body;

  // Thay placeholder bằng dữ liệu ví
  url = substitutePlaceholders(url, wallet);
  headers = substitutePlaceholders(headers, wallet) || {};
  body = substitutePlaceholders(body, wallet);

  const fetchOpts = { method, headers };
  if (body !== undefined && body !== null && method !== 'GET') {
    if (typeof body === 'object' && !(headers && headers['Content-Type'])) {
      headers['Content-Type'] = 'application/json';
    }
    fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOpts);
  const text = await res.text();
  const info = text.slice(0, 1000);
  if (!res.ok) {
    return { ok: false, info: `HTTP ${res.status}: ${info}` };
  }
  return { ok: true, info };
}

async function fetchPendingRuns(limit) {
  const { data, error } = await supabase
    .from('task_runs')
    .select('id, template_id, wallet_id, wallet_group_id, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function getTemplate(templateId) {
  const { data, error } = await supabase
    .from('task_templates')
    .select('id, name, chain, wallet_type, action, params')
    .eq('id', templateId)
    .single();
  if (error) throw error;
  return data;
}

async function getWallet(walletId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('id, wallet_address, private_key, mnemonic, wallet_type, chain, derivation_index')
    .eq('id', walletId)
    .single();
  if (error) throw error;
  return data;
}

async function markProcessing(runId) {
  const { error } = await supabase
    .from('task_runs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', runId);
  if (error) throw error;
}

async function markSuccess(runId, txHash = null, gasUsed = null, feePaid = null) {
  const { error } = await supabase
    .from('task_runs')
    .update({ status: 'success', tx_hash: txHash, gas_used: gasUsed, fee_paid: feePaid, finished_at: new Date().toISOString() })
    .eq('id', runId);
  if (error) throw error;
}

async function markFailed(runId, message) {
  const { error } = await supabase
    .from('task_runs')
    .update({ status: 'failed', error_message: String(message), finished_at: new Date().toISOString() })
    .eq('id', runId);
  if (error) throw error;
}

async function handleRun(run) {
  try {
    await markProcessing(run.id);
    const template = await getTemplate(run.template_id);
    const wallet = run.wallet_id ? await getWallet(run.wallet_id) : null;

    // Router theo action của template
    if (template.action === 'http_request') {
      const { ok, info } = await runHttpRequest(template, wallet);
      if (!ok) throw new Error(info || 'HTTP request failed');
      await markSuccess(run.id, null, null, null);
    } else if (template.action === 'evm_swap_0x') {
      // Placeholder cho triển khai sau
      await markSuccess(run.id, null, null, null);
    } else if (template.action === 'sol_swap_jupiter') {
      // Placeholder cho triển khai sau
      await markSuccess(run.id, null, null, null);
    } else {
      // Không biết action: đánh failed để dev bổ sung
      throw new Error(`Unsupported action: ${template.action}`);
    }
  } catch (err) {
    await markFailed(run.id, err.message || String(err));
  }
}

async function loop() {
  while (true) {
    try {
      const runs = await fetchPendingRuns(BATCH_SIZE);
      for (const r of runs) {
        // xử lý tuần tự để dễ quan sát, có thể đổi sang Promise.allSettled khi ổn định
        await handleRun(r);
      }
    } catch (e) {
      console.error('Worker loop error:', e);
    }
    await new Promise(res => setTimeout(res, POLL_INTERVAL_MS));
  }
}

loop();
