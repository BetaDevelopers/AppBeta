const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionat' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_dev');
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invàlid o expirat' });
  }
};

module.exports = { verifyToken };
