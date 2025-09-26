const axios = require('axios');
const db = require('../config/database');
const routeService = require('./routeService');

class DeliveryTrackingService {
    constructor() {
        this.trackingData = new Map();
        this.updateIntervals = new Map();
    }

    // Obtener ubicación en tiempo real de Uber Eats
    async getUberEatsLocation(orderId, platformOrderId) {
        try {
            const response = await axios.get(
                `${process.env.UBER_EATS_PRODUCTION_URL}/orders/${platformOrderId}/delivery_status`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.UBER_EATS_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.delivery_status) {
                const status = response.data.delivery_status;
                return {
                    orderId,
                    platform: 'Uber Eats',
                    driverLocation: {
                        lat: status.courier_location?.latitude,
                        lng: status.courier_location?.longitude
                    },
                    estimatedArrival: status.estimated_arrival_time,
                    status: status.status,
                    lastUpdated: new Date()
                };
            }
        } catch (error) {
            console.error(`Error obteniendo ubicación Uber Eats para orden ${orderId}:`, error.message);
        }
        return null;
    }

    // Obtener ubicación en tiempo real de Rappi
    async getRappiLocation(orderId, platformOrderId) {
        try {
            const response = await axios.get(
                `${process.env.RAPPI_API_URL}/orders/${platformOrderId}/tracking`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.RAPPI_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.tracking) {
                const tracking = response.data.tracking;
                return {
                    orderId,
                    platform: 'Rappi',
                    driverLocation: {
                        lat: tracking.courier_location?.lat,
                        lng: tracking.courier_location?.lng
                    },
                    estimatedArrival: tracking.estimated_delivery_time,
                    status: tracking.status,
                    lastUpdated: new Date()
                };
            }
        } catch (error) {
            console.error(`Error obteniendo ubicación Rappi para orden ${orderId}:`, error.message);
        }
        return null;
    }

    // Obtener ubicación en tiempo real de Didi Food
    async getDidiLocation(orderId, platformOrderId) {
        try {
            const response = await axios.get(
                `${process.env.DIDI_API_URL}/orders/${platformOrderId}/delivery-location`,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.DIDI_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.location) {
                const location = response.data.location;
                return {
                    orderId,
                    platform: 'Didi Food',
                    driverLocation: {
                        lat: location.latitude,
                        lng: location.longitude
                    },
                    estimatedArrival: location.estimated_arrival,
                    status: location.status,
                    lastUpdated: new Date()
                };
            }
        } catch (error) {
            console.error(`Error obteniendo ubicación Didi para orden ${orderId}:`, error.message);
        }
        return null;
    }



    // Obtener ubicación según la plataforma
    async getDriverLocation(orderId, platformName, platformOrderId) {
        if (!platformName) {
            console.warn(`Plataforma no definida para orden ${orderId}`);
            return null;
        }
        
        switch (platformName.toLowerCase()) {
            case 'uber eats':
                return await this.getUberEatsLocation(orderId, platformOrderId);
            case 'rappi':
                return await this.getRappiLocation(orderId, platformOrderId);
            case 'didi food':
                return await this.getDidiLocation(orderId, platformOrderId);
            default:
                console.warn(`Plataforma no soportada para tracking: ${platformName}`);
                return null;
        }
    }

    // Iniciar tracking para una orden
    async startTracking(orderId, platformName, platformOrderId, updateInterval = 30000) {
        // Detener tracking anterior si existe
        this.stopTracking(orderId);

        // Función de actualización
        const updateLocation = async () => {
            const locationData = await this.getDriverLocation(orderId, platformName, platformOrderId);
            if (locationData) {
                this.trackingData.set(orderId, locationData);
                
                // Guardar en base de datos
                await this.saveTrackingData(locationData);
                
                // Emitir evento para actualizar el frontend
                this.emitLocationUpdate(locationData);
            }
        };

        // Actualización inmediata
        await updateLocation();

        // Configurar intervalo
        const interval = setInterval(updateLocation, updateInterval);
        this.updateIntervals.set(orderId, interval);

        console.log(`Tracking iniciado para orden ${orderId} (${platformName})`);
    }

    // Detener tracking para una orden
    stopTracking(orderId) {
        const interval = this.updateIntervals.get(orderId);
        if (interval) {
            clearInterval(interval);
            this.updateIntervals.delete(orderId);
            this.trackingData.delete(orderId);
            console.log(`Tracking detenido para orden ${orderId}`);
        }
    }

    // Obtener datos de tracking actuales
    getTrackingData(orderId) {
        return this.trackingData.get(orderId);
    }

    // Obtener todos los datos de tracking
    getAllTrackingData() {
        return Array.from(this.trackingData.values());
    }

