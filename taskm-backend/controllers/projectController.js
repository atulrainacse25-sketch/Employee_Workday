const AppDataSource = require('../data-source');
const Project = require('../entities/Project');
const ProjectMember = require('../entities/ProjectMember');
const User = require('../entities/User');
const Notification = require('../entities/Notification');

exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name required' });
    const repo = AppDataSource.getRepository(Project);
    const project = repo.create({ name, description, ownerId: req.user.id });
    await repo.save(project);
    res.json(project);
  } catch (err) {
    console.error('createProject error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    const rows = await AppDataSource.query(`
      SELECT p.*, 
        COALESCE(t.tasks_total,0) AS tasks_total,
        COALESCE(tc.tasks_completed,0) AS tasks_completed,
        COALESCE(members.members, '[]') AS members
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int AS tasks_total FROM tasks GROUP BY project_id
      ) t ON t.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int AS tasks_completed FROM tasks WHERE LOWER(status) IN ('done','completed') GROUP BY project_id
      ) tc ON tc.project_id = p.id
      LEFT JOIN (
        SELECT pm.project_id, json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar', u.avatar)) AS members
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.status = 'accepted'
        GROUP BY pm.project_id
      ) members ON members.project_id = p.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows.map(r => ({ ...r, members: r.members || [] })));
  } catch (err) {
    console.error('getAllProjects error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    // fetch accepted memberships via raw query to avoid metadata issues
    const memberships = await AppDataSource.query('SELECT project_id FROM project_members WHERE user_id = $1 AND status = $2', [userId, 'accepted']);
    const projectIds = memberships.map(m => m.project_id);
    // We'll fetch projects with aggregated members and task counts so the frontend can show avatars
    const ids = projectIds.length ? projectIds : [-1];
    // Use a query similar to getAllProjects but restrict to projects the user is a member of or owns
    const rows = await AppDataSource.query(`
      SELECT p.*, 
        COALESCE(t.tasks_total,0) AS tasks_total,
        COALESCE(tc.tasks_completed,0) AS tasks_completed,
        COALESCE(members.members, '[]') AS members
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int AS tasks_total FROM tasks GROUP BY project_id
      ) t ON t.project_id = p.id
      LEFT JOIN (
        SELECT project_id, COUNT(*)::int AS tasks_completed FROM tasks WHERE LOWER(status) IN ('done','completed') GROUP BY project_id
      ) tc ON tc.project_id = p.id
      LEFT JOIN (
        SELECT pm.project_id, json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar', u.avatar)) AS members
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.status = 'accepted'
        GROUP BY pm.project_id
      ) members ON members.project_id = p.id
      WHERE p.id = ANY($1) OR p.owner_id = $2
      ORDER BY p.created_at DESC
    `, [ids, userId]);
    res.json(rows.map(r => ({ ...r, members: r.members || [] })));
  } catch (err) {
    console.error('getUserProjects error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const { projectId, userId, role } = req.body;
    if (!projectId || !userId) return res.status(400).json({ message: 'projectId and userId required' });
    const existing = await AppDataSource.query('SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
    if (existing && existing.length) return res.status(400).json({ message: 'User already invited or member' });
    const recs = await AppDataSource.query('INSERT INTO project_members (project_id, user_id, role, status, invited_at) VALUES ($1,$2,$3,$4,NOW()) RETURNING *', [projectId, userId, role || 'member', 'pending']);
    const rec = recs[0];
    // create notification
    const notifRepo = AppDataSource.getRepository(Notification);
    const message = `You have been invited to project ${projectId}`;
    const n = notifRepo.create({ userId, message, data: JSON.stringify({ type: 'project_invite', projectId }) });
    await notifRepo.save(n);
    res.json(rec);
  } catch (err) {
    console.error('inviteMember error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addMember = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const { userId, role } = req.body;
    if (!projectId || !userId) return res.status(400).json({ message: 'projectId and userId required' });
    // insert as accepted member
    const recs = await AppDataSource.query('INSERT INTO project_members (project_id, user_id, role, status, invited_at, accepted_at) VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING *', [projectId, userId, role || 'member', 'accepted']);
    const rec = recs[0];
    // notify user
    try {
      const notifRepo = AppDataSource.getRepository(Notification);
      const message = `You have been added to project ${projectId}`;
      const n = notifRepo.create({ userId, message, data: JSON.stringify({ type: 'project_added', projectId }) });
      await notifRepo.save(n);
    } catch (e) { console.error('notify addMember failed', e); }
    res.json(rec);
  } catch (err) {
    console.error('addMember error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.acceptInvite = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // update invite status via raw query
    const check = await AppDataSource.query('SELECT * FROM project_members WHERE id = $1', [id]);
    if (!check || !check.length) return res.status(404).json({ message: 'Invite not found' });
    const rec = check[0];
    if (rec.user_id !== req.user.id) return res.status(403).json({ message: 'Not your invite' });
    const updated = await AppDataSource.query('UPDATE project_members SET status = $1, accepted_at = NOW() WHERE id = $2 RETURNING *', ['accepted', id]);
    const newRec = updated[0];
    // notify project owner (owner is in projects.owner_id)
    try {
      const proj = await AppDataSource.query('SELECT owner_id FROM projects WHERE id = $1', [newRec.project_id]);
      if (proj && proj[0]) {
        const ownerId = proj[0].owner_id;
        const notifRepo = AppDataSource.getRepository(Notification);
        const message = `User ${req.user.name} accepted invite to project ${newRec.project_id}`;
        const n = notifRepo.create({ userId: ownerId, message, data: JSON.stringify({ type: 'project_activity', projectId: newRec.project_id, action: 'invite_accepted' }) });
        await notifRepo.save(n);
      }
    } catch (e) {
      console.error('Failed to notify owner', e.message || e);
    }
    res.json(newRec);
  } catch (err) {
    console.error('acceptInvite error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getInvitations = async (req, res) => {
  try {
    const invites = await AppDataSource.query('SELECT * FROM project_members WHERE user_id = $1 AND status = $2', [req.user.id, 'pending']);
    res.json(invites);
  } catch (err) {
    console.error('getInvitations error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const proj = await AppDataSource.getRepository(Project).findOneBy({ id });
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    // tasks for project, include assignee name/avatar
    const tasks = await AppDataSource.query(`
      SELECT t.id, t.title, t.status, t.priority, t.due_date, t.assignee_id,
        u.name AS assignee_name, u.avatar AS assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.project_id = $1
      ORDER BY t.id DESC
    `, [id]);

    // members
    const members = await AppDataSource.query(`SELECT u.id, u.name, u.email, pm.role, pm.status
      FROM project_members pm
      JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1`, [id]);

    res.json({ project: proj, tasks, members });
  } catch (err) {
    console.error('getProject error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, startDate, endDate, status } = req.body;
    const repo = AppDataSource.getRepository(Project);
    const proj = await repo.findOneBy({ id });
    if (!proj) return res.status(404).json({ message: 'Project not found' });
    proj.name = name || proj.name;
    proj.description = description || proj.description;
    if (startDate) proj.startDate = startDate;
    if (endDate) proj.endDate = endDate;
    if (status) proj.status = status;
    await repo.save(proj);
    res.json(proj);
  } catch (err) {
    console.error('updateProject error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    // remove members then project
    await AppDataSource.query('DELETE FROM project_members WHERE project_id = $1', [id]);
    await AppDataSource.query('DELETE FROM tasks WHERE project_id = $1', [id]);
    await AppDataSource.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('deleteProject error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    await AppDataSource.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error('removeMember error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changeMemberRole = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'role required' });
    await AppDataSource.query('UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3', [role, projectId, userId]);
    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error('changeMemberRole error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


