const dbManager = require('../services/databaseManager');

const getPrisma = () => dbManager.getWriteClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || '2h'; // Configurable expiry

async function register(req, res) {
  const { email, password, role } = req.body;

  try {
    const existing = await getPrisma().user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 12); // Increased rounds for better security
    const user = await getPrisma().user.create({
      data: {
        email,
        password: hashed,
        role: role || 'consumer'
      },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('register error', error);
    return res.status(500).json({ error: 'Unable to register user' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  try {
    const user = await getPrisma().user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`🕵️ [AUTH_FAILURE] Login attempt for NON-EXISTENT account: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.warn(`🕵️ [AUTH_FAILURE] Password MISMATCH for account: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      expiresIn: TOKEN_EXPIRY
    });
  } catch (error) {
    console.error('login error', error);
    return res.status(500).json({ error: 'Unable to login' });
  }
}

module.exports = {
  register,
  login,
};
