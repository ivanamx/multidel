const express = require('express');
const router = express.Router();
const didiFoodScrapingService = require('../services/didiFoodScrapingService');

// Endpoint para obtener estado del scraper de Didí Food
router.get('/status', (req, res) => {
  try {
    const status = didiFoodScrapingService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del scraper',
      message: error.message
    });
  }
});

// Endpoint para iniciar monitoreo de Didí Food
router.post('/start', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }

    await didiFoodScrapingService.startMonitoring(email, password, phone);
    res.json({
      success: true,
      message: 'Monitoreo de Didí Food iniciado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando monitoreo de Didí Food',
      message: error.message
    });
  }
});

// Endpoint para detener monitoreo de Didí Food
router.post('/stop', (req, res) => {
  try {
    didiFoodScrapingService.stopMonitoring();
    res.json({
      success: true,
      message: 'Monitoreo de Didí Food detenido correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deteniendo monitoreo de Didí Food',
      message: error.message
    });
  }
});

// Endpoint para probar login
router.post('/test-login', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }

    const loginResult = await didiFoodScrapingService.login(email, password, phone);
    
    res.json({
      success: loginResult.success,
      requiresSMS: loginResult.requiresSMS || false,
      message: loginResult.success ? 'Login exitoso' : 
               loginResult.requiresSMS ? 'Se requiere verificación SMS' : 'Login fallido'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error probando login',
      message: error.message
    });
  }
});

// Endpoint para manejar verificación SMS
router.post('/sms-verification', async (req, res) => {
  try {
    const { phone, verificationCode } = req.body;
    
    if (!phone || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: 'Teléfono y código de verificación requeridos'
      });
    }

    const verificationResult = await didiFoodScrapingService.handleSMSVerification(phone, verificationCode);
    
    res.json({
      success: verificationResult.success,
      message: verificationResult.success ? 'Verificación SMS exitosa' : 'Verificación SMS fallida'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error en verificación SMS',
      message: error.message
    });
  }
});

// Endpoint para extraer pedidos manualmente
router.post('/extract-orders', async (req, res) => {
  try {
    if (!didiFoodScrapingService.isLoggedIn) {
      return res.status(400).json({
        success: false,
        error: 'No hay sesión activa. Hacer login primero.'
      });
    }

    await didiFoodScrapingService.navigateToOrders();
    const orders = await didiFoodScrapingService.extractOrders();
    
    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error extrayendo pedidos',
      message: error.message
    });
  }
});

// Endpoint para obtener configuración actual
router.get('/config', (req, res) => {
  try {
    const didiFoodConfig = require('../config/didiFoodScraping');
    res.json({
      success: true,
      data: {
        urls: didiFoodConfig.didiFood.urls,
        monitoring: didiFoodConfig.didiFood.monitoring,
        selectors: Object.keys(didiFoodConfig.didiFood.selectors),
        features: didiFoodConfig.didiFood.features
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo configuración',
      message: error.message
    });
  }
});

// Endpoint para verificar si requiere SMS
router.get('/sms-required', (req, res) => {
  try {
    const status = didiFoodScrapingService.getStatus();
    res.json({
      success: true,
      requiresSMS: status.requiresSMSVerification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error verificando estado SMS',
      message: error.message
    });
  }
});

module.exports = router;
