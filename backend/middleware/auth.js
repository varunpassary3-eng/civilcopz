const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'super-secret-key';

function verifyToken(req, res, next) {
  // STABILIZATION BYPASS
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    req.user = { id: 'dev-admin-id', email: 'admin@civilcopz.gov', role: 'admin' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, secret);
    req.user = payload;
    next();
  } catch (error) {
    console.error('JWT error', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  verifyToken,
};
