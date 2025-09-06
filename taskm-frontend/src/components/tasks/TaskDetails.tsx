import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../../contexts/useTasks';
import { useProjects } from '../../contexts/ProjectContext';
import { Calendar, User, AlertCircle, Clock, Edit3, Trash2, ArrowLeft, Link as LinkIcon } from 'lucide-react';

export const TaskDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, deleteTask } = useTasks();
  const { projects } = useProjects();

  const task = state.tasks.find(t => String(t.id) === String(id));
  const project = projects?.find(p => String(p.id) === String((task as any)?.projectId));

  if (!task) {
    return (
      <div className="p-6">
        <button className="inline-flex items-center gap-2 text-sm text-gray-600 mb-4" onClick={()=>navigate(-1)}><ArrowLeft className="w-4 h-4"/>Back</button>
        <div className="bg-white rounded-xl p-6 shadow">Task not found.</div>
      </div>
    );
  }

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const formatMinutes = (mins?: number | null) => {
    if (typeof mins !== 'number' || isNaN(mins) || mins < 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2,'0')}h${String(m).padStart(2,'0')}m`;
  };

  const statusInfo = (s: string) => {
    if (s === 'completed') return { label: 'COMPLETED', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (s === 'ongoing') return { label: 'ONGOING', cls: 'text-blue-700 bg-blue-50 border-blue-200' };
    return { label: 'PENDING', cls: 'text-amber-700 bg-amber-50 border-amber-200' };
  };

  const totalEstimate = (task.estimatedMinutes ?? 0) + (((task as any).substitutedMinutes ?? 0) as number);

  return (
    <div className="p-6">
      <button className="inline-flex items-center gap-2 text-sm text-gray-600 mb-4" onClick={()=>navigate(-1)}><ArrowLeft className="w-4 h-4"/>Back</button>
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-full border ${statusInfo(task.status).cls} mb-2`}>{statusInfo(task.status).label}</div>
            <h1 className="text-2xl font-semibold text-gray-900 truncate">{task.title}</h1>
            {task.description && (
              <p className="mt-2 text-gray-700 whitespace-pre-line">{task.description}</p>
            )}
            {!task.description && <p className="mt-2 text-gray-500">No description</p>}
            <div className="mt-3 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">E</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200">{formatMinutes(totalEstimate)}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">A</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">{formatMinutes(task.actualMinutes as any)}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={()=>navigate('/tasks?edit='+encodeURIComponent(String(task.id)))} className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <span className="inline-flex items-center gap-1 text-sm"><Edit3 className="w-4 h-4"/> Edit</span>
            </button>
            <button onClick={()=>{ if(window.confirm('Delete this task?')) { deleteTask(String(task.id)); navigate('/tasks'); } }} className="px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
              <span className="inline-flex items-center gap-1 text-sm"><Trash2 className="w-4 h-4"/> Delete</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-700"><User className="w-4 h-4"/> Assignee: <span className="font-medium">{task.assigneeName || (task.assigneeId ? `User ${task.assigneeId}` : '—')}</span></div>
            <div className="flex items-center gap-2 text-gray-700"><Calendar className="w-4 h-4"/> Due: <span className="font-medium">{formatDate(task.dueDate)}</span></div>
            <div className="flex items-center gap-2 text-gray-700"><AlertCircle className="w-4 h-4"/> Priority: <span className="font-medium capitalize">{task.priority}</span></div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-700"><AlertCircle className="w-4 h-4"/> Project: <span className="font-medium">{project?.name || 'No Project'}</span></div>
            <div className="flex items-center gap-2 text-gray-700"><Clock className="w-4 h-4"/> Estimated (incl. added): <span className="font-medium">{formatMinutes(totalEstimate)}</span></div>
            <div className="flex items-center gap-2 text-gray-700"><Clock className="w-4 h-4"/> Actual: <span className="font-medium">{formatMinutes(task.actualMinutes as any)}</span></div>
          </div>
        </div>

        {task.githubLink && (
          <div className="mt-6 pt-4 border-t">
            <a href={task.githubLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline">
              <LinkIcon className="w-4 h-4"/> Open related link
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetails;

