const express = require('express');
const router = express.Router();
const emailMonitoringService = require('../services/emailMonitoringService');
const rappiEmailParser = require('../services/rappiEmailParser');

// Endpoint para obtener estado del monitoreo de emails
router.get('/status', (req, res) => {
  try {
    const status = emailMonitoringService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado del monitoreo',
      message: error.message
    });
  }
});

// Endpoint para iniciar monitoreo de emails
router.post('/start', async (req, res) => {
  try {
    await emailMonitoringService.startMonitoring();
    res.json({
      success: true,
      message: 'Monitoreo de emails iniciado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando monitoreo de emails',
      message: error.message
    });
  }
});

// Endpoint para detener monitoreo de emails
router.post('/stop', (req, res) => {
  try {
    emailMonitoringService.stopMonitoring();
    res.json({
      success: true,
      message: 'Monitoreo de emails detenido correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error deteniendo monitoreo de emails',
      message: error.message
    });
  }
});

// Endpoint para probar parser con texto de ejemplo
router.post('/test-parser', async (req, res) => {
  try {
    const { testText } = req.body;
    
    if (!testText) {
      return res.status(400).json({
        success: false,
        error: 'Texto de prueba requerido'
      });
    }

    const result = await rappiEmailParser.testParser(testText);
    
    res.json({
      success: true,
      data: result,
      message: result ? 'Parser funcionando correctamente' : 'No se pudieron extraer datos del texto'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error probando parser',
      message: error.message
    });
  }
});

// Endpoint para verificar conexión de email
router.post('/test-connection', async (req, res) => {
  try {
    await emailMonitoringService.connect();
    emailMonitoringService.disconnect();
    
    res.json({
      success: true,
      message: 'Conexión de email exitosa'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error conectando al servidor de email',
      message: error.message
    });
  }
});

module.exports = router;