    // Guardar datos de tracking en base de datos
    async saveTrackingData(locationData) {
        try {
            const query = `
                INSERT INTO delivery_tracking 
                (order_id, platform, driver_lat, driver_lng, estimated_arrival, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (order_id) 
                DO UPDATE SET 
                    driver_lat = EXCLUDED.driver_lat,
                    driver_lng = EXCLUDED.driver_lng,
                    estimated_arrival = EXCLUDED.estimated_arrival,
                    status = EXCLUDED.status,
                    updated_at = NOW()
            `;

            await db.query(query, [
                locationData.orderId,
                locationData.platform,
                locationData.driverLocation.lat,
                locationData.driverLocation.lng,
                locationData.estimatedArrival,
                locationData.status,
                locationData.lastUpdated
            ]);
        } catch (error) {
            console.error('Error guardando datos de tracking:', error);
        }
    }

    // Emitir actualización de ubicación (para WebSocket)
    emitLocationUpdate(locationData) {
        // Aquí se implementaría la emisión de eventos WebSocket
        // para actualizar el frontend en tiempo real
        if (global.io) {
            global.io.emit('locationUpdate', locationData);
        }
    }

    // Obtener historial de tracking de una orden
    async getTrackingHistory(orderId) {
        try {
            const query = `
                SELECT * FROM delivery_tracking 
                WHERE order_id = $1 
                ORDER BY created_at DESC 
                LIMIT 100
            `;
            
            const result = await db.query(query, [orderId]);
            return result.rows;
        } catch (error) {
            console.error('Error obteniendo historial de tracking:', error);
            return [];
        }
    }

    // Limpiar datos antiguos de tracking
    async cleanupOldTrackingData() {
        try {
            const result = await db.query(`
                DELETE FROM delivery_tracking 
                WHERE updated_at < NOW() - INTERVAL '24 hours'
            `);
            console.log(`🧹 Limpieza: ${result.rowCount} registros de tracking eliminados`);
            return result.rowCount;
        } catch (error) {
            console.error('Error limpiando datos antiguos de tracking:', error);
            return 0;
        }
    }

    // Activar tracking automáticamente cuando un pedido está listo
    async autoStartTracking(orderId) {
        try {
            // Verificar si el pedido existe y está en estado ready
            const orderResult = await db.query(`
                SELECT o.id, p.name as platform_name, o.platform_order_id, o.status, o.customer_name, o.total_amount
                FROM orders o
                JOIN platforms p ON o.platform_id = p.id
                WHERE o.id = $1 AND o.status = 'ready'
            `, [orderId]);

            if (orderResult.rows.length === 0) {
                console.log(`❌ Pedido ${orderId} no encontrado o no está listo para tracking`);
                return false;
            }

            const order = orderResult.rows[0];
            console.log(`🚀 Activando tracking automático para pedido ${orderId} (${order.platform_name})`);

            // Iniciar tracking
            await this.startTracking(orderId, order.platform_name, order.platform_order_id);

            // Emitir evento de tracking iniciado (para WebSocket en el futuro)
            this.emitTrackingStarted(orderId, order);

            return true;
        } catch (error) {
            console.error(`Error activando tracking automático para pedido ${orderId}:`, error);
            return false;
        }
    }

    // Detener tracking automáticamente cuando un pedido se entrega
    async autoStopTracking(orderId) {
        try {
            // Verificar si el pedido existe y está entregado
            const orderResult = await db.query(`
                SELECT o.id, p.name as platform_name, o.platform_order_id, o.status
                FROM orders o
                JOIN platforms p ON o.platform_id = p.id
                WHERE o.id = $1 AND o.status = 'delivered'
            `, [orderId]);

            if (orderResult.rows.length === 0) {
                console.log(`❌ Pedido ${orderId} no encontrado o no está entregado`);
                return false;
            }

            const order = orderResult.rows[0];
            console.log(`🛑 Deteniendo tracking automático para pedido ${orderId} (${order.platform_name})`);

            // Detener tracking
            await this.stopTracking(orderId);

            // Emitir evento de tracking detenido (para WebSocket en el futuro)
            this.emitTrackingStopped(orderId, order);

            return true;
        } catch (error) {
            console.error(`Error deteniendo tracking automático para pedido ${orderId}:`, error);
            return false;
        }
    }

    // Emitir evento de tracking iniciado (placeholder para WebSocket)
    emitTrackingStarted(orderId, order) {
        console.log(`📡 Evento: Tracking iniciado para pedido ${orderId}`);
        // Aquí se emitiría un evento WebSocket para actualizar el frontend en tiempo real
        // socket.emit('tracking_started', { orderId, order });
    }

    // Emitir evento de tracking detenido (placeholder para WebSocket)
    emitTrackingStopped(orderId, order) {
        console.log(`📡 Evento: Tracking detenido para pedido ${orderId}`);
        // Aquí se emitiría un evento WebSocket para actualizar el frontend en tiempo real
        // socket.emit('tracking_stopped', { orderId, order });
    }

