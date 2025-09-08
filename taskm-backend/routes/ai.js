const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// AI Endpoints
router.post('/chat', aiController.chat);
router.post('/analyze', aiController.analyze);
router.post('/plan', aiController.plan);

// Logs
router.get('/logs', aiController.getLogs || ((req, res) => res.status(404).json({ message: 'Not implemented' })));
router.get('/logs/:id', aiController.replay || ((req, res) => res.status(404).json({ message: 'Not implemented' })));
router.put('/logs/:id/archive', aiController.archive || ((req, res) => res.status(404).json({ message: 'Not implemented' })));
router.put('/logs/:id/unarchive', aiController.unarchive || ((req, res) => res.status(404).json({ message: 'Not implemented' })));
router.delete('/logs/:id', aiController.deleteLog || ((req, res) => res.status(404).json({ message: 'Not implemented' })));
router.post('/logs/archive-old', aiController.archiveOld || ((req, res) => res.status(404).json({ message: 'Not implemented' })));

// SmartPlanner
router.get('/smartplanner', aiController.getSmartPlanner);

module.exports = router;
