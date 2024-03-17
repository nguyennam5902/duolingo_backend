const express = require('express');
const router = express.Router();

// middleware
const middleware = require("../../middlewares/auth");

// controllers
const authController = require("../../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/logout", authController.logout);
router.get("/current-user", middleware, authController.currentUser);
router.post('/update-password', authController.updatePassword);

module.exports = router;