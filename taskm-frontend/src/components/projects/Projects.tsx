import React, { useMemo, useState, useEffect } from 'react';
import { useProjects, Project as ProjectType, ProjectContextValue } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/useAuth';
import axios from 'axios';
import { ProjectModal } from './ProjectModal';
import { ProjectDetails } from './ProjectDetails';
import { useTasks } from '../../contexts/useTasks';

export default function ProjectsUI(): JSX.Element {
  const projCtx = useProjects() as ProjectContextValue;
  const deleteProject = projCtx?.deleteProject;
  const { state: authState } = useAuth();
  const tasksCtx = useTasks();
  const isAdmin = authState.user?.role === 'admin';

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All'|'Active'|'Completed'|'Archived'>('All');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectType | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showMembersFor, setShowMembersFor] = useState<number | null>(null);

  // Auto-refresh projects when tasks mutate so counts stay accurate
  useEffect(() => {
    (async () => {
      try {
        await projCtx.fetchMyProjects();
      } catch {
        /* ignore */
      }
    })();
  }, [tasksCtx.state.tasks]);

  const filtered = useMemo(() => {
    const projects: ProjectType[] = projCtx?.projects || [];
    const q = query.trim().toLowerCase();
    return projects.filter(p => {
      const name = (p.name || '').toLowerCase();
      const matchesSearch = q === '' || name.includes(q);
      const status = (() => {
        // Derive a UI status when backend doesn't provide one
        const raw = (p as any).status as string | undefined;
        if (raw) return raw;
        const total = (p as any).tasks_total ?? 0;
        const completed = (p as any).tasks_completed ?? 0;
        if (total > 0 && completed >= total) return 'Completed';
        return 'Active';
      })();
      const matchesStatus = statusFilter === 'All' || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projCtx?.projects, query, statusFilter]);

  const formatDate = (d?: string) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString();
  };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white rounded-full shadow px-2 py-1">
            <input
              aria-label="Search projects"
              placeholder="Search projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="outline-none px-2"
            />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button className={`px-3 py-2 rounded-2xl ${statusFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-600'}`} onClick={() => setStatusFilter('All')}>All</button>
            <button className={`px-3 py-2 rounded-2xl ${statusFilter === 'Active' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-600'}`} onClick={() => setStatusFilter('Active')}>Active</button>
            <button className={`px-3 py-2 rounded-2xl ${statusFilter === 'Completed' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-600'}`} onClick={() => setStatusFilter('Completed')}>Completed</button>
            <button className={`px-3 py-2 rounded-2xl ${statusFilter === 'Archived' ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-600'}`} onClick={() => setStatusFilter('Archived')}>Archived</button>
          </div>
        </div>

        <div>
          {isAdmin && (
            <button
              onClick={() => { setEditingProject(null); setShowProjectModal(true); }}
              className="rounded-2xl px-4 py-2 bg-blue-600 text-white"
            >
              + New Project
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((project) => (
          <div key={project.id} className="bg-white rounded-2xl shadow hover:shadow-lg transition-all cursor-pointer p-5" onClick={()=>setDetailId(project.id)}>
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">{project.name}</h2>
                <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
                {/* Members initials chips */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {((project as any).members || []).slice(0,4).map((m: any, idx: number) => (
                    <span key={m.id || idx} className={`px-2 py-1 rounded-full text-xs font-semibold border ${palette[idx % palette.length]}`}>{getInitials(m.name, m.email)}</span>
                  ))}
                </div>
              </div>
              {(() => {
                const st = (project as any).status || (((project as any).tasks_total ?? 0) > 0 && ((project as any).tasks_completed ?? 0) >= ((project as any).tasks_total ?? 0) ? 'Completed' : 'Active');
                const cls = st === 'Completed' ? 'bg-gray-100 text-gray-700' : st === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
                return <span className={`px-2 py-1 text-xs rounded-full font-medium ${cls}`}>{st}</span>;
              })()}
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>{formatDate((project as any).start_date)} – {formatDate((project as any).end_date)}</span>
              <span className="font-medium text-gray-700">{(project as any).tasks_completed || 0}/{(project as any).tasks_total || 0} Tasks Completed</span>
            </div>

            <div className="flex items-center mt-4 justify-end">
              {isAdmin && (
                <button onClick={(e)=>{ e.stopPropagation(); setShowMembersFor(project.id); }} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow" title="Add members">+</button>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={(e) => { e.stopPropagation(); setDetailId(project.id); }}
                className="px-3 py-1 border rounded text-sm"
              >
                View
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingProject(project); setShowProjectModal(true); }}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteConfirmation(project.id); }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Members Modal */}
      {isAdmin && showMembersFor && (
        <AddMembersModal
          projectId={showMembersFor}
          onClose={async () => { setShowMembersFor(null); await projCtx.fetchMyProjects(); }}
          existingMembers={(projCtx.projects.find(p=>p.id===showMembersFor)?.members as any) || []}
        />
      )}

      {detailId && (
        <ProjectDetails projectId={detailId} onClose={() => setDetailId(null)} />
      )}

      <ProjectModal open={showProjectModal} onClose={() => { setShowProjectModal(false); setEditingProject(null); }} project={editingProject} />
    </div>
  );

  function onDeleteConfirmation(id:number) {
    if (window.confirm('Delete project? This action cannot be undone.')) {
      deleteProject?.(id).catch(console.error);
    }
  }
}


function AddMembersModal({ projectId, onClose, existingMembers }: { projectId: number; onClose: () => void; existingMembers: Array<{ id:number; name:string; avatar?:string }> }) {
  const [users, setUsers] = useState<Array<{ id:number; name:string; email?:string }>>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const projCtx = useProjects();

  React.useEffect(() => {
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
    .filter(u => u.name?.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id:number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  };

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

