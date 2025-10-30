"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type TaskRow = {
  id: string;
  project_id: string | null;
  task_name: string | null;
  task_type: string | null;
  is_active: boolean | null;
  created_at: string | null;
};
type Template = { id: string; name: string; action: string; chain: string };

export default function AdminTasksPage() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task_name, setTaskName] = useState('');
  const [task_type, setTaskType] = useState('generic');
  const [project_id, setProjectId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');

  const [projects, setProjects] = useState<{id:string; name:string}[]>([]);

  const load = async () => {
    setLoading(true);
    const [tasksRes, projsRes, tplRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id,project_id,task_name,task_type,is_active,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('projects')
        .select('id,name')
        .order('name', { ascending: true })
        .limit(200),
      supabase
        .from('task_templates')
        .select('id,name,action,chain')
        .order('created_at', { ascending: false })
        .limit(200)
    ]);
    if (tasksRes.error) setError(tasksRes.error.message);
    setRows(tasksRes.data || []);
    setProjects(projsRes.data || []);
    setTemplates(tplRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.from('tasks').insert({ task_name, task_type, project_id: project_id || null, is_active: isActive });
    if (error) setError(error.message);
    else { setTaskName(''); setTaskType('generic'); setProjectId(''); setIsActive(true); setTemplateId(''); await load(); }
  };

  const onDelete = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) setError(error.message); else await load();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý Tasks</h1>
        <Link href="/admin" className="text-sm underline">← Quay lại Admin</Link>
      </header>

      <section className="rounded border bg-white p-4">
        <h2 className="font-semibold mb-3">Thêm Task</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <select className="border rounded px-3 py-2" value={templateId} onChange={e=>{
            const v = e.target.value; setTemplateId(v);
            const tpl = templates.find(t=>t.id===v);
            if (tpl) { setTaskName(tpl.name); setTaskType(tpl.action); }
          }}>
            <option value="">(chọn từ Template - tùy chọn)</option>
            {templates.map(t => (<option key={t.id} value={t.id}>{t.name} ({t.chain})</option>))}
          </select>
          <input className="border rounded px-3 py-2" placeholder="Task name" value={task_name} onChange={e=>setTaskName(e.target.value)} required />
          <input className="border rounded px-3 py-2" placeholder="Task type" value={task_type} onChange={e=>setTaskType(e.target.value)} />
          <select className="border rounded px-3 py-2" value={project_id} onChange={e=>setProjectId(e.target.value)}>
            <option value="">(Không chọn project)</option>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
          <select className="border rounded px-3 py-2" value={isActive ? '1':'0'} onChange={e=>setIsActive(e.target.value==='1')}>
            <option value="1">active</option>
            <option value="0">inactive</option>
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
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Project</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-3">{r.task_name}</td>
                    <td className="py-2 pr-3">{r.task_type}</td>
                    <td className="py-2 pr-3">{projects.find(p=>p.id===r.project_id)?.name || r.project_id}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      <Link className="px-2 py-1 border rounded" href={`/admin/tasks/${r.id}`}>Sửa</Link>
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
