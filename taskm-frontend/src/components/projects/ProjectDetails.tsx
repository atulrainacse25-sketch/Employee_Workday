import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useProjects, Project as ProjectType } from '../../contexts/ProjectContext';
import { X, Trash } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useTasks } from '../../contexts/useTasks';

export const ProjectDetails: React.FC<{ projectId: number; onClose: () => void }> = ({ projectId, onClose }) => {
  const { getProject, removeMember } = useProjects();
  const { state: authState } = useAuth();
  const tasksCtx = useTasks();
  const isAdmin = authState.user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  type Member = { id:number; name:string; email?:string; avatar?:string; role?:string; status?:string };
  type TaskShort = { id:number; title:string; status?:string; assigned_to?:string; assignee_name?:string; priority?:string; due_date?:string };
  const [data, setData] = useState<{ project?: ProjectType | null; tasks?: TaskShort[]; members?: Member[] } | null>(null);
  const [tab, setTab] = useState<'overview'|'users'|'tasks'|'activity'>('overview');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProject(projectId) as { project?: ProjectType | null; tasks?: TaskShort[]; members?: Member[] };
      setData({ project: res.project || null, tasks: res.tasks || [], members: res.members || [] });
    } catch (e) {
      console.error('Failed to load project', e);
    } finally { setLoading(false); }
  }, [getProject, projectId]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh when tasks change elsewhere (e.g., TaskList edits)
  useEffect(() => {
    if (tasksCtx.state.loading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksCtx.state.tasks]);

  // Close on Escape for better UX
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onRemove = async (userId: number) => {
    if (!window.confirm('Remove member from project?')) return;
    try {
      await removeMember(projectId, userId);
      await load();
    } catch (e) { console.error(e); }
  };

  if (!data && loading) return null;

  const totalTasks = (data?.tasks || []).length;
  const completedTasks = (data?.tasks || []).filter(t => String(t.status || '').toLowerCase() === 'completed' || String(t.status || '').toLowerCase() === 'done').length;
  const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const startDate = (data?.project as any)?.start_date;
  const endDate = (data?.project as any)?.end_date;

  // Helpers: initials and palette for colorful chips
  const getInitials = (name?: string, email?: string) => {
    const base = (name && name.trim()) || (email && email.split('@')[0]) || '';
    if (!base) return 'NA';
    const parts = base.split(/\s+/).filter(Boolean);
    const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : base.slice(0, 2);
    return letters.toUpperCase();
  };
  const palette = [
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
  ];

  const githubFromDescription = () => {
    const d = (data?.project as any)?.description || '';
    const m = d.match(/https?:\/\/[^\s]+github\.com\/[^\s]*/i);
    return m ? m[0] : '';
  };

  const toUiStatus = (s?: string) => {
    const v = String(s || '').toLowerCase();
    if (v === 'in-progress' || v === 'ongoing') return 'Ongoing';
    if (v === 'completed' || v === 'done') return 'Completed';
    return 'Pending';
  };
  const statusCls = (s?: string) => {
    const label = toUiStatus(s);
    if (label === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (label === 'Ongoing') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };
  const priorityCls = (p?: string) => {
    const v = String(p || '').toLowerCase();
    if (v === 'high') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (v === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };
  const fmtDate = (d?: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 truncate">{data?.project?.name}</h3>
              {data?.project?.description && (
                <div className="text-sm text-slate-500 truncate">{data?.project?.description}</div>
              )}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {(data?.members || []).slice(0,8).map((m:any, idx:number)=> (
                  <span
                    key={m.id}
                    title={m.name}
                    className={`px-2 py-1 rounded-full text-xs font-semibold border ${palette[idx % palette.length]}`}
                  >
                    {getInitials(m.name, m.email)}
                  </span>
                ))}
                {isAdmin && (
                  <button onClick={()=>setShowAdd(true)} className="px-2.5 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700">Add members</button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <div className="text-xs text-slate-500 mb-1">Progress {completedTasks}/{totalTasks}</div>
                <div className="w-40 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"><X /></button>
            </div>
          </div>

          <div className="p-5">
            <div className="flex gap-2 border-b pb-3 text-sm">
              {(['overview','users','tasks','activity'] as const).map(k => (
                <button key={k} onClick={()=>setTab(k)} className={`px-3 py-1.5 rounded-full ${tab===k ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{k.charAt(0).toUpperCase()+k.slice(1)}</button>
              ))}
            </div>

            <div className="mt-4">
              {tab === 'overview' && (
                <div className="space-y-2 text-sm">
                  {(startDate || endDate) && (
                    <div className="text-slate-600">Start: {startDate || '-'} • End: {endDate || '-'}</div>
                  )}
                  <div>Tasks: {completedTasks} / {totalTasks}</div>
                  {githubFromDescription() && (
                    <div className="pt-2">
                      <a href={githubFromDescription()} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open GitHub</a>
                    </div>
                  )}
                </div>
              )}

              {tab === 'users' && (
                <div>
                  <div className="space-y-3">
                    {(data?.members || []).map((m: { id:number; name:string; email?:string; avatar?:string }) => (
                      <div key={m.id} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <div className="flex items-center gap-3"><span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{getInitials(m.name, m.email)}</span> <div>{m.name}<div className="text-xs text-slate-500">{m.email}</div></div></div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => onRemove(m.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Remove"><Trash className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'tasks' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-500">
                      <tr>
                        <th className="py-2">Title</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Assigned</th>
                        <th className="py-2">Priority</th>
                        <th className="py-2">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.tasks || []).map((t: TaskShort) => (
                        <tr key={t.id} className="border-t">
                          <td className="py-2 pr-3 max-w-[320px] truncate">{t.title}</td>
                          <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${statusCls(t.status)}`}>{toUiStatus(t.status)}</span></td>
                          <td className="py-2 pr-3">{t.assigned_to || t.assignee_name || '—'}</td>
                          <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${priorityCls(t.priority)}`}>{String(t.priority || 'low')}</span></td>
                          <td className="py-2">{fmtDate(t.due_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'activity' && (
                <div className="text-sm text-slate-500">No recent activity.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showAdd && (
        <AddMembersModalPD
          projectId={projectId}
          existingMembers={(data?.members || []) as any}
          onClose={async ()=>{ setShowAdd(false); await load(); }}
        />
      )}
    </>
  );
};

export default ProjectDetails;

// Local Add Members modal used from ProjectDetails
export function AddMembersModalPD({ projectId, existingMembers, onClose }: { projectId: number; existingMembers: Array<{ id:number; name:string; avatar?:string }>; onClose: () => void }) {
  const projCtx = useProjects();
  const [users, setUsers] = useState<Array<{ id:number; name:string; email?:string }>>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axios.get('/api/users', { withCredentials: true, timeout: 5000 });
        if (!cancelled) setUsers(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setUsers([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = users
    .filter(u => !existingMembers.some((m:any) => Number(m.id) === Number(u.id)))
    .filter(u => (u.name || '').toLowerCase().includes(search.toLowerCase()));

  const toggle = (id:number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

  const add = async () => {
    if (!selectedIds.length) return onClose();
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await (projCtx as any).addMember(projectId, id, 'member');
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-white rounded-xl shadow-xl border" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Add members</span>
          <button onClick={onClose} className="text-sm text-gray-500">Close</button>
        </div>
        <div className="p-4 space-y-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users" className="w-full px-3 py-2 border rounded" />
          <div className="max-h-80 overflow-auto divide-y rounded border">
            {filtered.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={()=>toggle(u.id)} />
                <span className="flex-1 truncate">{u.name} <span className="text-gray-400">{u.email}</span></span>
              </label>
            ))}
            {filtered.length===0 && (
              <div className="p-4 text-sm text-gray-500">No users found</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
            <button onClick={add} disabled={loading || selectedIds.length===0} className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-60">{loading ? 'Adding...' : 'Add selected'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}


