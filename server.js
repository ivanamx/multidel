const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const cron = require('node-cron');

// Importar servicios
const deliveryTrackingService = require('./services/deliveryTrackingService');
const automationService = require('./services/automationService');
const emailMonitoringService = require('./services/emailMonitoringService');
const uberEatsScrapingService = require('./services/uberEatsScrapingService');
const didiFoodScrapingService = require('./services/didiFoodScrapingService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Hacer io disponible globalmente
global.io = io;

const PORT = process.env.PORT || 3000;

// Configurar rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por ventana
});

// Configurar middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://cdn.socket.io"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "*.svg"],
            connectSrc: ["'self'", "https://cdn.socket.io"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    }
}));

app.use(cors());
app.use(limiter);
app.use(express.json());

// Servir archivos estáticos desde la carpeta public
app.use(express.static('public'));

// Configurar tarea programada para tracking automático
cron.schedule('*/2 * * * *', async () => {
    try {
        console.log('🔄 Verificando tracking automático...');
        
        // Verificar y activar tracking para pedidos listos
        const activatedCount = await deliveryTrackingService.checkAndActivateTracking();
        
        // Verificar y detener tracking para pedidos entregados
        const deactivatedCount = await deliveryTrackingService.checkAndDeactivateTracking();
        
        if (activatedCount > 0 || deactivatedCount > 0) {
            console.log(`✅ Tracking automático: ${activatedCount} activados, ${deactivatedCount} detenidos`);
        }
    } catch (error) {
        console.error('❌ Error en tarea programada de tracking:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Mexico_City"
});

// Configurar tarea programada para actualizaciones del dashboard
cron.schedule('*/30 * * * * *', async () => {
    try {
        // Emitir actualización de estadísticas cada 30 segundos
        if (global.emitDashboardUpdate) {
            const db = require('./config/database');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Obtener estadísticas rápidas
                         const todayOrdersResult = await db.query(`
                 SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
                 FROM orders 
                 WHERE DATE(created_at) = CURRENT_DATE
             `);
            
                         const pendingResult = await db.query(`
                 SELECT COUNT(*) as count
                 FROM orders 
                 WHERE status IN ('pending', 'preparing') AND DATE(created_at) = CURRENT_DATE
             `);
            
                         const deliveryResult = await db.query(`
                 SELECT COUNT(*) as count
                 FROM orders 
                 WHERE status = 'delivering' AND DATE(created_at) = CURRENT_DATE
             `);
            
            const statsData = {
                today: {
                    count: parseInt(todayOrdersResult.rows[0].count),
                    revenue: parseFloat(todayOrdersResult.rows[0].total)
                },
                pending: {
                    count: parseInt(pendingResult.rows[0].count)
                },
                delivery: {
                    count: parseInt(deliveryResult.rows[0].count)
                }
            };
            
            global.emitDashboardUpdate('stats', statsData);
        }
    } catch (error) {
        console.error('❌ Error en actualización automática del dashboard:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Mexico_City"
});

console.log('📅 Tarea programada de tracking automático configurada (cada 2 minutos)');
console.log('📅 Tarea programada de actualización del dashboard configurada (cada 30 segundos)');

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/platforms', require('./routes/platforms'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/email-monitoring', require('./routes/email-monitoring'));
app.use('/api/uber-eats-scraping', require('./routes/uber-eats-scraping'));
app.use('/api/didi-food-scraping', require('./routes/didi-food-scraping'));

// Servir archivos estáticos
app.use(express.static('public'));

// Ruta específica para servir archivos de imágenes
app.get('/images/:filename', (req, res) => {
    const filename = req.params.filename;
    res.sendFile(`${__dirname}/public/images/${filename}`);
});

// Ruta para el dashboard
app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/public/dashboard.html`);
});

// Ruta para el login
app.get('/login', (req, res) => {
    res.sendFile(`${__dirname}/public/login.html`);
});

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MultiDel API funcionando correctamente',
    timestamp: new Date().toISOString(),
    services: {
      automation: automationService.getStatus ? automationService.getStatus() : 'active',
      emailMonitoring: emailMonitoringService.getStatus(),
      uberEatsScraping: uberEatsScrapingService.getStatus(),
      didiFoodScraping: didiFoodScrapingService.getStatus()
    }
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

server.listen(PORT, () => {
  console.log(`🚀 MultiDel API corriendo en puerto ${PORT}`);
  console.log(`📊 Dashboard disponible en: http://localhost:${PORT}/api/dashboard`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Iniciar sistema de automatización de tracking al arrancar el servidor
  console.log('🤖 Iniciando sistema de automatización de tracking...');
  automationService.startMonitoring();
  console.log('✅ Sistema de automatización iniciado correctamente');
  
  // Iniciar monitoreo de emails
  console.log('📧 Iniciando monitoreo de emails...');
  emailMonitoringService.startMonitoring().then(() => {
    console.log('✅ Monitoreo de emails iniciado correctamente');
  }).catch((error) => {
    console.error('❌ Error iniciando monitoreo de emails:', error);
    console.log('⚠️ El sistema continuará sin monitoreo de emails');
  });
  
  // Iniciar monitoreo de Uber Eats (si está configurado)
  if (process.env.UBER_EATS_EMAIL && process.env.UBER_EATS_PASSWORD) {
    console.log('🌐 Iniciando monitoreo de Uber Eats...');
    uberEatsScrapingService.startMonitoring(
      process.env.UBER_EATS_EMAIL, 
      process.env.UBER_EATS_PASSWORD
    ).then(() => {
      console.log('✅ Monitoreo de Uber Eats iniciado correctamente');
    }).catch((error) => {
      console.error('❌ Error iniciando monitoreo de Uber Eats:', error);
      console.log('⚠️ El sistema continuará sin monitoreo de Uber Eats');
    });
  } else {
    console.log('⚠️ Credenciales de Uber Eats no configuradas - omitiendo monitoreo');
  }
  
  // Iniciar monitoreo de Didí Food (si está configurado)
  if (process.env.DIDI_FOOD_EMAIL && process.env.DIDI_FOOD_PASSWORD) {
    console.log('🚗 Iniciando monitoreo de Didí Food...');
    didiFoodScrapingService.startMonitoring(
      process.env.DIDI_FOOD_EMAIL, 
      process.env.DIDI_FOOD_PASSWORD,
      process.env.DIDI_FOOD_PHONE
    ).then(() => {
      console.log('✅ Monitoreo de Didí Food iniciado correctamente');
    }).catch((error) => {
      console.error('❌ Error iniciando monitoreo de Didí Food:', error);
      console.log('⚠️ El sistema continuará sin monitoreo de Didí Food');
    });
  } else {
    console.log('⚠️ Credenciales de Didí Food no configuradas - omitiendo monitoreo');
  }
  
  console.log('📋 El sistema ahora:');
  console.log('   - Monitorea cambios de estado cada 30 segundos');
  console.log('   - Activa tracking automáticamente cuando un pedido cambia a "delivering"');
  console.log('   - Desactiva tracking automáticamente cuando un pedido cambia a "delivered"');
  console.log('   - Activa tracking para pedidos en estado "ready" (opcional)');
  console.log('   - Muestra ubicaciones en tiempo real en el mapa');
  console.log('   - Monitorea emails de Rappi cada minuto');
  console.log('   - Monitorea panel web de Uber Eats cada minuto');
  console.log('   - Monitorea panel web de Didí Food cada 1.5 minutos');
});

// Configurar eventos de Socket.IO
io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
    
    // Unirse a la sala del dashboard
    socket.join('dashboard');
    
    socket.on('disconnect', () => {
        console.log('🔌 Cliente desconectado:', socket.id);
    });
});

// Función para emitir actualizaciones al dashboard
function emitDashboardUpdate(type, data) {
    io.to('dashboard').emit('dashboardUpdate', { type, data, timestamp: new Date() });
}

// Hacer la función disponible globalmente
global.emitDashboardUpdate = emitDashboardUpdate;

module.exports = app;