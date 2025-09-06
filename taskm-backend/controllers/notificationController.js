const AppDataSource = require('../data-source');
const Notification = require('../entities/Notification');

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const repo = AppDataSource.getRepository(Notification);
    const rows = await repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    const safe = rows.map(r => {
      let parsed = null;
      if (r.data) {
        try { parsed = JSON.parse(r.data); } catch { parsed = null; }
      }
      return { id: r.id, message: r.message, data: parsed, read: r.read, createdAt: r.createdAt };
    });
    res.json(safe);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);
    const repo = AppDataSource.getRepository(Notification);
    const rec = await repo.findOneBy({ id, userId });
    if (!rec) return res.status(404).json({ message: 'Notification not found' });
    rec.read = true;
    await repo.save(rec);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const repo = AppDataSource.getRepository(Notification);
    await repo.createQueryBuilder()
      .update()
      .set({ read: true })
      .where('user_id = :userId AND read = false', { userId })
      .execute();
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