    // Verificar y activar tracking para todos los pedidos listos
    async checkAndActivateTracking() {
        try {
            // Buscar todos los pedidos en estado 'ready' que no tienen tracking activo
            const result = await db.query(`
                SELECT o.id, p.name as platform_name, o.platform_order_id, o.customer_name, o.total_amount
                FROM orders o
                JOIN platforms p ON o.platform_id = p.id
                LEFT JOIN delivery_tracking dt ON o.id = dt.order_id
                WHERE o.status = 'ready' 
                AND dt.order_id IS NULL
                AND o.created_at >= NOW() - INTERVAL '2 hours'
            `);

            let activatedCount = 0;
            for (const order of result.rows) {
                const activated = await this.autoStartTracking(order.id);
                if (activated) activatedCount++;
            }

            if (activatedCount > 0) {
                console.log(`✅ Tracking automático activado para ${activatedCount} pedidos`);
            }

            return activatedCount;
        } catch (error) {
            console.error('Error verificando tracking automático:', error);
            return 0;
        }
    }

    // Verificar y detener tracking para todos los pedidos entregados
    async checkAndDeactivateTracking() {
        try {
            // Buscar todos los pedidos en estado 'delivered' que tienen tracking activo
            const result = await db.query(`
                SELECT o.id, p.name as platform_name, o.platform_order_id
                FROM orders o
                JOIN platforms p ON o.platform_id = p.id
                INNER JOIN delivery_tracking dt ON o.id = dt.order_id
                WHERE o.status = 'delivered'
            `);

            let deactivatedCount = 0;
            for (const order of result.rows) {
                const deactivated = await this.autoStopTracking(order.id);
                if (deactivated) deactivatedCount++;
            }

            if (deactivatedCount > 0) {
                console.log(`🛑 Tracking automático detenido para ${deactivatedCount} pedidos`);
            }

            return deactivatedCount;
        } catch (error) {
            console.error('Error verificando desactivación automática de tracking:', error);
            return 0;
        }
    }

    // Obtener ruta real de entrega
    async getDeliveryRoute(orderId) {
        try {
            // Obtener información del pedido con coordenadas
            const orderResult = await db.query(`
                SELECT o.*, p.name as platform_name
                FROM orders o
                JOIN platforms p ON o.platform_id = p.id
                WHERE o.id = $1
            `, [orderId]);

            if (orderResult.rows.length === 0) {
                return null;
            }

            const order = orderResult.rows[0];
            
            // Ubicación del restaurante (puedes ajustar estas coordenadas)
            const restaurantLocation = {
                lat: 19.4326, // Ciudad de México (ajusta a tu ubicación)
                lng: -99.1332
            };

            // Usar coordenadas reales del pedido si están disponibles, o generar nuevas
            let driverLocation;
            if (order.driver_lat && order.driver_lng) {
                driverLocation = {
                    lat: parseFloat(order.driver_lat),
                    lng: parseFloat(order.driver_lng)
                };
            } else {
                // Generar coordenadas aleatorias válidas
                const driverLatOffset = (Math.random() - 0.5) * 0.02;
                const driverLngOffset = (Math.random() - 0.5) * 0.02;
                driverLocation = {
                    lat: restaurantLocation.lat + driverLatOffset,
                    lng: restaurantLocation.lng + driverLngOffset
                };
            }

            let customerLocation;
            if (order.customer_lat && order.customer_lng) {
                customerLocation = {
                    lat: parseFloat(order.customer_lat),
                    lng: parseFloat(order.customer_lng)
                };
            } else {
                // Generar coordenadas aleatorias válidas
                const customerLatOffset = (Math.random() - 0.5) * 0.05;
                const customerLngOffset = (Math.random() - 0.5) * 0.05;
                customerLocation = {
                    lat: restaurantLocation.lat + customerLatOffset,
                    lng: restaurantLocation.lng + customerLngOffset
                };
            }

            // Obtener ruta real
            const route = await routeService.getDeliveryRoute(
                restaurantLocation.lat, restaurantLocation.lng,
                driverLocation.lat, driverLocation.lng,
                customerLocation.lat, customerLocation.lng
            );

            if (route) {
                return {
                    orderId,
                    platform: order.platform_name,
                    restaurant: restaurantLocation,
                    driver: driverLocation,
                    customer: customerLocation,
                    route: route,
                    estimatedArrival: new Date(Date.now() + route.totalDuration * 60 * 1000),
                    status: 'en_ruta',
                    lastUpdated: new Date(),
                    order: order
                };
            }

            return null;
        } catch (error) {
            console.error(`Error obteniendo ruta de entrega para pedido ${orderId}:`, error);
            return null;
        }
    }

    // Obtener todas las rutas activas
    async getAllActiveRoutes() {
        try {
            const result = await db.query(`
                SELECT o.id, p.name as platform_name, o.customer_name, o.total_amount
                FROM orders o
                JOIN platforms p ON o.platform_id = p.id
                WHERE o.status IN ('ready', 'delivering')
                AND o.created_at >= NOW() - INTERVAL '2 hours'
            `);

            const routes = [];
            for (const order of result.rows) {
                const route = await this.getDeliveryRoute(order.id);
                if (route) {
                    routes.push({ ...route, order });
                }
            }

            return routes;
        } catch (error) {
            console.error('Error obteniendo rutas activas:', error);
            return [];
        }
    }
}

module.exports = new DeliveryTrackingService();