const express = require('express');
const router = express.Router();
const platformService = require('../services/platformService');
const uberEatsService = require('../services/uberEatsService');
const rappiService = require('../services/rappiService');

// Obtener todos los pedidos con filtros
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const filters = {
      status: req.query.status,
      platform: req.query.platform,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: limit,
      offset: offset,
      sort: req.query.sort || 'created_at',
      order: req.query.order || 'desc'
    };

    const orders = await platformService.getOrders(filters);
    
    // Obtener el total de pedidos para la paginación
    const totalResult = await platformService.getOrdersCount(filters);
    const totalOrders = totalResult;
    const totalPages = Math.ceil(totalOrders / limit);
    
    res.json({
      success: true,
      data: orders,
      count: orders.length,
      total: totalOrders,
      totalPages: totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo pedidos',
      message: error.message
    });
  }
});

// Obtener un pedido específico
router.get('/:id', async (req, res) => {
  try {
    const db = require('../config/database');
    const result = await db.query(`
      SELECT o.*, p.name as platform_name 
      FROM orders o 
      JOIN platforms p ON o.platform_id = p.id 
      WHERE o.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pedido no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo pedido',
      message: error.message
    });
  }
});

// Actualizar estado de un pedido
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, platform } = req.body;
    const orderId = req.params.id;

    // Validar estados permitidos
    const allowedStatuses = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'rejected'];
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Estado requerido'
      });
    }
    
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Estado no válido. Estados permitidos: ' + allowedStatuses.join(', ')
      });
    }

    // Obtener información del pedido
    const db = require('../config/database');
    const orderResult = await db.query(`
      SELECT o.*, p.name as platform_name 
      FROM orders o 
      JOIN platforms p ON o.platform_id = p.id 
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pedido no encontrado'
      });
    }

    const order = orderResult.rows[0];

    // Actualizar en la plataforma específica si se proporciona
    if (platform) {
      switch (platform.toLowerCase()) {
        case 'uber eats':
          await uberEatsService.updateOrderStatus(order.platform_order_id, status);
          break;
        case 'rappi':
          await rappiService.updateOrderStatus(order.platform_order_id, status);
          break;
        default:
          // Solo actualizar en nuestra base de datos
          await platformService.updateOrderStatus(orderId, status, order.platform_name);
      }
    } else {
      // Actualizar solo en nuestra base de datos
      await platformService.updateOrderStatus(orderId, status, order.platform_name);
    }

    // Emitir evento de cambio de estado por WebSocket
    if (global.emitDashboardUpdate) {
      global.emitDashboardUpdate('statusChange', {
        orderId: orderId,
        oldStatus: order.status,
        newStatus: status,
        platform: order.platform_name
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado correctamente'
    });
  } catch (error) {
    console.error('Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando estado',
      message: error.message
    });
  }
});

// Obtener logs de un pedido
router.get('/:id/logs', async (req, res) => {
  try {
    const db = require('../config/database');
    const result = await db.query(`
      SELECT * FROM order_logs 
      WHERE order_id = $1 
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo logs',
      message: error.message
    });
  }
});

// Aceptar un pedido
router.post('/:id/accept', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { preparation_time } = req.body;
    const db = require('../config/database');

    // Obtener información del pedido
    const orderResult = await db.query(`
      SELECT o.*, p.name as platform_name 
      FROM orders o 
      JOIN platforms p ON o.platform_id = p.id 
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pedido no encontrado'
      });
    }

    const order = orderResult.rows[0];

    // Verificar que el pedido esté en estado pendiente
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `No se puede aceptar el pedido. Estado actual: ${order.status}`,
        currentStatus: order.status
      });
    }

    // Validar tiempo de preparación
    const prepTime = preparation_time ? parseInt(preparation_time) : 15;
    if (prepTime < 5 || prepTime > 120) {
      return res.status(400).json({
        success: false,
        error: 'Tiempo de preparación debe estar entre 5 y 120 minutos'
      });
    }

    // Actualizar estado a 'preparing' (preparando) con tiempo de preparación
    await db.query(`
      UPDATE orders 
      SET status = 'preparing', 
          preparation_time = $3,
          confirmed_at = $2,
          updated_at = $2
      WHERE id = $1
    `, [orderId, new Date(), prepTime]);

    // Registrar log de confirmación con tiempo de preparación
    await db.query(`
      INSERT INTO order_logs (order_id, action, details, created_at)
      VALUES ($1, 'confirmed', $2, $3)
    `, [orderId, JSON.stringify({ 
        message: 'Pedido aceptado por el restaurante',
        preparation_time: prepTime
      }), new Date()]);

    // Actualizar en la plataforma específica si es necesario
    try {
      switch (order.platform_name.toLowerCase()) {
        case 'uber eats':
          await uberEatsService.updateOrderStatus(order.platform_order_id, 'preparing');
          break;
        case 'rappi':
          await rappiService.updateOrderStatus(order.platform_order_id, 'preparing');
          break;
        default:
          // Solo actualizar en nuestra base de datos
          await platformService.updateOrderStatus(orderId, 'preparing', order.platform_name);
      }
    } catch (platformError) {
      console.warn(`Error actualizando en plataforma ${order.platform_name}:`, platformError);
      // Continuar aunque falle la actualización en la plataforma
    }

    // Emitir evento de cambio de estado por WebSocket
    if (global.emitDashboardUpdate) {
      global.emitDashboardUpdate('statusChange', {
        orderId: orderId,
        oldStatus: 'pending',
        newStatus: 'preparing',
        platform: order.platform_name,
        preparationTime: prepTime
      });
    }

    res.json({
      success: true,
      message: `Pedido aceptado correctamente. Tiempo de preparación: ${prepTime} minutos`,
      data: {
        orderId: orderId,
        newStatus: 'preparing',
        preparationTime: prepTime,
        confirmedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error aceptando pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Error aceptando pedido',
      message: error.message
    });
  }
});

