const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const aiController = require('../controllers/aiController');
const { authenticateToken, isAdmin } = require('../middlewares/auth');

router.get('/', authenticateToken, notificationController.getUserNotifications);
router.post('/:id/read', authenticateToken, notificationController.markRead);
router.post('/read-all', authenticateToken, notificationController.markAllRead);

// AI endpoints (protected)
router.post('/ai/chat', authenticateToken, aiController.chat);
router.post('/ai/analyze', authenticateToken, aiController.analyze);
router.post('/ai/plan', authenticateToken, aiController.plan);
router.get('/ai/logs', authenticateToken, isAdmin, aiController.getLogs);
router.get('/ai/logs/:id', authenticateToken, isAdmin, aiController.replay);
router.post('/ai/logs/:id/archive', authenticateToken, isAdmin, aiController.archive);
router.post('/ai/logs/:id/unarchive', authenticateToken, isAdmin, aiController.unarchive);
router.delete('/ai/logs/:id', authenticateToken, isAdmin, aiController.deleteLog);
router.post('/ai/logs/archive-old', authenticateToken, isAdmin, aiController.archiveOld);

module.exports = router;
