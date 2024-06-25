const express = require('express');
const controller = require('../../controllers/speakingController');
const router = express.Router();

router.get('/', controller.speaking)
router.post('/upload', controller.upload)
router.get('/answers/:id', controller.answer)

module.exports = router