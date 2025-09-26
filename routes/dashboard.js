const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../config/database');

// Cache para estadísticas (se actualiza cada 5 segundos)
let statsCache = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 5000; // 5 segundos

// Servir archivos estáticos primero
router.use(express.static(path.join(__dirname, '../public')));

// Servir el dashboard HTML
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Rutas específicas para archivos JavaScript
router.get('/dashboard.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, '../public/dashboard.js'));
});

// Endpoint de estadísticas del dashboard
router.get('/stats', async (req, res) => {
  try {
    const requestId = Math.random().toString(36).substr(2, 9);
    const now = Date.now();
    
    // Verificar si el cache es válido
    if (statsCache && (now - lastCacheUpdate) < CACHE_DURATION) {
      console.log(`📊 [${requestId}] Usando cache (${now - lastCacheUpdate}ms old)`);
      return res.json({
        success: true,
        data: statsCache
      });
    }
    
    console.log(`📊 [${requestId}] Ejecutando consulta de estadísticas -`, new Date().toLocaleTimeString());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Pedidos de hoy
    const todayOrdersQuery = `
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `;
    const todayOrdersResult = await db.query(todayOrdersQuery);
    const todayStats = todayOrdersResult.rows[0];
    
    // Pedidos pendientes y preparando de hoy
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM orders 
      WHERE status IN ('pending', 'preparing') AND DATE(created_at) = CURRENT_DATE
    `;
    const pendingResult = await db.query(pendingQuery);
    const pendingCount = pendingResult.rows[0].count;
    console.log(`🔢 [${requestId}] Resultado de consulta pendientes:`, pendingCount);
    
    // Debug: Obtener detalles de pedidos pendientes y preparando
    const pendingDetailsQuery = `
      SELECT id, status, created_at, customer_name
      FROM orders 
      WHERE status IN ('pending', 'preparing') AND DATE(created_at) = CURRENT_DATE
      ORDER BY created_at DESC
    `;
    const pendingDetailsResult = await db.query(pendingDetailsQuery);
    console.log(`🔍 [${requestId}] Debug - Pedidos pendientes y preparando:`, pendingDetailsResult.rows.map(row => ({
      id: row.id,
      status: row.status,
      customer: row.customer_name,
      created: row.created_at
    })));
    
    // Pedidos en entrega de hoy
    const deliveryQuery = `
      SELECT COUNT(*) as count
      FROM orders 
      WHERE status = 'delivering' AND DATE(created_at) = CURRENT_DATE
    `;
    const deliveryResult = await db.query(deliveryQuery);
    const deliveryCount = deliveryResult.rows[0].count;
    
    const statsData = {
      today: {
        count: parseInt(todayStats.count),        // Número de pedidos de hoy
        revenue: parseFloat(todayStats.total)     // Ingresos totales de hoy
      },
      pending: {
        count: parseInt(pendingCount)
      },
      delivery: {
        count: parseInt(deliveryCount)
      }
    };
    
    console.log(`📊 [${requestId}] Estadísticas del dashboard - Fecha:`, new Date().toLocaleDateString());
    console.log(`   - Pedidos de hoy:`, statsData.today.count);
    console.log(`   - Ingresos de hoy:`, statsData.today.revenue);
    console.log(`   - Pendientes y preparando de hoy:`, statsData.pending.count);
    console.log(`   - En entrega de hoy:`, statsData.delivery.count);
    
    // Actualizar cache
    statsCache = statsData;
    lastCacheUpdate = now;
    console.log(`📊 [${requestId}] Cache actualizado`);
    
    // Emitir actualización por WebSocket
    if (global.emitDashboardUpdate) {
      global.emitDashboardUpdate('stats', statsData);
    }
    
    res.json({
      success: true,
      data: statsData
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

// Endpoint específico para pedidos en entrega de hoy
router.get('/delivery-orders', async (req, res) => {
  try {
    // Usar exactamente la misma lógica que las cards del dashboard
    const deliveryQuery = `
      SELECT o.*, p.name as platform_name
      FROM orders o 
      JOIN platforms p ON o.platform_id = p.id 
      WHERE o.status = 'delivering' AND DATE(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE
      ORDER BY o.created_at DESC
    `;
    
    const deliveryResult = await db.query(deliveryQuery);
    const deliveryOrders = deliveryResult.rows;
    
    console.log('🚚 Pedidos en entrega de hoy (backend):', deliveryOrders.length);
    console.log('📋 Detalle:', deliveryOrders.map(order => ({
      id: order.id,
      status: order.status,
      platform: order.platform_name,
      date: order.created_at
    })));
    
    res.json({
      success: true,
      data: deliveryOrders
    });
  } catch (error) {
    console.error('Error obteniendo pedidos en entrega:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo pedidos en entrega'
    });
  }
});

// Endpoints para automatización de tracking
const automationService = require('../services/automationService');

// Iniciar monitoreo automático
router.post('/automation/start', async (req, res) => {
  try {
    automationService.startMonitoring();
    res.json({
      success: true,
      message: 'Monitoreo automático iniciado'
    });
  } catch (error) {
    console.error('Error iniciando monitoreo automático:', error);
    res.status(500).json({
      success: false,
      error: 'Error iniciando monitoreo automático'
    });
  }
});

// Detener monitoreo automático
router.post('/automation/stop', async (req, res) => {
  try {
    automationService.stopMonitoring();
    res.json({
      success: true,
      message: 'Monitoreo automático detenido'
    });
  } catch (error) {
    console.error('Error deteniendo monitoreo automático:', error);
    res.status(500).json({
      success: false,
      error: 'Error deteniendo monitoreo automático'
    });
  }
});

// Obtener estado del monitoreo automático
router.get('/automation/status', async (req, res) => {
  try {
    const status = automationService.getMonitoringStatus();
    const stats = await automationService.getAutomationStats();
    
    res.json({
      success: true,
      data: {
        monitoring: status,
        stats: stats
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado de automatización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado de automatización'
    });
  }
});

module.exports = router;