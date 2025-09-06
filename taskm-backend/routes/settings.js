const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/profile', authenticateToken, settingsController.getProfile);
router.put('/profile', authenticateToken, settingsController.updateProfile);
// Admin-only endpoint to set server env keys (write to .env). Use with caution.
router.post('/server/env', authenticateToken, settingsController.updateServerEnv);
router.post('/server/test-gemini', authenticateToken, settingsController.testGemini);

module.exports = router;


