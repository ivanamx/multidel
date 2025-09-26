const express = require('express');
const router = express.Router();
const deliveryTrackingService = require('../services/deliveryTrackingService');
const db = require('../config/database');

// Obtener ubicaciones en tiempo real de todas las entregas activas
router.get('/locations', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Obtener pedidos en entrega
        const ordersResult = await db.query(`
            SELECT o.id, p.name as platform_name, o.platform_order_id, o.customer_name, o.total_amount, o.status
            FROM orders o
            JOIN platforms p ON o.platform_id = p.id
            WHERE DATE(o.created_at) = $1 
            AND o.status IN ('delivering', 'ready')
        `, [today]);

        const orders = ordersResult.rows;
        const trackingData = [];

        // Obtener datos de tracking para cada orden
        for (const order of orders) {
            const tracking = deliveryTrackingService.getTrackingData(order.id);
            if (tracking) {
                trackingData.push({
                    ...tracking,
                    status: order.status, // Usar el estado real del pedido
                    order: order
                });
            } else {
                // Si no hay tracking activo, usar datos simulados
                trackingData.push({
                    orderId: order.id,
                    platform: order.platform_name,
                    driverLocation: {
                        lat: 19.4326 + (Math.random() - 0.5) * 0.02,
                        lng: -99.1332 + (Math.random() - 0.5) * 0.02
                    },
                    estimatedArrival: new Date(Date.now() + Math.random() * 30 * 60 * 1000),
                    status: order.status, // Usar el estado real del pedido
                    lastUpdated: new Date(),
                    order: order
                });
            }
        }

        res.json({
            success: true,
            data: trackingData
        });
    } catch (error) {
        console.error('Error obteniendo ubicaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo ubicaciones'
        });
    }
});

// Iniciar tracking para una orden específica
router.post('/start/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { updateInterval = 30000 } = req.body;

        // Obtener información de la orden
        const orderResult = await db.query(`
            SELECT p.name as platform_name, o.platform_order_id 
            FROM orders o
            JOIN platforms p ON o.platform_id = p.id
            WHERE o.id = $1
        `, [orderId]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }

        const order = orderResult.rows[0];

        // Iniciar tracking
        await deliveryTrackingService.startTracking(
            orderId,
            order.platform_name,
            order.platform_order_id,
            updateInterval
        );

        res.json({
            success: true,
            message: `Tracking iniciado para orden ${orderId}`
        });
    } catch (error) {
        console.error('Error iniciando tracking:', error);
        res.status(500).json({
            success: false,
            message: 'Error iniciando tracking'
        });
    }
});

// Detener tracking para una orden específica
router.post('/stop/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        deliveryTrackingService.stopTracking(orderId);

        res.json({
            success: true,
            message: `Tracking detenido para orden ${orderId}`
        });
    } catch (error) {
        console.error('Error deteniendo tracking:', error);
        res.status(500).json({
            success: false,
            message: 'Error deteniendo tracking'
        });
    }
});

// Obtener historial de tracking de una orden
router.get('/history/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const history = await deliveryTrackingService.getTrackingHistory(orderId);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo historial'
        });
    }
});

// Obtener estadísticas de tracking
router.get('/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Obtener estadísticas de tracking del día
        const statsResult = await db.query(`
            SELECT 
                COUNT(*) as total_deliveries,
                AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/60) as avg_delivery_time,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_deliveries
            FROM delivery_tracking 
            WHERE DATE(created_at) = $1
        `, [today]);

        const stats = statsResult.rows[0];

        res.json({
            success: true,
            data: {
                totalDeliveries: parseInt(stats.total_deliveries) || 0,
                avgDeliveryTime: Math.round(parseFloat(stats.avg_delivery_time) || 0),
                completedDeliveries: parseInt(stats.completed_deliveries) || 0,
                activeTracking: deliveryTrackingService.getAllTrackingData().length
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas'
        });
    }
});

// Limpiar datos antiguos
router.post('/cleanup', async (req, res) => {
    try {
        const deletedCount = await deliveryTrackingService.cleanupOldTrackingData();
        res.json({ success: true, message: `${deletedCount} registros eliminados` });
    } catch (error) {
        console.error('Error limpiando datos:', error);
        res.status(500).json({ success: false, message: 'Error limpiando datos' });
    }
});

