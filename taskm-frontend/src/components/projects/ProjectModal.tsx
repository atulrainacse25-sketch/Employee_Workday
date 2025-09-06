import React, { useState } from 'react';
import { useProjects } from '../../contexts/ProjectContext';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  project?: { id: number; name?: string; description?: string } | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ open, onClose, project = null }) => {
  const { createProject, updateProject } = useProjects();
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [github, setGithub] = useState<string>('');
  const [status, setStatus] = useState<'Active'|'Completed'|'Archived'|'On Hold'>('Active');

  React.useEffect(() => {
    setName(project?.name || '');
    setDescription(project?.description || '');
    setStartDate('');
    setEndDate('');
    setGithub('');
    setStatus('Active');
  }, [project, open]);

  if (!open) return null;

  const mergeGithubIntoDescription = (desc: string, gh: string): string => {
    if (!gh) return desc;
    if (/github\.com\//i.test(desc)) return desc; // already present
    return desc ? `${desc}\nGitHub: ${gh}` : `GitHub: ${gh}`;
  };

  const onCreate = async () => {
    setLoading(true);
    try {
      const descToSend = mergeGithubIntoDescription(description, github.trim());
      if (project) {
        await updateProject(project.id, { name, description: descToSend, startDate, endDate, status });
      } else {
        await createProject({ name, description: descToSend });
      }
      setName(''); setDescription('');
      onClose();
    } catch (err) {
      console.error(err);
      try { window.alert('Failed to save project'); } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{project ? 'Edit Project' : 'Create New Project'}</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="w-full p-3 border rounded-lg" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" className="w-full p-3 border rounded-lg" rows={3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Start date</label>
              <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-xs text-gray-600">End date</label>
              <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Status</label>
              <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="w-full p-2 border rounded-lg">
                <option>Active</option>
                <option>Completed</option>
                <option>Archived</option>
                <option>On Hold</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">GitHub link</label>
              <input value={github} onChange={(e)=>setGithub(e.target.value)} placeholder="https://github.com/org/repo" className="w-full p-2 border rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button>
            <button onClick={onCreate} disabled={loading || !name} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">{loading ? (project ? 'Saving...' : 'Creating...') : (project ? 'Save' : 'Create')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};


