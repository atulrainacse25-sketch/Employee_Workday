import React, { useEffect, useState } from 'react';
import { useTasks } from '../../contexts/useTasks';
import { useAuth } from '../../contexts/useAuth';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { TaskFilters } from './TaskFilters';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Filter } from 'lucide-react';
import { Task } from '../../contexts/TaskContext';
import { useNavigate } from 'react-router-dom';

export const TaskList: React.FC = () => {
  const { state, reorderTasks } = useTasks();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'todo' | 'in-progress' | 'completed'>('todo');

  // If URL has ?edit=id, open edit modal for that task (used from details page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
      const t = state.tasks.find(tt => String(tt.id) === editId);
      if (t) {
        setEditingTask(t);
        setIsModalOpen(true);
        params.delete('edit');
        window.history.replaceState({}, '', `${window.location.pathname}`);
      }
    }
  }, [state.tasks]);

  // Build list of assignees for admin filter (populated inline in JSX)

  // Filter tasks based on search and filters
  const filteredTasks = state.tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || String(task.assigneeId) === assigneeFilter;

    return matchesStatus && matchesPriority && matchesAssignee;
  });

  // Group tasks by status
  const taskColumns = {
    todo: filteredTasks.filter(task => task.status === ''),
    'in-progress': filteredTasks.filter(task => task.status === 'ongoing'),
    completed: filteredTasks.filter(task => task.status === 'completed'),
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = state.tasks.find(task => task.id === active.id);
    if (!activeTask) return;

    // Update task status based on column
    const newStatus = over.id as 'todo' | 'in-progress' | 'completed';
    if (activeTask.status !== newStatus) {
      const uiStatus = newStatus === 'in-progress' ? 'ongoing' : newStatus === 'completed' ? 'completed' : '';
      const updatedTask = { ...activeTask, status: uiStatus as any };
      const updatedTasks = state.tasks.map(task =>
        task.id === activeTask.id ? updatedTask : task
      );
      reorderTasks(updatedTasks);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openDetails = (task: Task) => {
    navigate(`/tasks/${task.id}`);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-orange-50 border-orange-200';
      case 'in-progress':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getColumnTitle = (status: string) => {
    switch (status) {
      case 'todo':
        return 'Pending';
      case 'in-progress':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Manage and track your tasks efficiently</p>
        </div>
        <button
          onClick={handleCreateTask}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Task
        </button>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-end gap-2" role="tablist" aria-label="Task status tabs">
            <button
              role="tab"
              aria-selected={activeTab==='todo'}
              onClick={()=>setActiveTab('todo')}
              className={`px-4 py-2 text-sm rounded-md transition ${activeTab==='todo' ? 'bg-amber-600 text-white shadow' : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'}`}
            >
              Pending
            </button>
            <button
              role="tab"
              aria-selected={activeTab==='in-progress'}
              onClick={()=>setActiveTab('in-progress')}
              className={`px-4 py-2 text-sm rounded-md transition ${activeTab==='in-progress' ? 'bg-blue-600 text-white shadow' : 'text-blue-700 hover:bg-blue-50 hover:text-blue-800'}`}
            >
              Ongoing
            </button>
            <button
              role="tab"
              aria-selected={activeTab==='completed'}
              onClick={()=>setActiveTab('completed')}
              className={`px-4 py-2 text-sm rounded-md transition ${activeTab==='completed' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'}`}
            >
              Completed
            </button>
          </div>
          <div className="flex items-center space-x-3">
            {authState.user?.role === 'admin' && (
              <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="all">All users</option>
                {Array.from(new Map(state.tasks.map(t => [t.assigneeId, t.assigneeName]))).map(([id, name]) => (
                  <option key={id} value={String(id)}>{name || `User ${id}`}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3">
            <TaskFilters
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              onStatusChange={setStatusFilter}
              onPriorityChange={setPriorityFilter}
            />
          </div>
        )}
      </div>

      {/* Task Board (single tab) */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-6">
          {Object.entries(taskColumns)
            .filter(([status]) => status === activeTab)
            .map(([status, tasks]) => (
            <div key={status} className={`rounded-xl border-2 border-dashed p-4 ${getColumnColor(status)}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {getColumnTitle(status)}
                </h3>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                  {tasks.length}
                </span>
              </div>

              <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => handleEditTask(task)}
                      onOpen={() => openDetails(task)}
                      isAdmin={authState.user?.role === 'admin'}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={editingTask}
      />
    </div>
  );
};