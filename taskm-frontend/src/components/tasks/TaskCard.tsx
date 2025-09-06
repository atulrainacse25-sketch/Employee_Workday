import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTasks } from '../../contexts/useTasks';
import { Task } from '../../contexts/TaskContext';
import { 
  Calendar, 
  User, 
  CheckSquare, 
  Edit3, 
  Trash2, 
  ExternalLink
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onOpen: () => void; // open details page
  isAdmin: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onOpen, isAdmin }) => {
  const { deleteTask, updateTask } = useTasks();
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAccentBorder = (status: string, priority: string) => {
    if (status === 'completed') return 'border-l-4 border-emerald-400';
    if (priority === 'high') return 'border-l-4 border-red-300';
    if (priority === 'medium') return 'border-l-4 border-amber-300';
    return 'border-l-4 border-gray-200';
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const formatMinutes = (mins?: number | null) => {
    const total = typeof mins === 'number' && !isNaN(mins) && mins >= 0 ? mins : 0;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m`;
  };

  // kept for potential future use; no leading status icon to avoid duplication

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
    }
  };

  // deprecated prompt kept earlier; replaced by inline form

  const [showStatusForm, setShowStatusForm] = React.useState(false);
  const [addedMinutes, setAddedMinutes] = React.useState<string>('0');
  const [actualMinutesInput, setActualMinutesInput] = React.useState<string>('0');

  const onStatusClick = () => {
    if (task.status === 'completed') {
      try { window.alert('Completed tasks cannot be re-opened.'); } catch {}
      return;
    }
    setShowStatusForm((s) => !s);
  };

  const confirmComplete = async () => {
    const add = parseInt(addedMinutes || '0', 10) || 0;
    const act = parseInt(actualMinutesInput || '0', 10) || 0;
    const current = (task.actualMinutes ?? 0) as number;
    const payload: any = {
      ...task,
      status: 'completed',
      actualMinutes: current + act,
      substitutedMinutes: ((task as any).substitutedMinutes || 0) + add,
    };
    await updateTask(payload as any);
    setShowStatusForm(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white rounded-xl p-4 shadow-sm border ${getAccentBorder(task.status, task.priority)} border-gray-200 hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); onOpen(); } }}
    >
      {/* optional drag handle removed */}

      {/* Action toolbar (top-right) */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <button onClick={(e)=>{ e.stopPropagation(); onStatusClick(); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50" title={task.status==='completed'?'Completed':'Mark as Completed'}>
          <CheckSquare className={`w-4 h-4 ${task.status==='completed'?'text-emerald-600':'text-gray-600'}`} />
        </button>
        <button onClick={(e)=>{ e.stopPropagation(); onEdit(); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50" title="Edit Task">
          <Edit3 className="w-4 h-4" />
        </button>
        {isAdmin && (
          <button onClick={(e)=>{ e.stopPropagation(); handleDelete(); }} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50" title="Delete Task">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        )}
        {task.githubLink && (
          <a href={task.githubLink} target="_blank" rel="noopener noreferrer" className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 text-blue-600" onClick={(e)=>e.stopPropagation()} title="Open GitHub">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Task Content */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="pr-28">{/* room for toolbar */}
            {/* Header row: Status → Estimated → Actual */}
            <div className="flex items-center gap-2 mb-2">
              {task.status === 'completed' ? (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  COMPLETED
                </span>
              ) : task.status === 'ongoing' ? (
                <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  ONGOING
                </span>
              ) : (
                <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  PENDING
                </span>
              )}
              {(() => {
                const totalEstimate = (task.estimatedMinutes ?? 0) + (((task as any).substitutedMinutes ?? 0) as number);
                return (
                  <>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">E</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200">{formatMinutes(totalEstimate)}</span>
                  </>
                );
              })()}
              {(task.status === 'completed' || task.status === 'ongoing') && (
                <>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">A</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">{formatMinutes(task.actualMinutes)}</span>
                </>
              )}
            </div>
            <h4 className="font-semibold text-gray-900 text-base leading-snug">{task.title}</h4>
            {/* no description on card */}
          </div>
          <div className="flex items-center gap-1"/>
        </div>

        {/* Priority and Time Badges with inline actions */}
        <div className="flex items-center justify-between pr-28">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
            {task.priority} priority
          </span>
          <div className="flex items-center gap-2" />
        </div>

        {/* Task Details */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>{task.assigneeName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>Due {formatDate(task.dueDate)}</span>
          </div>
          {task.githubLink && (
            <div className="flex items-center space-x-2">
              <ExternalLink className="w-4 h-4" />
              <a
                href={task.githubLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                GitHub Link
              </a>
            </div>
          )}
        </div>
      </div>
      {showStatusForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e)=>{ e.stopPropagation(); setShowStatusForm(false); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="text-base font-semibold mb-3">Complete Task</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Added time</label>
                <select value={addedMinutes} onChange={(e)=>setAddedMinutes(e.target.value)} className="px-3 py-1.5 border rounded text-sm">
                  <option value="0">0m</option>
                  <option value="15">15m</option>
                  <option value="30">30m</option>
                  <option value="45">45m</option>
                  <option value="60">1h</option>
                  <option value="90">1h 30m</option>
                  <option value="120">2h</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-700">Actual time</label>
                <select value={actualMinutesInput} onChange={(e)=>setActualMinutesInput(e.target.value)} className="px-3 py-1.5 border rounded text-sm">
                  <option value="0">00h00m</option>
                  <option value="15">00h15m</option>
                  <option value="30">00h30m</option>
                  <option value="45">00h45m</option>
                  <option value="60">01h00m</option>
                  <option value="90">01h30m</option>
                  <option value="120">02h00m</option>
                  <option value="180">03h00m</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setShowStatusForm(false)} className="px-3 py-1.5 border rounded text-sm">Cancel</button>
                <button type="button" onClick={confirmComplete} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm">Complete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};