// Activar tracking automático para un pedido específico
router.post('/auto-start/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const activated = await deliveryTrackingService.autoStartTracking(orderId);
        
        if (activated) {
            res.json({ success: true, message: `Tracking activado para pedido ${orderId}` });
        } else {
            res.status(404).json({ success: false, message: `Pedido ${orderId} no está listo para tracking` });
        }
    } catch (error) {
        console.error('Error activando tracking automático:', error);
        res.status(500).json({ success: false, message: 'Error activando tracking' });
    }
});

// Detener tracking automático para un pedido específico
router.post('/auto-stop/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const deactivated = await deliveryTrackingService.autoStopTracking(orderId);
        
        if (deactivated) {
            res.json({ success: true, message: `Tracking detenido para pedido ${orderId}` });
        } else {
            res.status(404).json({ success: false, message: `Pedido ${orderId} no está entregado` });
        }
    } catch (error) {
        console.error('Error deteniendo tracking automático:', error);
        res.status(500).json({ success: false, message: 'Error deteniendo tracking' });
    }
});

// Verificar y activar tracking para todos los pedidos listos
router.post('/check-and-activate', async (req, res) => {
    try {
        const activatedCount = await deliveryTrackingService.checkAndActivateTracking();
        res.json({ 
            success: true, 
            message: `Verificación completada`,
            activatedCount,
            details: activatedCount > 0 ? `${activatedCount} pedidos con tracking activado` : 'No hay pedidos nuevos para tracking'
        });
    } catch (error) {
        console.error('Error verificando tracking automático:', error);
        res.status(500).json({ success: false, message: 'Error verificando tracking' });
    }
});

// Verificar y detener tracking para todos los pedidos entregados
router.post('/check-and-deactivate', async (req, res) => {
    try {
        const deactivatedCount = await deliveryTrackingService.checkAndDeactivateTracking();
        res.json({ 
            success: true, 
            message: `Verificación completada`,
            deactivatedCount,
            details: deactivatedCount > 0 ? `${deactivatedCount} pedidos con tracking detenido` : 'No hay pedidos para detener tracking'
        });
    } catch (error) {
        console.error('Error verificando desactivación automática:', error);
        res.status(500).json({ success: false, message: 'Error verificando desactivación' });
    }
});

// Obtener estado de tracking automático
router.get('/auto-status', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_active,
                COUNT(CASE WHEN o.status = 'ready' THEN 1 END) as ready_for_tracking,
                COUNT(CASE WHEN o.status = 'delivering' THEN 1 END) as currently_tracking,
                COUNT(CASE WHEN o.status = 'delivered' AND dt.order_id IS NOT NULL THEN 1 END) as delivered_with_tracking
            FROM orders o
            JOIN platforms p ON o.platform_id = p.id
            LEFT JOIN delivery_tracking dt ON o.id = dt.order_id
            WHERE o.status IN ('ready', 'delivering', 'delivered')
            AND o.created_at >= NOW() - INTERVAL '24 hours'
        `);

        const status = result.rows[0];
        res.json({
            success: true,
            data: {
                totalActive: parseInt(status.total_active),
                readyForTracking: parseInt(status.ready_for_tracking),
                currentlyTracking: parseInt(status.currently_tracking),
                deliveredWithTracking: parseInt(status.delivered_with_tracking),
                autoTrackingEnabled: true
            }
        });
    } catch (error) {
        console.error('Error obteniendo estado de tracking automático:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo estado' });
    }
});

// Obtener rutas reales de entrega
router.get('/routes', async (req, res) => {
    try {
        const routes = await deliveryTrackingService.getAllActiveRoutes();
        res.json({
            success: true,
            data: routes,
            count: routes.length
        });
    } catch (error) {
        console.error('Error obteniendo rutas de entrega:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo rutas' });
    }
});

// Obtener ruta específica de un pedido
router.get('/routes/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const route = await deliveryTrackingService.getDeliveryRoute(orderId);
        
        if (route) {
            res.json({
                success: true,
                data: route
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Ruta no encontrada para pedido ${orderId}`
            });
        }
    } catch (error) {
        console.error('Error obteniendo ruta específica:', error);
        res.status(500).json({ success: false, message: 'Error obteniendo ruta' });
    }
});

module.exports = router;