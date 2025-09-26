const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const uberEatsConfig = require('../config/uberEatsScraping');
const platformService = require('./platformService');

class UberEatsScrapingService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastOrders = new Map(); // Para detectar cambios
        this.processedOrders = new Set(); // Para evitar duplicados
    }

    // Inicializar navegador
    async initializeBrowser() {
        try {
            console.log('🌐 Inicializando navegador para Uber Eats...');
            
            this.browser = await puppeteer.launch({
                headless: uberEatsConfig.browser.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                defaultViewport: uberEatsConfig.browser.viewport
            });

            this.page = await this.browser.newPage();
            
            // Configurar User-Agent y headers
            await this.page.setUserAgent(uberEatsConfig.browser.userAgent);
            await this.page.setExtraHTTPHeaders(uberEatsConfig.security.headers);
            
            // Configurar timeouts
            this.page.setDefaultTimeout(uberEatsConfig.browser.timeout);
            
            console.log('✅ Navegador inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error inicializando navegador:', error);
            throw error;
        }
    }

    // Cerrar navegador
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.isLoggedIn = false;
            console.log('🔒 Navegador cerrado');
        }
    }

    // Login en Uber Eats Partner
    async login(email, password) {
        try {
            if (!this.page) {
                await this.initializeBrowser();
            }

            console.log('🔐 Iniciando login en Uber Eats...');
            
            // Ir a la página de login
            await this.page.goto(uberEatsConfig.uberEats.urls.login, {
                waitUntil: 'networkidle2'
            });

            // Esperar a que cargue la página
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Buscar y llenar campo de email
            const emailSelector = uberEatsConfig.uberEats.selectors.login.emailInput;
            await this.page.waitForSelector(emailSelector, { timeout: 10000 });
            await this.page.type(emailSelector, email);

            // Buscar y llenar campo de password
            const passwordSelector = uberEatsConfig.uberEats.selectors.login.passwordInput;
            await this.page.waitForSelector(passwordSelector, { timeout: 10000 });
            await this.page.type(passwordSelector, password);

            // Hacer clic en el botón de login
            const loginButtonSelector = uberEatsConfig.uberEats.selectors.login.loginButton;
            await this.page.click(loginButtonSelector);

            // Esperar a que se complete el login
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

            // Verificar si el login fue exitoso
            const currentUrl = this.page.url();
            if (currentUrl.includes('dashboard') || currentUrl.includes('orders')) {
                this.isLoggedIn = true;
                console.log('✅ Login exitoso en Uber Eats');
                return true;
            } else {
                console.log('❌ Login fallido en Uber Eats');
                return false;
            }
        } catch (error) {
            console.error('❌ Error durante login:', error);
            return false;
        }
    }

    // Navegar a la página de pedidos
    async navigateToOrders() {
        try {
            if (!this.isLoggedIn) {
                throw new Error('No hay sesión activa. Hacer login primero.');
            }

            console.log('📋 Navegando a página de pedidos...');
            
            await this.page.goto(uberEatsConfig.uberEats.urls.orders, {
                waitUntil: 'networkidle2'
            });

            // Esperar a que cargue el contenido
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('✅ Navegación a pedidos completada');
            return true;
        } catch (error) {
            console.error('❌ Error navegando a pedidos:', error);
            return false;
        }
    }

    // Extraer pedidos de la página actual
    async extractOrders() {
        try {
            console.log('🔍 Extrayendo pedidos de Uber Eats...');
            
            // Obtener HTML de la página
            const html = await this.page.content();
            const $ = cheerio.load(html);
            
            const orders = [];
            const selectors = uberEatsConfig.uberEats.selectors.orders;
            
            // Buscar contenedor de pedidos
            const ordersContainer = $(selectors.container);
            if (ordersContainer.length === 0) {
                console.log('⚠️ No se encontró contenedor de pedidos');
                return orders;
            }

            // Extraer cada pedido
            $(selectors.orderItem).each((index, element) => {
                try {
                    const orderData = this.parseOrderElement($, $(element));
                    if (orderData && orderData.platform_order_id) {
                        orders.push(orderData);
                    }
                } catch (error) {
                    console.error(`❌ Error parseando pedido ${index}:`, error);
                }
            });

            console.log(`✅ Extraídos ${orders.length} pedidos`);
            return orders;
        } catch (error) {
            console.error('❌ Error extrayendo pedidos:', error);
            return [];
        }
    }

    // Parsear elemento individual de pedido
    parseOrderElement($, orderElement) {
        const selectors = uberEatsConfig.uberEats.selectors.orders;
        
        try {
            const orderData = {
                platform: 'Uber Eats',
                source: 'web_scraping',
                created_at: new Date()
            };

            // Extraer ID del pedido
            const orderIdElement = orderElement.find(selectors.orderId);
            if (orderIdElement.length > 0) {
                orderData.platform_order_id = orderIdElement.text().trim().replace(/[^\d]/g, '');
            }

            // Extraer nombre del cliente
            const customerNameElement = orderElement.find(selectors.customerName);
            if (customerNameElement.length > 0) {
                orderData.customer_name = customerNameElement.text().trim();
            }

            // Extraer teléfono del cliente
            const customerPhoneElement = orderElement.find(selectors.customerPhone);
            if (customerPhoneElement.length > 0) {
                orderData.customer_phone = customerPhoneElement.text().trim();
            }

            // Extraer dirección
            const customerAddressElement = orderElement.find(selectors.customerAddress);
            if (customerAddressElement.length > 0) {
                orderData.customer_address = customerAddressElement.text().trim();
            }

            // Extraer estado
            const orderStatusElement = orderElement.find(selectors.orderStatus);
            if (orderStatusElement.length > 0) {
                const rawStatus = orderStatusElement.text().trim().toLowerCase();
                orderData.status = this.mapStatus(rawStatus);
            }

            // Extraer total
            const orderTotalElement = orderElement.find(selectors.orderTotal);
            if (orderTotalElement.length > 0) {
                const totalText = orderTotalElement.text().trim();
                orderData.total_amount = parseFloat(totalText.replace(/[^\d.,]/g, '').replace(',', ''));
            }

            // Extraer items del pedido
            orderData.items = this.extractOrderItems($, orderElement);

            return orderData;
        } catch (error) {
            console.error('❌ Error parseando elemento de pedido:', error);
            return null;
        }
    }

    // Extraer items de un pedido
    extractOrderItems($, orderElement) {
        const selectors = uberEatsConfig.uberEats.selectors.orders;
        const items = [];

        try {
            const itemsContainer = orderElement.find(selectors.itemsContainer);
            if (itemsContainer.length === 0) {
                return [{
                    name: 'Pedido Uber Eats',
                    quantity: 1,
                    price: 0,
                    total: 0
                }];
            }

            itemsContainer.find(selectors.itemElement).each((index, itemElement) => {
                const $item = $(itemElement);
                
                const name = $item.find(selectors.itemName).text().trim();
                const quantityText = $item.find(selectors.itemQuantity).text().trim();
                const priceText = $item.find(selectors.itemPrice).text().trim();

                if (name) {
                    const quantity = parseInt(quantityText) || 1;
                    const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '')) || 0;

                    items.push({
                        name: name,
                        quantity: quantity,
                        price: price,
                        total: quantity * price
                    });
                }
            });

            return items.length > 0 ? items : [{
                name: 'Pedido Uber Eats',
                quantity: 1,
                price: 0,
                total: 0
            }];
        } catch (error) {
            console.error('❌ Error extrayendo items:', error);
            return [{
                name: 'Pedido Uber Eats',
                quantity: 1,
                price: 0,
                total: 0
            }];
        }
    }

    // Mapear estado de Uber Eats a estado interno
    mapStatus(uberEatsStatus) {
        const statusMap = uberEatsConfig.uberEats.statusMap;
        
        // Buscar coincidencia exacta
        if (statusMap[uberEatsStatus]) {
            return statusMap[uberEatsStatus];
        }

        // Buscar coincidencia parcial
        for (const [key, value] of Object.entries(statusMap)) {
            if (uberEatsStatus.includes(key) || key.includes(uberEatsStatus)) {
                return value;
            }
        }

        // Estado por defecto
        return 'pending';
    }

    // Iniciar monitoreo de pedidos
    async startMonitoring(email, password) {
        if (this.isMonitoring) {
            console.log('⚠️ El monitoreo de Uber Eats ya está activo');
            return;
        }

        try {
            console.log('🚀 Iniciando monitoreo de Uber Eats...');
            
            // Inicializar navegador y hacer login
            await this.initializeBrowser();
            const loginSuccess = await this.login(email, password);
            
            if (!loginSuccess) {
                throw new Error('No se pudo hacer login en Uber Eats');
            }

            this.isMonitoring = true;
            
            // Configurar monitoreo periódico
            this.monitoringInterval = setInterval(async () => {
                try {
                    await this.checkForNewOrders();
                } catch (error) {
                    console.error('❌ Error en monitoreo de Uber Eats:', error);
                }
            }, uberEatsConfig.uberEats.monitoring.checkInterval);

            console.log('✅ Monitoreo de Uber Eats iniciado');
        } catch (error) {
            console.error('❌ Error iniciando monitoreo:', error);
            throw error;
        }
    }

    // Detener monitoreo
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.isMonitoring = false;
        this.closeBrowser();
        console.log('🛑 Monitoreo de Uber Eats detenido');
    }

    // Verificar nuevos pedidos
    async checkForNewOrders() {
        try {
            if (!this.isLoggedIn) {
                console.log('⚠️ No hay sesión activa en Uber Eats');
                return;
            }

            // Navegar a pedidos
            await this.navigateToOrders();
            
            // Extraer pedidos actuales
            const currentOrders = await this.extractOrders();
            
            // Procesar nuevos pedidos
            for (const order of currentOrders) {
                if (!this.processedOrders.has(order.platform_order_id)) {
                    await this.processNewOrder(order);
                    this.processedOrders.add(order.platform_order_id);
                }
            }

            // Actualizar estado de pedidos existentes
            await this.updateExistingOrders(currentOrders);
            
        } catch (error) {
            console.error('❌ Error verificando pedidos:', error);
        }
    }

    // Procesar nuevo pedido
    async processNewOrder(orderData) {
        try {
            console.log(`📦 Procesando nuevo pedido de Uber Eats: ${orderData.platform_order_id}`);
            
            // Crear pedido en el sistema
            const order = await platformService.createOrder(orderData, 'Uber Eats');
            console.log(`✅ Pedido creado: ${order.id}`);
            
            // Emitir actualización via WebSocket
            if (global.emitDashboardUpdate) {
                global.emitDashboardUpdate('newOrder', {
                    orderId: order.id,
                    platform: 'Uber Eats',
                    customerName: orderData.customer_name,
                    total: orderData.total_amount
                });
            }
        } catch (error) {
            console.error('❌ Error procesando nuevo pedido:', error);
        }
    }

    // Actualizar pedidos existentes
    async updateExistingOrders(currentOrders) {
        try {
            for (const order of currentOrders) {
                const orderKey = `${order.platform_order_id}_${order.status}`;
                
                if (!this.lastOrders.has(orderKey)) {
                    // Estado cambió, actualizar
                    console.log(`🔄 Actualizando estado de pedido ${order.platform_order_id}: ${order.status}`);
                    
                    // Aquí podrías actualizar el estado en tu sistema
                    // await platformService.updateOrderStatus(order.platform_order_id, order.status, 'Uber Eats');
                    
                    this.lastOrders.set(orderKey, order);
                }
            }
        } catch (error) {
            console.error('❌ Error actualizando pedidos existentes:', error);
        }
    }

    // Obtener estado del servicio
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            isLoggedIn: this.isLoggedIn,
            processedOrdersCount: this.processedOrders.size,
            lastCheck: new Date().toISOString()
        };
    }
}

module.exports = new UberEatsScrapingService();
