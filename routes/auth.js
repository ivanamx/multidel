const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Esquemas de validación
const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'manager', 'staff').default('staff')
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: error.details[0].message
      });
    }

    const { username, password } = value;

    // Buscar usuario en la base de datos
    const userResult = await db.query(
      'SELECT id, username, email, password, role, active FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    const user = userResult.rows[0];

    // Verificar si el usuario está activo
    if (!user.active) {
      return res.status(401).json({
        error: 'Cuenta desactivada',
        message: 'Tu cuenta ha sido desactivada. Contacta al administrador'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Actualizar último login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al procesar el login'
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Datos inválidos',
        message: error.details[0].message
      });
    }

    const { username, email, password, role } = value;

    // Verificar si el usuario ya existe
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Usuario ya existe',
        message: 'El nombre de usuario o email ya está en uso'
      });
    }

    // Encriptar contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const newUser = await db.query(
      `INSERT INTO users (username, email, password, role, active, created_at) 
       VALUES ($1, $2, $3, $4, true, NOW()) 
       RETURNING id, username, email, role, created_at`,
      [username, email, hashedPassword, role]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al crear el usuario'
    });
  }
});

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al obtener la información del usuario'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  // En un sistema JWT stateless, el logout se maneja principalmente en el cliente
  // Aquí podríamos implementar una blacklist de tokens si fuera necesario
  res.json({
    message: 'Logout exitoso'
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Datos requeridos',
        message: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Contraseña inválida',
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario con contraseña
    const userResult = await db.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Contraseña incorrecta',
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await db.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al cambiar la contraseña'
    });
  }
});

module.exports = router;
