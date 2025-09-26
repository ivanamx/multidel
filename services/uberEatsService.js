const axios = require('axios');
const platformService = require('./platformService');

class UberEatsService {
  constructor() {
    this.baseURL = process.env.UBER_EATS_PRODUCTION_URL || 'https://api.uber.com/v1';
    this.clientId = process.env.UBER_EATS_CLIENT_ID;
    this.clientSecret = process.env.UBER_EATS_CLIENT_SECRET;
    this.accessToken = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'eats.store.orders'
      });

      this.accessToken = response.data.access_token;
      return this.accessToken;
    } catch (error) {
      console.error('Error autenticando con Uber Eats:', error);
      throw error;
    }
  }

  async getHeaders() {
    if (!this.accessToken) {
      await this.authenticate();
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async processWebhook(webhookData) {
    try {
      const orderData = {
        platform_order_id: webhookData.order_id,
        customer_name: webhookData.customer?.name || 'Cliente Uber Eats',
        customer_phone: webhookData.customer?.phone || '',
        customer_address: webhookData.delivery?.address || '',
        items: webhookData.items || [],
        total_amount: webhookData.total || 0,
        status: this.mapStatus(webhookData.status)
      };

      const order = await platformService.createOrder(orderData, 'Uber Eats');
      return order;
    } catch (error) {
      console.error('Error procesando webhook de Uber Eats:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      const headers = await this.getHeaders();
      
      await axios.patch(
        `${this.baseURL}/eats/v1/orders/${orderId}`,
        { status: this.mapToUberStatus(status) },
        { headers }
      );

      await platformService.updateOrderStatus(orderId, status, 'Uber Eats');
      return { success: true };
    } catch (error) {
      console.error('Error actualizando estado en Uber Eats:', error);
      throw error;
    }
  }

  async getOrderDetails(orderId) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${this.baseURL}/eats/v1/orders/${orderId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo detalles de pedido de Uber Eats:', error);
      throw error;
    }
  }

  mapStatus(uberStatus) {
    const statusMap = {
      'pending': 'pending',
      'confirmed': 'pending', // Mapear confirmed a pending
      'preparing': 'preparing',
      'ready_for_pickup': 'ready',
      'out_for_delivery': 'delivering',
      'delivered': 'delivered',
      'cancelled': 'delivered' // Mapear cancelled a delivered
    };
    return statusMap[uberStatus] || 'pending';
  }

  mapToUberStatus(status) {
    const uberStatusMap = {
      'pending': 'pending',
      'preparing': 'preparing',
      'ready': 'ready_for_pickup',
      'delivering': 'out_for_delivery',
      'delivered': 'delivered'
    };
    return uberStatusMap[status] || 'pending';
  }
}

module.exports = new UberEatsService();