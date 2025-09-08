const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middlewares/auth');

// Notification routes
router.get('/', authenticateToken, notificationController.getUserNotifications);
router.post('/:id/read', authenticateToken, notificationController.markRead);
router.post('/read-all', authenticateToken, notificationController.markAllRead);

// AI endpoints (protected)
router.post('/ai/chat', authenticateToken, aiController.chat);
router.post('/ai/analyze', authenticateToken, aiController.analyze);
router.post('/ai/plan', authenticateToken, aiController.plan);

module.exports = router;
