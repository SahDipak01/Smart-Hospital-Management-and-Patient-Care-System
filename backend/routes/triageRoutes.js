const express = require('express');
const router = express.Router();
const { assessSymptoms, getTriageHistory } = require('../controllers/triageController');
const { protect } = require('../middleware/auth');

router.post('/assess', protect, assessSymptoms);
router.get('/history', protect, getTriageHistory);

module.exports = router;
