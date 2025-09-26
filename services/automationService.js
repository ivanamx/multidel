const db = require('../config/database');
const uberEatsService = require('./uberEatsService');
const rappiService = require('./rappiService');
const platformService = require('./platformService');
const deliveryTrackingService = require('./deliveryTrackingService');

class AutomationService {
  constructor() {
    this.pollingInterval = null;
    this.isPollingActive = false;
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.lastCheck = null;
  }

  // Iniciar el sistema de automatización
  async startAutomation() {
    console.log('🤖 Iniciando sistema de automatización híbrida...');
    
    // Iniciar polling de respaldo
    this.startPolling();
    
    console.log('✅ Automatización iniciada: Webhooks + Polling de respaldo');
  }

  // Detener el sistema de automatización
  stopAutomation() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.isPollingActive = false;
      console.log('🛑 Automatización detenida');
    }
  }

  // Polling de respaldo cada 2 minutos
  startPolling() {
    if (this.isPollingActive) {
      console.log('⚠️ Polling ya está activo');
      return;
    }

    this.isPollingActive = true;
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkAndUpdateStatuses();
      } catch (error) {
        console.error('❌ Error en polling de automatización:', error);
      }
    }, 120000); // 2 minutos

    console.log('🔄 Polling de respaldo iniciado (cada 2 minutos)');
  }

  // Verificar y actualizar estados automáticamente
  async checkAndUpdateStatuses() {
    try {
      // Obtener pedidos que necesitan verificación
      const ordersToCheck = await this.getOrdersToCheck();
      
      if (ordersToCheck.length === 0) {
        return;
      }

      console.log(`🔍 Verificando ${ordersToCheck.length} pedidos...`);

      for (const order of ordersToCheck) {
        try {
          await this.checkOrderStatus(order);
        } catch (error) {
          console.error(`❌ Error verificando pedido ${order.id}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error en verificación de estados:', error);
    }
  }

  // Obtener pedidos que necesitan verificación
  async getOrdersToCheck() {
    const query = `
      SELECT o.id, p.name as platform_name, o.platform_order_id, o.status, o.updated_at
      FROM orders o
      JOIN platforms p ON o.platform_id = p.id
      WHERE o.status IN ('pending', 'preparing', 'ready', 'delivering')
      AND o.updated_at < NOW() - INTERVAL '1 minute'
      AND p.name IN ('Uber Eats', 'Rappi', 'Didi Food')
      ORDER BY o.updated_at ASC
      LIMIT 10
    `;

    const result = await db.query(query);
    return result.rows;
  }

  // Verificar estado de un pedido específico
  async checkOrderStatus(order) {
    try {
      let platformStatus = null;

      // Obtener estado actual de la plataforma
      switch (order.platform_name) {
        case 'Uber Eats':
          platformStatus = await this.getUberEatsStatus(order.platform_order_id);
          break;
        case 'Rappi':
          platformStatus = await this.getRappiStatus(order.platform_order_id);
          break;
        case 'Didi Food':
          platformStatus = await this.getDidiStatus(order.platform_order_id);
          break;
        default:
          console.log(`⚠️ Plataforma no soportada: ${order.platform_name}`);
          return;
      }

      // Si el estado cambió, actualizarlo
      if (platformStatus && platformStatus !== order.status) {
        console.log(`🔄 Actualizando pedido ${order.id}: ${order.status} → ${platformStatus}`);
        
        await platformService.updateOrderStatus(order.id, platformStatus, order.platform_name);
        
        // Emitir actualización via WebSocket
        if (global.emitDashboardUpdate) {
          global.emitDashboardUpdate('statusChange', {
            orderId: order.id,
            oldStatus: order.status,
            newStatus: platformStatus,
            platform: order.platform_name
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error verificando estado de pedido ${order.id}:`, error);
    }
  }

  // Obtener estado de Uber Eats
  async getUberEatsStatus(platformOrderId) {
    try {
      const orderDetails = await uberEatsService.getOrderDetails(platformOrderId);
      return uberEatsService.mapStatus(orderDetails.status);
    } catch (error) {
      console.error(`❌ Error obteniendo estado de Uber Eats para ${platformOrderId}:`, error);
      return null;
    }
  }

  // Obtener estado de Rappi
  async getRappiStatus(platformOrderId) {
    try {
      const orderDetails = await rappiService.getOrderDetails(platformOrderId);
      return rappiService.mapStatus(orderDetails.status);
    } catch (error) {
      console.error(`❌ Error obteniendo estado de Rappi para ${platformOrderId}:`, error);
      return null;
    }
  }

  // Obtener estado de Didi Food
  async getDidiStatus(platformOrderId) {
    try {
      // Implementar cuando tengas la API de Didi
      console.log(`⚠️ API de Didi Food no implementada para ${platformOrderId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo estado de Didi para ${platformOrderId}:`, error);
      return null;
    }
  }

  // Procesar webhook de Uber Eats
  async processUberEatsWebhook(webhookData) {
    try {
      console.log('📥 Webhook de Uber Eats recibido:', webhookData.order_id);
      
      const order = await uberEatsService.processWebhook(webhookData);
      
      // Emitir actualización via WebSocket
      if (global.emitDashboardUpdate) {
        global.emitDashboardUpdate('newOrder', order);
      }
      
      return order;
    } catch (error) {
      console.error('❌ Error procesando webhook de Uber Eats:', error);
      throw error;
    }
  }

  // Procesar webhook de Rappi
  async processRappiWebhook(webhookData) {
    try {
      console.log('📥 Webhook de Rappi recibido:', webhookData.order_id || webhookData.id);
      
      const order = await rappiService.processWebhook(webhookData);
      
      // Emitir actualización via WebSocket
      if (global.emitDashboardUpdate) {
        global.emitDashboardUpdate('newOrder', order);
      }
      
      return order;
    } catch (error) {
      console.error('❌ Error procesando webhook de Rappi:', error);
      throw error;
    }
  }

  // Iniciar monitoreo automático
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ El monitoreo automático ya está activo');
      return;
    }

    console.log('🚀 Iniciando monitoreo automático de estados de pedidos...');
    this.isMonitoring = true;

    // Verificación inmediata
    this.checkStatusChanges();

    // Configurar intervalo de verificación (cada 30 segundos)
    this.monitoringInterval = setInterval(() => {
      this.checkStatusChanges();
    }, 30000); // 30 segundos

    console.log('✅ Monitoreo automático iniciado - verificando cada 30 segundos');
  }

  // Detener monitoreo automático
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Monitoreo automático detenido');
  }

  // Verificar cambios de estado y activar/desactivar tracking
  async checkStatusChanges() {
    try {
      const now = new Date();
      this.lastCheck = now;

      console.log(`🔍 Verificando cambios de estado - ${now.toLocaleTimeString()}`);

      // 1. ACTIVAR TRACKING: Pedidos que cambiaron a 'delivering'
      await this.activateTrackingForDeliveringOrders();

      // 2. DESACTIVAR TRACKING: Pedidos que cambiaron a 'delivered'
      await this.deactivateTrackingForDeliveredOrders();

      // 3. ACTIVAR TRACKING: Pedidos que cambiaron a 'ready' (opcional)
      await this.activateTrackingForReadyOrders();

    } catch (error) {
      console.error('❌ Error en verificación automática de estados:', error);
    }
  }

  // Activar tracking para pedidos en estado 'delivering'
  async activateTrackingForDeliveringOrders() {
    try {
      // Buscar pedidos que cambiaron a 'delivering' recientemente
      const result = await db.query(`
        SELECT o.id, p.name as platform_name, o.platform_order_id, o.customer_name, o.total_amount, o.updated_at
        FROM orders o
        JOIN platforms p ON o.platform_id = p.id
        LEFT JOIN delivery_tracking dt ON o.id = dt.order_id
        WHERE o.status = 'delivering' 
        AND dt.order_id IS NULL
        AND o.updated_at >= NOW() - INTERVAL '5 minutes'
      `);

      if (result.rows.length > 0) {
        console.log(`🚚 Encontrados ${result.rows.length} pedidos en entrega sin tracking activo`);
        
        for (const order of result.rows) {
          console.log(`   📦 Activando tracking para pedido ${order.id} (${order.platform_name})`);
          
          // Activar tracking
          await deliveryTrackingService.startTracking(
            order.id, 
            order.platform_name, 
            order.platform_order_id,
            30000 // Actualizar cada 30 segundos
          );

          // Emitir evento de tracking activado
          this.emitTrackingActivated(order);
        }
      }
    } catch (error) {
      console.error('❌ Error activando tracking para pedidos en entrega:', error);
    }
  }

  // Desactivar tracking para pedidos en estado 'delivered'
  async deactivateTrackingForDeliveredOrders() {
    try {
      // Buscar pedidos que cambiaron a 'delivered' recientemente
      const result = await db.query(`
        SELECT o.id, p.name as platform_name, o.platform_order_id, o.customer_name, o.total_amount, o.updated_at
        FROM orders o
        JOIN platforms p ON o.platform_id = p.id
        INNER JOIN delivery_tracking dt ON o.id = dt.order_id
        WHERE o.status = 'delivered' 
        AND o.updated_at >= NOW() - INTERVAL '5 minutes'
      `);

      if (result.rows.length > 0) {
        console.log(`✅ Encontrados ${result.rows.length} pedidos entregados con tracking activo`);
        
        for (const order of result.rows) {
          console.log(`   📦 Desactivando tracking para pedido ${order.id} (${order.platform_name})`);
          
          // Desactivar tracking
          deliveryTrackingService.stopTracking(order.id);

          // Emitir evento de tracking desactivado
          this.emitTrackingDeactivated(order);
        }
      }
    } catch (error) {
      console.error('❌ Error desactivando tracking para pedidos entregados:', error);
    }
  }

  // Activar tracking para pedidos en estado 'ready' (opcional)
  async activateTrackingForReadyOrders() {
    try {
      // Buscar pedidos que cambiaron a 'ready' recientemente
      const result = await db.query(`
        SELECT o.id, p.name as platform_name, o.platform_order_id, o.customer_name, o.total_amount, o.updated_at
        FROM orders o
        JOIN platforms p ON o.platform_id = p.id
        LEFT JOIN delivery_tracking dt ON o.id = dt.order_id
        WHERE o.status = 'ready' 
        AND dt.order_id IS NULL
        AND o.updated_at >= NOW() - INTERVAL '5 minutes'
      `);

      if (result.rows.length > 0) {
        console.log(`🟡 Encontrados ${result.rows.length} pedidos listos para tracking`);
        
        for (const order of result.rows) {
          console.log(`   📦 Activando tracking para pedido listo ${order.id} (${order.platform_name})`);
          
          // Activar tracking
          await deliveryTrackingService.startTracking(
            order.id, 
            order.platform_name, 
            order.platform_order_id,
            30000 // Actualizar cada 30 segundos
          );

          // Emitir evento de tracking activado
          this.emitTrackingActivated(order);
        }
      }
    } catch (error) {
      console.error('❌ Error activando tracking para pedidos listos:', error);
    }
  }

  // Emitir evento de tracking activado
  emitTrackingActivated(order) {
    console.log(`📡 Evento: Tracking activado para pedido ${order.id} (${order.platform_name})`);
    
    // Aquí se emitiría un evento WebSocket para actualizar el frontend en tiempo real
    if (global.io) {
      global.io.emit('tracking_activated', {
        orderId: order.id,
        platform: order.platform_name,
        customerName: order.customer_name,
        timestamp: new Date()
      });
    }
  }

  // Emitir evento de tracking desactivado
  emitTrackingDeactivated(order) {
    console.log(`📡 Evento: Tracking desactivado para pedido ${order.id} (${order.platform_name})`);
    
    // Aquí se emitiría un evento WebSocket para actualizar el frontend en tiempo real
    if (global.io) {
      global.io.emit('tracking_deactivated', {
        orderId: order.id,
        platform: order.platform_name,
        customerName: order.customer_name,
        timestamp: new Date()
      });
    }
  }

  // Obtener estado del monitoreo
  getMonitoringStatus() {
    return {
      isActive: this.isMonitoring,
      lastCheck: this.lastCheck,
      nextCheck: this.lastCheck ? new Date(this.lastCheck.getTime() + 30000) : null
    };
  }

  // Obtener estadísticas de automatización
  async getAutomationStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'delivering' THEN 1 END) as delivering,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready
        FROM orders 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      const trackingResult = await db.query(`
        SELECT COUNT(*) as active_tracking
        FROM delivery_tracking 
        WHERE updated_at >= NOW() - INTERVAL '30 minutes'
      `);

      return {
        totalOrders: parseInt(result.rows[0].total_orders) || 0,
        delivering: parseInt(result.rows[0].delivering) || 0,
        delivered: parseInt(result.rows[0].delivered) || 0,
        ready: parseInt(result.rows[0].ready) || 0,
        activeTracking: parseInt(trackingResult.rows[0].active_tracking) || 0,
        monitoringActive: this.isMonitoring
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de automatización:', error);
      return {
        totalOrders: 0,
        delivering: 0,
        delivered: 0,
        ready: 0,
        activeTracking: 0,
        monitoringActive: this.isMonitoring
      };
    }
  }
}

module.exports = new AutomationService(); 