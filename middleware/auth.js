const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware para verificar el token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acceso requerido',
      message: 'Debes iniciar sesión para acceder a este recurso'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario aún existe en la base de datos
    const userResult = await db.query(
      'SELECT id, username, email, role FROM users WHERE id = $1 AND active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Usuario no encontrado o inactivo'
      });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente'
      });
    }
    
    return res.status(403).json({ 
      error: 'Token inválido',
      message: 'No tienes permisos para acceder a este recurso'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'No autenticado',
        message: 'Debes iniciar sesión primero'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'No tienes permisos suficientes para realizar esta acción'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
