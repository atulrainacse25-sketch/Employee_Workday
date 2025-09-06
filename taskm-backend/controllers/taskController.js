
const AppDataSource = require('../data-source');
const Task = require('../entities/Task');

exports.getTasks = async (req, res) => {
  const taskRepository = AppDataSource.getRepository(Task);
  try {
    const user = req.user || {};
    // If admin, return all tasks; otherwise return tasks assigned to the user
    if (user.role === 'admin') {
      const tasks = await taskRepository.find({ order: { createdAt: 'DESC' } });
      return res.json(tasks);
    }

    const userId = user.id;
    const tasks = await taskRepository.find({ where: { assigneeId: userId }, order: { createdAt: 'DESC' } });
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTask = async (req, res) => {
  const taskRepository = AppDataSource.getRepository(Task);
  try {
    const currentUser = req.user || {};
    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      assigneeName,
      dueDate,
      githubLink,
      projectId,
      estimatedMinutes,
      substitutedMinutes,
      actualMinutes,
    } = req.body || {};

    if (!title || !priority) {
      return res.status(400).json({ message: 'Title and priority are required' });
    }

    // Determine assignee id
    let normalizedAssigneeId = null;
    if (assigneeId != null && assigneeId !== '') {
      const parsed = parseInt(assigneeId, 10);
      normalizedAssigneeId = Number.isFinite(parsed) ? parsed : null;
    } else if (currentUser && currentUser.role !== 'admin') {
      normalizedAssigneeId = currentUser.id ?? null;
    }

    // Parse due date safely (supports 'YYYY-MM-DD', 'DD/MM/YYYY', or ISO)
    let normalizedDueDate = null;
    if (dueDate) {
      if (typeof dueDate === 'string') {
        let d;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          d = new Date(`${dueDate}T00:00:00Z`);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dueDate)) {
          const [dd, mm, yyyy] = dueDate.split('/');
          d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
        } else {
          d = new Date(dueDate);
        }
        if (!isNaN(d.getTime())) normalizedDueDate = d;
      } else if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
        normalizedDueDate = dueDate;
      }
    }

    // Validate/normalize project id to avoid FK violations (ignore non-existent projects)
    let normalizedProjectId = null;
    if (projectId != null && projectId !== '') {
      const pid = parseInt(projectId, 10);
      if (Number.isFinite(pid)) {
        try {
          const exists = await AppDataSource.query('SELECT id FROM projects WHERE id = $1', [pid]);
          if (exists && exists.length > 0) normalizedProjectId = pid; // keep only if real
        } catch (e) {
          console.warn('Project existence check failed:', e && e.message ? e.message : e);
        }
      }
    }

    const prepared = {
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      assigneeId: normalizedAssigneeId,
      assigneeName: assigneeName || (normalizedAssigneeId === currentUser.id ? currentUser.name : assigneeName) || null,
      dueDate: normalizedDueDate,
      githubLink: githubLink || null,
      projectId: normalizedProjectId,
      estimatedMinutes: estimatedMinutes != null && estimatedMinutes !== '' ? parseInt(estimatedMinutes, 10) : null,
      substitutedMinutes: substitutedMinutes != null && substitutedMinutes !== '' ? parseInt(substitutedMinutes, 10) : null,
      actualMinutes: actualMinutes != null && actualMinutes !== '' ? parseInt(actualMinutes, 10) : null,
    };

    const newTask = taskRepository.create(prepared);
    await taskRepository.save(newTask);
    res.status(201).json(newTask);
  } catch (err) {
    const message = (err && err.message) ? err.message : String(err);
    console.error('Error creating task:', message);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ message: 'Server error', error: message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTask = async (req, res) => {
  const taskRepository = AppDataSource.getRepository(Task);
  try {
    const { id } = req.params;
    let task = await taskRepository.findOneBy({ id: parseInt(id) });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    taskRepository.merge(task, req.body);
    const updatedTask = await taskRepository.save(task);
    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteTask = async (req, res) => {
  const taskRepository = AppDataSource.getRepository(Task);
  try {
    const { id } = req.params;
    const result = await taskRepository.delete(parseInt(id));
    if (result.affected === 0) return res.status(404).json({ message: 'Task not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