// Rechazar un pedido
router.post('/:id/reject', async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;
    const db = require('../config/database');

    // Obtener información del pedido
    const orderResult = await db.query(`
      SELECT o.*, p.name as platform_name 
      FROM orders o 
      JOIN platforms p ON o.platform_id = p.id 
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pedido no encontrado'
      });
    }

    const order = orderResult.rows[0];

    // Verificar que el pedido esté en estado pendiente
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `No se puede rechazar el pedido. Estado actual: ${order.status}`,
        currentStatus: order.status
      });
    }

    // Actualizar estado a 'rejected' (rechazado)
    await db.query(`
      UPDATE orders 
      SET status = 'rejected', 
          rejected_at = $3,
          rejection_reason = $1,
          updated_at = $3
      WHERE id = $2
    `, [reason || 'Rechazado por el restaurante', orderId, new Date()]);

    // Registrar log de rechazo
    await db.query(`
      INSERT INTO order_logs (order_id, action, details, created_at)
      VALUES ($1, 'rejected', $2, $3)
    `, [orderId, JSON.stringify({ 
        message: 'Pedido rechazado por el restaurante',
        reason: reason || 'Rechazado por el restaurante'
      }), new Date()]);

    // Actualizar en la plataforma específica si es necesario
    try {
      switch (order.platform_name.toLowerCase()) {
        case 'uber eats':
          await uberEatsService.updateOrderStatus(order.platform_order_id, 'rejected');
          break;
        case 'rappi':
          await rappiService.updateOrderStatus(order.platform_order_id, 'rejected');
          break;
        default:
          // Solo actualizar en nuestra base de datos
          await platformService.updateOrderStatus(orderId, 'rejected', order.platform_name);
      }
    } catch (platformError) {
      console.warn(`Error actualizando en plataforma ${order.platform_name}:`, platformError);
      // Continuar aunque falle la actualización en la plataforma
    }

    // Emitir evento de cambio de estado por WebSocket
    if (global.emitDashboardUpdate) {
      global.emitDashboardUpdate('statusChange', {
        orderId: orderId,
        oldStatus: 'pending',
        newStatus: 'rejected',
        platform: order.platform_name
      });
    }

    res.json({
      success: true,
      message: 'Pedido rechazado correctamente',
      data: {
        orderId: orderId,
        newStatus: 'rejected',
        rejectedAt: new Date(),
        reason: reason || 'Rechazado por el restaurante'
      }
    });
  } catch (error) {
    console.error('Error rechazando pedido:', error);
    res.status(500).json({
      success: false,
      error: 'Error rechazando pedido',
      message: error.message
    });
  }
});

// Estadísticas de pedidos
router.get('/stats/summary', async (req, res) => {
  try {
    const db = require('../config/database');
    
    // Estadísticas por estado
    const statusStats = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);

    // Estadísticas por plataforma
    const platformStats = await db.query(`
      SELECT p.name as platform, COUNT(*) as count 
      FROM orders o 
      JOIN platforms p ON o.platform_id = p.id 
      GROUP BY p.name
    `);

    // Total de pedidos hoy
    const todayStats = await db.query(`
      SELECT COUNT(*) as count, SUM(total_amount) as total 
      FROM orders 
      WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE
    `);

    res.json({
      success: true,
      data: {
        by_status: statusStats.rows,
        by_platform: platformStats.rows,
        today: todayStats.rows[0]
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

module.exports = router;