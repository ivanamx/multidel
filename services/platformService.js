const axios = require('axios');
const db = require('../config/database');

class PlatformService {
  constructor() {
    this.platforms = {};
    this.loadPlatforms();
  }

  async loadPlatforms() {
    try {
      const result = await db.query('SELECT * FROM platforms WHERE is_active = true');
      result.rows.forEach(platform => {
        this.platforms[platform.name.toLowerCase()] = platform;
      });
    } catch (error) {
      console.error('Error cargando plataformas:', error);
    }
  }

  async getPlatformConfig(platformName) {
    const platform = this.platforms[platformName.toLowerCase()];
    if (!platform) {
      throw new Error(`Plataforma ${platformName} no encontrada`);
    }
    return platform;
  }

  async updateOrderStatus(orderId, status, platformName) {
    try {
      // Validar estados permitidos
      const allowedStatuses = ['pending', 'preparing', 'ready', 'delivering', 'delivered', 'rejected'];
      
      if (!allowedStatuses.includes(status)) {
        throw new Error(`Estado no válido: ${status}. Estados permitidos: ${allowedStatuses.join(', ')}`);
      }
      
      await db.query(
        'UPDATE orders SET status = $1, platform_status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [status, status, orderId]
      );

      // Log del cambio de estado
      await db.query(
        'INSERT INTO order_logs (order_id, action, details) VALUES ($1, $2, $3)',
        [orderId, 'status_update', { status, platform: platformName }]
      );

      return { success: true, message: 'Estado actualizado correctamente' };
    } catch (error) {
      console.error('Error actualizando estado:', error);
      throw error;
    }
  }

  async createOrder(orderData, platformName) {
    try {
      const platform = await this.getPlatformConfig(platformName);
      
      // Crear fecha en zona horaria de México
      const mexicoTime = new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"});
      const localTime = new Date(mexicoTime);
      
      const result = await db.query(`
        INSERT INTO orders (
          platform_id, platform_order_id, customer_name, customer_phone, 
          customer_address, items, total_amount, status, platform_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *
      `, [
        platform.id,
        orderData.platform_order_id,
        orderData.customer_name,
        orderData.customer_phone,
        orderData.customer_address,
        JSON.stringify(orderData.items),
        orderData.total_amount,
        'pending',
        orderData.status || 'pending',
        localTime,
        localTime
      ]);

      const order = result.rows[0];

      // Log de creación
      await db.query(
        'INSERT INTO order_logs (order_id, action, details) VALUES ($1, $2, $3)',
        [order.id, 'order_created', { platform: platformName, order_data: orderData }]
      );

      return order;
    } catch (error) {
      console.error('Error creando pedido:', error);
      throw error;
    }
  }

  async getOrders(filters = {}) {
    try {
      let query = `
        SELECT o.*, p.name as platform_name 
        FROM orders o 
        JOIN platforms p ON o.platform_id = p.id 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        query += ` AND o.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.platform) {
        paramCount++;
        query += ` AND p.name ILIKE $${paramCount}`;
        params.push(`%${filters.platform}%`);
      }

      if (filters.date_from) {
        paramCount++;
        query += ` AND DATE(o.created_at) >= $${paramCount}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        paramCount++;
        query += ` AND DATE(o.created_at) <= $${paramCount}`;
        params.push(filters.date_to);
      }

      // Ordenamiento personalizado
      const sortField = filters.sort || 'created_at';
      const sortOrder = filters.order || 'desc';
      const allowedSortFields = ['created_at', 'id', 'total_amount', 'status'];
      
      if (allowedSortFields.includes(sortField)) {
        query += ` ORDER BY o.${sortField} ${sortOrder.toUpperCase()}`;
      } else {
        query += ' ORDER BY o.created_at DESC';
      }

      if (filters.limit) {
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      if (filters.offset) {
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(filters.offset);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error obteniendo pedidos:', error);
      throw error;
    }
  }

  async getOrdersCount(filters = {}) {
    try {
      let query = `
        SELECT COUNT(*) as total
        FROM orders o 
        JOIN platforms p ON o.platform_id = p.id 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        query += ` AND o.status = $${paramCount}`;
        params.push(filters.status);
      }

      if (filters.platform) {
        paramCount++;
        query += ` AND p.name ILIKE $${paramCount}`;
        params.push(`%${filters.platform}%`);
      }

      if (filters.date_from) {
        paramCount++;
        query += ` AND DATE(o.created_at) >= $${paramCount}`;
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        paramCount++;
        query += ` AND DATE(o.created_at) <= $${paramCount}`;
        params.push(filters.date_to);
      }

      const result = await db.query(query, params);
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Error obteniendo conteo de pedidos:', error);
      throw error;
    }
  }
}

module.exports = new PlatformService();