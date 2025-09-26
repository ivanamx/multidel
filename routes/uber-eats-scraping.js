const express = require('express');
const router = express.Router();
const uberEatsScrapingService = require('../services/uberEatsScrapingService');

// Endpoint para obtener estado del scraper de Uber Eats
router.get('/status', (req, res) => {
  try {
    const status = uberEatsScrapingService.getStatus();
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

// Endpoint para iniciar monitoreo de Uber Eats
router.post('/start', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }

    await uberEatsScrapingService.startMonitoring(email, password);
    res.json({
      success: true,
      message: 'Monitoreo de Uber Eats iniciado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando monitoreo de Uber Eats',
      message: error.message
    });
  }
});

// Endpoint para detener monitoreo de Uber Eats
router.post('/stop', (req, res) => {
  try {
    uberEatsScrapingService.stopMonitoring();
    res.json({
      success: true,
      message: 'Monitoreo de Uber Eats detenido correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deteniendo monitoreo de Uber Eats',
      message: error.message
    });
  }
});

// Endpoint para probar login
router.post('/test-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }

    const loginSuccess = await uberEatsScrapingService.login(email, password);
    
    res.json({
      success: loginSuccess,
      message: loginSuccess ? 'Login exitoso' : 'Login fallido'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error probando login',
      message: error.message
    });
  }
});

// Endpoint para extraer pedidos manualmente
router.post('/extract-orders', async (req, res) => {
  try {
    if (!uberEatsScrapingService.isLoggedIn) {
      return res.status(400).json({
        success: false,
        error: 'No hay sesión activa. Hacer login primero.'
      });
    }

    await uberEatsScrapingService.navigateToOrders();
    const orders = await uberEatsScrapingService.extractOrders();
    
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
    const uberEatsConfig = require('../config/uberEatsScraping');
    res.json({
      success: true,
      data: {
        urls: uberEatsConfig.uberEats.urls,
        monitoring: uberEatsConfig.uberEats.monitoring,
        selectors: Object.keys(uberEatsConfig.uberEats.selectors)
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

module.exports = router;
