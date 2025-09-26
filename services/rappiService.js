const axios = require('axios');
const platformService = require('./platformService');

class RappiService {
  constructor() {
    this.baseURL = process.env.RAPPI_API_URL || 'https://services.rappi.com/api';
    this.clientId = process.env.RAPPI_CLIENT_ID;
    this.clientSecret = process.env.RAPPI_CLIENT_SECRET;
    this.accessToken = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/auth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      });

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('Error autenticando con Rappi:', error);
      throw error;
    }
  }

  async getHeaders() {
    if (!this.accessToken) {
      await this.authenticate();
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Platform': 'rappi'
    };
  }

  async processWebhook(webhookData) {
    try {
      const orderData = {
        platform_order_id: webhookData.order_id || webhookData.id,
        customer_name: webhookData.customer?.name || 'Cliente Rappi',
        customer_phone: webhookData.customer?.phone || '',
        customer_address: webhookData.delivery?.address || '',
        items: webhookData.items || [],
        total_amount: webhookData.total || webhookData.amount || 0,
        status: this.mapStatus(webhookData.status)
      };

      const order = await platformService.createOrder(orderData, 'Rappi');
      return order;
    } catch (error) {
      console.error('Error procesando webhook de Rappi:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const headers = await this.getHeaders();
      
      await axios.put(
        `${this.baseURL}/orders/${orderId}/status`,
        { status: this.mapToRappiStatus(status) },
        { headers }
      );

      await platformService.updateOrderStatus(orderId, status, 'Rappi');
      return { success: true };
    } catch (error) {
      console.error('Error actualizando estado en Rappi:', error);
      throw error;
    }
  }

  async getOrderDetails(orderId) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.baseURL}/orders/${orderId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo detalles de pedido de Rappi:', error);
      throw error;
    }
  }

  mapStatus(rappiStatus) {
    const statusMap = {
      'pending': 'pending',
      'confirmed': 'pending', // Mapear confirmed a pending
      'in_preparation': 'preparing',
      'ready': 'ready',
      'in_delivery': 'delivering',
      'delivered': 'delivered',
      'cancelled': 'delivered' // Mapear cancelled a delivered
    };
    return statusMap[rappiStatus] || 'pending';
  }

  mapToRappiStatus(status) {
    const rappiStatusMap = {
      'pending': 'pending',
      'preparing': 'in_preparation',
      'ready': 'ready',
      'delivering': 'in_delivery',
      'delivered': 'delivered'
    };
    return rappiStatusMap[status] || 'pending';
  }
}

module.exports = new RappiService();