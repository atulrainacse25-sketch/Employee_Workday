import React, { createContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: '' | 'ongoing' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigneeId: string | number;
  assigneeName: string;
  dueDate: string;
  githubLink?: string;
  projectId?: number | string | null;
  estimatedMinutes?: number | null;
  substitutedMinutes?: number | null;
  actualMinutes?: number | null;
  actualStartedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

type TaskAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'REORDER_TASKS'; payload: Task[] }
  | { type: 'SET_ERROR'; payload: string };

export const TaskContext = createContext<{
  state: TaskState;
  createTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (task: Task) => Promise<Task | void>;
  deleteTask: (id: string) => void;
  reorderTasks: (tasks: Task[]) => void;
} | null>(null);

const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload, loading: false };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    case 'REORDER_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    default:
      return state;
  }
};


export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, {
    tasks: [],
    loading: false,
    error: null,
  });

  const auth = useAuth();

  useEffect(() => {
    // wait until auth is initialized; only fetch when user is present
    if (!auth.state.initialized) return;
    if (!auth.state.user) return;

    const fetchTasks = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const res = await axios.get('/api/tasks', { withCredentials: true, timeout: 5000 });
        const apiToUi = (s?: string): '' | 'ongoing' | 'completed' => {
          if (s === 'in-progress') return 'ongoing';
          if (s === 'completed') return 'completed';
          return '';
        };
        const tasks = (res.data || []).map((t: any) => ({ ...t, status: apiToUi(t.status) }));
        dispatch({ type: 'SET_TASKS', payload: tasks });
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to fetch tasks' });
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch tasks' });
        }
      }
    };
    fetchTasks();
  }, [auth.state.initialized, auth.state.user]);

  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const uiToApi = (s: '' | 'ongoing' | 'completed'): 'todo' | 'in-progress' | 'completed' => (s === 'ongoing' ? 'in-progress' : s === 'completed' ? 'completed' : 'todo');
      const payload: any = { ...taskData, status: uiToApi(taskData.status as any) };
      const res = await axios.post('/api/tasks', payload, { withCredentials: true, timeout: 5000 });
      const apiToUi = (s?: string): '' | 'ongoing' | 'completed' => (s === 'in-progress' ? 'ongoing' : s === 'completed' ? 'completed' : '');
      const created = { ...res.data, status: apiToUi(res.data?.status) } as Task;
      dispatch({ type: 'ADD_TASK', payload: created });
      return created;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to create task' });
        throw new Error(error.response?.data?.message || 'Failed to create task');
      }
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create task' });
      throw new Error('Failed to create task');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateTask = async (task: Task) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Build a sanitized payload
      const toYmd = (v?: string) => {
        if (!v) return undefined;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        const d = new Date(v);
        if (isNaN(d.getTime())) return undefined;
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const uiToApi = (s: '' | 'ongoing' | 'completed'): 'todo' | 'in-progress' | 'completed' => (s === 'ongoing' ? 'in-progress' : s === 'completed' ? 'completed' : 'todo');
      const payload: any = {
        title: task.title,
        description: task.description,
        status: uiToApi(task.status),
        priority: task.priority,
        dueDate: toYmd(task.dueDate),
        githubLink: task.githubLink || null,
        assigneeId: task.assigneeId != null && task.assigneeId !== '' ? Number(task.assigneeId) : null,
        assigneeName: task.assigneeName || null,
        projectId: task.projectId != null && task.projectId !== '' ? Number(task.projectId) : null,
        estimatedMinutes: typeof task.estimatedMinutes === 'number' ? task.estimatedMinutes : undefined,
        actualMinutes: typeof task.actualMinutes === 'number' ? task.actualMinutes : undefined,
        substitutedMinutes: typeof (task as any).substitutedMinutes === 'number' ? (task as any).substitutedMinutes : undefined,
        actualStartedAt: (task as any).actualStartedAt || null,
      };
      const res = await axios.put(`/api/tasks/${task.id}`, payload, { withCredentials: true, timeout: 5000 });
      const apiToUi = (s?: string): '' | 'ongoing' | 'completed' => (s === 'in-progress' ? 'ongoing' : s === 'completed' ? 'completed' : '');
      const updated = { ...res.data, status: apiToUi(res.data?.status) } as Task;
      dispatch({ type: 'UPDATE_TASK', payload: updated });
      return updated;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message || 'Failed to update task';
        dispatch({ type: 'SET_ERROR', payload: msg });
        throw new Error(msg);
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to update task' });
        throw new Error('Failed to update task');
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteTask = async (id: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await axios.delete(`/api/tasks/${id}`, { withCredentials: true, timeout: 5000 });
      dispatch({ type: 'DELETE_TASK', payload: id });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Failed to delete task' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to delete task' });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const reorderTasks = (tasks: Task[]) => {
    dispatch({ type: 'REORDER_TASKS', payload: tasks });
  };

  return (
    <TaskContext.Provider value={{ state, createTask, updateTask, deleteTask, reorderTasks }}>
      {children}
    </TaskContext.Provider>
  );
};


