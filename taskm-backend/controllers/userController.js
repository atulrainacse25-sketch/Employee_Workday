const AppDataSource = require('../data-source');
const User = require('../entities/User');
const bcrypt = require('bcryptjs');

exports.listUsers = async (req, res) => {
  try {
    const q = (req.query.search || '').toString();
    if (!q) {
      const rows = await AppDataSource.query('SELECT id, name, email, role, avatar, created_at FROM users ORDER BY id DESC');
      return res.json(rows);
    }
    const like = `%${q}%`;
    const rows = await AppDataSource.query('SELECT id, name, email, role, avatar, created_at FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY id DESC', [like]);
    res.json(rows);
  } catch (err) {
    console.error('listUsers error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'name and email required' });
    const repo = AppDataSource.getRepository(User);
    const existing = await repo.findOneBy({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    const pwd = password || Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(pwd, 10);
    const u = repo.create({ name, email, password: hash, role: role || 'user' });
    await repo.save(u);
    // don't return password
    const { password: _p, ...out } = u;
    res.json(out);
  } catch (err) {
    console.error('createUser error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    // remove project_members, tasks assignments, notifications etc as cleanup
    await AppDataSource.query('DELETE FROM project_members WHERE user_id = $1', [id]);
    await AppDataSource.query('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1', [id]);
    await AppDataSource.query('DELETE FROM notifications WHERE user_id = $1', [id]);
    await AppDataSource.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('deleteUser error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changeUserRole = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = req.body;
    if (!id || !role) return res.status(400).json({ message: 'id and role required' });
    await AppDataSource.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error('changeUserRole error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


