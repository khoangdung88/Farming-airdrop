"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Project = {
  id: string;
  name: string;
  status: string | null;
  chain: string | null;
  description?: string | null;
};
type TaskRow = { id:string; task_name:string|null; task_type:string|null; is_active:boolean|null; created_at:string|null };
type Template = { id:string; name:string; action:string; chain:string };

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;
  const [data, setData] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('active');
  const [chain, setChain] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskType, setNewTaskType] = useState('generic');
  const [templateId, setTemplateId] = useState('');
  const [newTaskActive, setNewTaskActive] = useState(true);

  useEffect(() => {
    (async () => {
      const [projRes, tasksRes, tplRes] = await Promise.all([
        supabase.from('projects').select('id,name,status,chain,description').eq('id', id).maybeSingle(),
        supabase.from('tasks').select('id,task_name,task_type,is_active,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(200),
        supabase.from('task_templates').select('id,name,action,chain').order('created_at', { ascending: false }).limit(200)
      ]);
      if (projRes.error) setError(projRes.error.message);
      const data = projRes.data as any;
      if (data) {
        setData(data as Project);
        setName(data.name || '');
        setStatus((data.status as string) || 'active');
        setChain((data.chain as string) || '');
        setDescription((data.description as string) || '');
      }
      setTasks(tasksRes.data || []);
      setTemplates(tplRes.data || []);
      setLoading(false);
    })();
  }, [id]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase
      .from('projects')
      .update({ name, status, chain, description })
      .eq('id', id);
    if (error) setError(error.message);
    else router.replace('/admin/projects');
  };

  const onAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('tasks').insert({ project_id: id, task_name: newTaskName, task_type: newTaskType, is_active: newTaskActive });
    if (error) setError(error.message);
    else {
      setNewTaskName(''); setNewTaskType('generic'); setTemplateId(''); setNewTaskActive(true);
      const { data } = await supabase.from('tasks').select('id,task_name,task_type,is_active,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(200);
      setTasks(data || []);
    }
  };

  if (loading) return <main className="p-6 max-w-6xl mx-auto">Đang tải...</main>;
  if (!data) return <main className="p-6 max-w-6xl mx-auto">Không tìm thấy project.</main>;

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sửa Project</h1>
        <Link href="/admin/projects" className="text-sm underline">← Quay lại danh sách</Link>
      </header>

      <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
        <div>
          <button className="px-3 py-2 bg-black text-white rounded">Lưu</button>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </form>

      <section className="rounded border bg-white p-4 space-y-3">
        <h2 className="font-semibold">Tasks của project</h2>
        <form onSubmit={onAddTask} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <select className="border rounded px-3 py-2" value={templateId} onChange={e=>{
            const v = e.target.value; setTemplateId(v);
            const tpl = templates.find(t=>t.id===v);
            if (tpl) { setNewTaskName(tpl.name); setNewTaskType(tpl.action); }
          }}>
            <option value="">(chọn từ Template - tùy chọn)</option>
            {templates.map(t => (<option key={t.id} value={t.id}>{t.name} ({t.chain})</option>))}
          </select>
          <input className="border rounded px-3 py-2" placeholder="Task name" value={newTaskName} onChange={e=>setNewTaskName(e.target.value)} required />
          <input className="border rounded px-3 py-2" placeholder="Task type" value={newTaskType} onChange={e=>setNewTaskType(e.target.value)} />
          <select className="border rounded px-3 py-2" value={newTaskActive ? '1':'0'} onChange={e=>setNewTaskActive(e.target.value==='1')}>
            <option value="1">active</option>
            <option value="0">inactive</option>
          </select>
          <div className="md:col-span-2" />
          <button className="px-3 py-2 bg-black text-white rounded">Thêm Task</button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Task</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Active</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(r => (
                <tr key={r.id} className="border-b">
                  <td className="py-2 pr-3">{r.task_name}</td>
                  <td className="py-2 pr-3">{r.task_type}</td>
                  <td className="py-2 pr-3">{r.is_active ? 'active':'inactive'}</td>
                  <td className="py-2 pr-3">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
