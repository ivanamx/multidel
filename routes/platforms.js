const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Obtener todas las plataformas
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM platforms ORDER BY name');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo plataformas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo plataformas',
      message: error.message
    });
  }
});

// Obtener una plataforma específica
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM platforms WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plataforma no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo plataforma:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo plataforma',
      message: error.message
    });
  }
});

// Crear nueva plataforma
router.post('/', async (req, res) => {
  try {
    const { name, api_url, client_id, client_secret } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de plataforma requerido'
      });
    }

    const result = await db.query(`
      INSERT INTO platforms (name, api_url, client_id, client_secret) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `, [name, api_url, client_id, client_secret]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando plataforma:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando plataforma',
      message: error.message
    });
  }
});

// Actualizar plataforma
router.put('/:id', async (req, res) => {
  try {
    const { name, api_url, client_id, client_secret, is_active } = req.body;
    const platformId = req.params.id;

    const result = await db.query(`
      UPDATE platforms 
      SET name = COALESCE($1, name),
          api_url = COALESCE($2, api_url),
          client_id = COALESCE($3, client_id),
          client_secret = COALESCE($4, client_secret),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 
      RETURNING *
    `, [name, api_url, client_id, client_secret, is_active, platformId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plataforma no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando plataforma:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando plataforma',
      message: error.message
    });
  }
});

// Activar/desactivar plataforma
router.patch('/:id/toggle', async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE platforms 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plataforma no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `Plataforma ${result.rows[0].is_active ? 'activada' : 'desactivada'} correctamente`
    });
  } catch (error) {
    console.error('Error cambiando estado de plataforma:', error);
    res.status(500).json({
      success: false,
      error: 'Error cambiando estado de plataforma',
      message: error.message
    });
  }
});

// Obtener estadísticas de una plataforma
router.get('/:id/stats', async (req, res) => {
  try {
    const platformId = req.params.id;
    
    // Verificar que la plataforma existe
    const platformResult = await db.query('SELECT * FROM platforms WHERE id = $1', [platformId]);
    if (platformResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plataforma no encontrada'
      });
    }

    // Estadísticas por estado
    const statusStats = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      WHERE platform_id = $1 
      GROUP BY status
    `, [platformId]);

    // Total de pedidos
    const totalOrders = await db.query(`
      SELECT COUNT(*) as total, SUM(total_amount) as total_amount 
      FROM orders 
      WHERE platform_id = $1
    `, [platformId]);

    // Pedidos de hoy
    const todayOrders = await db.query(`
      SELECT COUNT(*) as count, SUM(total_amount) as amount 
      FROM orders 
      WHERE platform_id = $1 AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE
    `, [platformId]);

    res.json({
      success: true,
      data: {
        platform: platformResult.rows[0],
        by_status: statusStats.rows,
        total: totalOrders.rows[0],
        today: todayOrders.rows[0]
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de plataforma:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

module.exports = router;