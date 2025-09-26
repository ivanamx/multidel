const express = require('express');
const router = express.Router();
const automationService = require('../services/automationService');

// Webhook para Uber Eats
router.post('/uber-eats', async (req, res) => {
  try {
    console.log('📥 Webhook recibido de Uber Eats:', req.body);
    
    // Verificar autenticidad del webhook (implementar según documentación de Uber)
    const signature = req.headers['x-uber-signature'];
    if (!signature) {
      console.warn('⚠️ Webhook sin firma de Uber Eats');
    }

    const order = await automationService.processUberEatsWebhook(req.body);
    
    console.log('✅ Pedido procesado de Uber Eats:', order.id);
    
    res.status(200).json({
      success: true,
      message: 'Webhook procesado correctamente',
      order_id: order.id
    });
  } catch (error) {
    console.error('❌ Error procesando webhook de Uber Eats:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook',
      message: error.message
    });
  }
});

// Webhook para Rappi
router.post('/rappi', async (req, res) => {
  try {
    console.log('📥 Webhook recibido de Rappi:', req.body);
    
    // Verificar autenticidad del webhook (implementar según documentación de Rappi)
    const signature = req.headers['x-rappi-signature'];
    if (!signature) {
      console.warn('⚠️ Webhook sin firma de Rappi');
    }

    const order = await automationService.processRappiWebhook(req.body);
    
    console.log('✅ Pedido procesado de Rappi:', order.id);
    
    res.status(200).json({
      success: true,
      message: 'Webhook procesado correctamente',
      order_id: order.id
    });
  } catch (error) {
    console.error('❌ Error procesando webhook de Rappi:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook',
      message: error.message
    });
  }
});

// Webhook genérico para otras plataformas
router.post('/:platform', async (req, res) => {
  try {
    const platform = req.params.platform;
    console.log(`📥 Webhook recibido de ${platform}:`, req.body);
    
    // Procesar según la plataforma
    let order;
    switch (platform.toLowerCase()) {
      case 'didi':
        // Implementar servicio de Didi
        order = { id: 'temp', platform: 'Didi' };
        break;
      
        break;
      default:
        throw new Error(`Plataforma ${platform} no soportada`);
    }
    
    console.log(`✅ Pedido procesado de ${platform}:`, order.id);
    
    res.status(200).json({
      success: true,
      message: 'Webhook procesado correctamente',
      order_id: order.id
    });
  } catch (error) {
    console.error(`❌ Error procesando webhook de ${req.params.platform}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook',
      message: error.message
    });
  }
});

// Endpoint para probar webhooks
router.post('/test/:platform', async (req, res) => {
  try {
    const platform = req.params.platform;
    const testData = req.body;
    
    console.log(`🧪 Probando webhook de ${platform}:`, testData);
    
    let order;
    switch (platform.toLowerCase()) {
      case 'uber-eats':
        order = await uberEatsService.processWebhook(testData);
        break;
      case 'rappi':
        order = await rappiService.processWebhook(testData);
        break;
      default:
        throw new Error(`Plataforma ${platform} no soportada para pruebas`);
    }
    
    res.status(200).json({
      success: true,
      message: 'Webhook de prueba procesado correctamente',
      order_id: order.id,
      platform: platform
    });
  } catch (error) {
    console.error(`❌ Error en webhook de prueba de ${req.params.platform}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error procesando webhook de prueba',
      message: error.message
    });
  }
});

// Obtener configuración de webhooks
router.get('/config', async (req, res) => {
  try {
    const db = require('../config/database');
    const result = await db.query(`
      SELECT wc.*, p.name as platform_name 
      FROM webhook_configs wc 
      JOIN platforms p ON wc.platform_id = p.id 
      WHERE wc.is_active = true
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error obteniendo configuración de webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo configuración',
      message: error.message
    });
  }
});

// Obtener estadísticas de automatización
router.get('/automation/stats', async (req, res) => {
  try {
    const stats = await automationService.getAutomationStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de automatización:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas',
      message: error.message
    });
  }
});

// Controlar automatización
router.post('/automation/control', async (req, res) => {
  try {
    const { action } = req.body;
    
    switch (action) {
      case 'start':
        await automationService.startAutomation();
        break;
      case 'stop':
        automationService.stopAutomation();
        break;
      default:
        throw new Error('Acción no válida');
    }
    
    res.status(200).json({
      success: true,
      message: `Automatización ${action === 'start' ? 'iniciada' : 'detenida'} correctamente`
    });
  } catch (error) {
    console.error('❌ Error controlando automatización:', error);
    res.status(500).json({
      success: false,
      error: 'Error controlando automatización',
      message: error.message
    });
  }
});

module.exports = router;