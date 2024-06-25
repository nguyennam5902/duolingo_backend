const express = require('express');
const controller = require('../../controllers/testController');
const router = express.Router();

router.get('/search/:userID/', controller.search)
router.get('/:id/', controller.detail)
router.post('/', controller.submit)

module.exports = router