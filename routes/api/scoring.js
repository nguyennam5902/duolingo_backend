const express = require('express');
const scoringController = require('../../controllers/scoringController');
const router = express.Router();

router.get('/student/:id', scoringController.search)
router.get('/listening/:id', scoringController.listening)
router.get('/reading/:id', scoringController.reading)
router.get('/writing/:id', scoringController.writing)
router.get('/speaking/:id', scoringController.speaking)
router.post('/writing/', scoringController.submitWriting)
router.post('/speaking/', scoringController.submitSpeaking)

module.exports = router