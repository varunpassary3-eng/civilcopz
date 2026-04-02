const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');
const audit = require('../middleware/audit');

// Request timing middleware for audit logs
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

router.post('/register', audit('USER_REGISTER'), validate(registerSchema), userController.register);
router.post('/login', audit('USER_LOGIN'), validate(loginSchema), userController.login);

module.exports = router;
