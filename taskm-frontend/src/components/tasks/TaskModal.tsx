import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTasks } from '../../contexts/useTasks';
import { useAuth } from '../../contexts/useAuth';
import { Task } from '../../contexts/TaskContext';
import { X, Calendar, User, AlertCircle, Link } from 'lucide-react';
import { useProjects } from '../../contexts/ProjectContext';
import axios from 'axios';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
}

interface TaskForm {
  title: string;
  description: string;
  assigneeName: string;
  assigneeId?: string;
  projectId?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  githubLink?: string;
  estimatedMinutes: string;
  substitutedMinutes?: string;
  ongoingSpentMinutes?: string;
  completeAddedMinutes?: string;
  completeActualMinutes?: string;
  statusUI: 'pending' | 'ongoing' | 'completed';
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task }) => {
  const { createTask, updateTask } = useTasks();
  const { state: authState } = useAuth();
  const { projects } = useProjects();
  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<TaskForm>({
    defaultValues: { statusUI: 'pending' }
  });
  const statusUIValue = watch('statusUI') || 'pending';
  const assigneeIdValue = watch('assigneeId');
  const [normalUsers, setNormalUsers] = useState<{ id: number; name: string; role: string }[]>([]);
  const selectedAssigneeName = React.useMemo(() => {
    if (!assigneeIdValue) return undefined;
    const m = normalUsers.find(u => String(u.id) === String(assigneeIdValue));
    return m?.name;
  }, [assigneeIdValue, normalUsers]);

  const toDateInput = (value?: string): string => {
    if (!value) return '';
    // Accept already-YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // Try ISO -> YYYY-MM-DD
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  const toUIStatus = (s?: string): 'pending'|'ongoing'|'completed' => {
    if (s === 'in-progress') return 'ongoing';
    if (s === 'completed') return 'completed';
    return 'pending';
  };

  const toApiStatus = (s: 'pending'|'ongoing'|'completed'): 'todo'|'in-progress'|'completed' => {
    if (s === 'ongoing') return 'in-progress';
    if (s === 'completed') return 'completed';
    return 'todo';
  };

  const getDefaultsFromTask = (t?: Task | null): TaskForm => {
    if (!t) {
      return {
        title: '',
        description: '',
        assigneeName: '',
        assigneeId: '',
        projectId: '',
        priority: 'medium',
        dueDate: '',
        githubLink: '',
        estimatedMinutes: '',
        substitutedMinutes: '',
        ongoingSpentMinutes: '',
        completeAddedMinutes: '',
        completeActualMinutes: '0',
        statusUI: 'pending',
      };
    }
    return {
      title: t.title || '',
      description: t.description || '',
      assigneeName: t.assigneeName || '',
      assigneeId: t.assigneeId ? String(t.assigneeId) : '',
      projectId: (t as any).projectId ? String((t as any).projectId) : '',
      priority: (String(t.priority || 'medium').toLowerCase() as 'low'|'medium'|'high'),
      dueDate: toDateInput(t.dueDate),
      githubLink: t.githubLink || '',
      estimatedMinutes: t.estimatedMinutes != null ? String(t.estimatedMinutes) : '',
      substitutedMinutes: (t as any).substitutedMinutes != null ? String((t as any).substitutedMinutes) : '',
      ongoingSpentMinutes: '',
      completeAddedMinutes: '',
      completeActualMinutes: '0',
      statusUI: toUIStatus((t as any).status),
    };
  };

  useEffect(() => {
    if (!isOpen) return;
    const defaults = getDefaultsFromTask(task);
    reset(defaults);
    // ensure current assignee exists in admin list so select can show value
    if (authState.user?.role === 'admin' && defaults.assigneeId) {
      const aid = Number(defaults.assigneeId);
      if (!normalUsers.some(u => u.id === aid)) {
        setNormalUsers(prev => [{ id: aid, name: defaults.assigneeName || `User ${aid}` , role: 'user' }, ...prev]);
      }
    }
  }, [isOpen, task, reset]);

  // When admin opens modal, fetch list of normal users to populate assignee dropdown
  useEffect(() => {
    const shouldFetch = isOpen && authState.user?.role === 'admin';
    if (!shouldFetch) return;
    let cancelled = false;
    const fetchUsers = async () => {
      try {
        const res = await axios.get('/api/users', { withCredentials: true, timeout: 5000 });
        const users = Array.isArray(res.data) ? res.data : [];
        const onlyNormalUsers = users.filter((u: any) => String(u.role) === 'user');
        if (!cancelled) setNormalUsers(onlyNormalUsers);
      } catch (err) {
        console.debug('Failed to load users for assignee list');
        if (!cancelled) setNormalUsers([]);
      }
    };
    fetchUsers();
    return () => { cancelled = true; };
  }, [isOpen, authState.user?.role]);

  const onSubmit = async (data: TaskForm) => {
    // Ensure projectId is valid (exists) to prevent FK violation
    let safeProjectId: number | undefined = undefined;
    if (data.projectId && data.projectId !== '') {
      const pid = Number(data.projectId);
      const exists = Array.isArray(projects) && projects.some(p => Number(p.id) === pid);
      if (exists) safeProjectId = pid; // otherwise leave undefined
    }

    if (task) {
      const base: any = {
        ...task,
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate,
        githubLink: data.githubLink,
        assigneeId: data.assigneeId ? Number(data.assigneeId) : task.assigneeId,
        assigneeName:
          authState.user?.role === 'admin'
            ? data.assigneeId
              ? selectedAssigneeName || task.assigneeName
              : task.assigneeName
            : data.assigneeName,
        projectId:
          safeProjectId !== undefined ? safeProjectId : (task as any).projectId,
        estimatedMinutes: data.estimatedMinutes
          ? Number(data.estimatedMinutes)
          : task.estimatedMinutes,
      };
    
      const currentActual = (task as any).actualMinutes || 0;
      const currentSubstituted = (task as any).substitutedMinutes || 0;
    
      if (statusUIValue === 'ongoing') {
        const inc =
          parseInt(data.ongoingSpentMinutes ?? '0', 10) || 0;
        base.status = 'ongoing';
        base.actualMinutes = currentActual + inc;
    
      } else if (statusUIValue === 'completed') {
        const addedCompletionTime =
          parseInt(data.completeAddedMinutes ?? '0', 10) || 0;
        const extraActualTime =
          parseInt(data.completeActualMinutes ?? '0', 10) || 0;

        base.status = 'completed';

        // Add only the newly spent actual time to existing actual
        base.actualMinutes = currentActual + extraActualTime;
        // Added time contributes to substituted/estimate, not actual
        base.substitutedMinutes = currentSubstituted + addedCompletionTime;

      } else {
        base.status = '';
      }
    
      await updateTask(base as any);
    
      try {
        window.alert('Task updated successfully');
      } catch {}
    
      onClose();
      return;
    }
    
    
    const payload: any = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
      githubLink: data.githubLink,
      status: toApiStatus(statusUIValue),
      assigneeId: data.assigneeId ? Number(data.assigneeId) : (authState.user ? Number(authState.user.id) : undefined),
      assigneeName: authState.user?.role === 'admin' ? (selectedAssigneeName || undefined) : data.assigneeName,
      projectId: safeProjectId !== undefined ? safeProjectId : undefined,
      estimatedMinutes: data.estimatedMinutes ? Number(data.estimatedMinutes) : undefined,
    };
    if (statusUIValue==='ongoing') {
      const inc = data.ongoingSpentMinutes ? parseInt(data.ongoingSpentMinutes, 10) || 0 : 0;
      payload.status = 'in-progress';
      payload.actualMinutes = inc;
    }
    if (statusUIValue==='completed') {
      const add = data.completeAddedMinutes ? parseInt(data.completeAddedMinutes, 10) || 0 : 0;
      const act = data.completeActualMinutes ? parseInt(data.completeActualMinutes, 10) || 0 : 0;
      payload.status = 'completed';
      // For a new task going directly to completed, actual is just act
      payload.actualMinutes = act;
      if (add > 0) payload.substitutedMinutes = add;
    }
    if (payload.projectId === '') delete payload.projectId;
    try {
      await createTask(payload);
      try { window.alert('Task created successfully'); } catch {}
      onClose();
    } catch (e) {
      try { window.alert('Failed to create task'); } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task description"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Assignee and Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Assignee *
              </label>
              {authState.user?.role === 'admin' ? (
                <select
                  {...register('assigneeId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {normalUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name || `User ${u.id}`}</option>
                  ))}
                </select>
              ) : (
                <input
                  {...register('assigneeName', { required: 'Assignee is required' })}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter assignee name"
                />
              )}
              {errors.assigneeName && (
                <p className="text-red-500 text-sm mt-1">{errors.assigneeName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Priority *
              </label>
              <select
                {...register('priority', { required: 'Priority is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project (optional)
            </label>
            <select
              {...register('projectId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No Project</option>
              {(projects || []).map((p: any) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Estimated Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Time
            </label>
            <select
              {...register('estimatedMinutes')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No estimate</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hr</option>
              <option value="120">2 hr</option>
              <option value="180">3 hr</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setValue('statusUI', 'pending', { shouldDirty: true })} className={`px-3 py-1 rounded-full border transition ${statusUIValue==='pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'text-amber-600 hover:bg-amber-50'}`}>Pending</button>
              <button type="button" onClick={() => setValue('statusUI', 'ongoing', { shouldDirty: true })} className={`px-3 py-1 rounded-full border transition ${statusUIValue==='ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-blue-600 hover:bg-blue-50'}`}>Ongoing</button>
              <button type="button" onClick={() => setValue('statusUI', 'completed', { shouldDirty: true })} className={`px-3 py-1 rounded-full border transition ${statusUIValue==='completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-emerald-700 hover:bg-emerald-50'}`}>Completed</button>
            </div>
          </div>

          {/* Ongoing time capture */}
          {statusUIValue==='ongoing' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time spent now</label>
              <select {...register('ongoingSpentMinutes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Select time</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">1 hr</option>
                <option value="90">1 hr 30 min</option>
                <option value="120">2 hr</option>
                <option value="180">3 hr</option>
                <option value="240">4 hr</option>
                <option value="300">5 hr</option>
                <option value="360">6 hr</option>
              </select>
            </div>
          )}

          {/* Completion details */}
          {statusUIValue==='completed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Added Time</label>
                <select {...register('completeAddedMinutes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">0m</option>
                  <option value="15">15m</option>
                  <option value="30">30m</option>
                  <option value="45">45m</option>
                  <option value="60">1h</option>
                  <option value="90">1h 30m</option>
                  <option value="120">2h</option>
                  <option value="180">3h</option>
                  <option value="240">4h</option>
                  <option value="300">5h</option>
                  <option value="360">6h</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Actual Time</label>
                <select {...register('completeActualMinutes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="0">00h00m</option>
                  <option value="15">00h15m</option>
                  <option value="30">00h30m</option>
                  <option value="45">00h45m</option>
                  <option value="60">01h00m</option>
                  <option value="90">01h30m</option>
                  <option value="120">02h00m</option>
                  <option value="180">03h00m</option>
                  <option value="240">04h00m</option>
                  <option value="300">05h00m</option>
                  <option value="360">06h00m</option>
                </select>
              </div>
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date *
            </label>
            <input
              {...register('dueDate', { required: 'Due date is required' })}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.dueDate && (
              <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>
            )}
          </div>

          {/* GitHub Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Link className="w-4 h-4 inline mr-1" />
              GitHub Link (Optional)
            </label>
            <input
              {...register('githubLink')}
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://github.com/..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-white/80"></span>
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};