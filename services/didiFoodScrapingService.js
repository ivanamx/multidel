const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const didiFoodConfig = require('../config/didiFoodScraping');
const platformService = require('./platformService');

class DidiFoodScrapingService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastOrders = new Map(); // Para detectar cambios
        this.processedOrders = new Set(); // Para evitar duplicados
        this.requiresSMSVerification = false;
    }

    // Inicializar navegador
    async initializeBrowser() {
        try {
            console.log('🌐 Inicializando navegador para Didí Food...');
            
            this.browser = await puppeteer.launch({
                headless: didiFoodConfig.browser.headless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                defaultViewport: didiFoodConfig.browser.viewport
            });

            this.page = await this.browser.newPage();
            
            // Configurar User-Agent y headers
            await this.page.setUserAgent(didiFoodConfig.browser.userAgent);
            await this.page.setExtraHTTPHeaders(didiFoodConfig.security.headers);
            
            // Configurar timeouts
            this.page.setDefaultTimeout(didiFoodConfig.browser.timeout);
            
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

    // Login en Didí Food
    async login(email, password, phone = null) {
        try {
            if (!this.page) {
                await this.initializeBrowser();
            }

            console.log('🔐 Iniciando login en Didí Food...');
            
            // Ir a la página de login
            await this.page.goto(didiFoodConfig.didiFood.urls.login, {
                waitUntil: 'networkidle2'
            });

            // Esperar a que cargue la página
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Buscar y llenar campo de email
            const emailSelector = didiFoodConfig.didiFood.selectors.login.emailInput;
            await this.page.waitForSelector(emailSelector, { timeout: 10000 });
            await this.page.type(emailSelector, email);

            // Buscar y llenar campo de password
            const passwordSelector = didiFoodConfig.didiFood.selectors.login.passwordInput;
            await this.page.waitForSelector(passwordSelector, { timeout: 10000 });
            await this.page.type(passwordSelector, password);

            // Si hay campo de teléfono, llenarlo también
            if (phone) {
                try {
                    const phoneSelector = didiFoodConfig.didiFood.selectors.login.phoneInput;
                    await this.page.waitForSelector(phoneSelector, { timeout: 5000 });
                    await this.page.type(phoneSelector, phone);
                } catch (error) {
                    console.log('⚠️ Campo de teléfono no encontrado, continuando sin él');
                }
            }

            // Hacer clic en el botón de login
            const loginButtonSelector = didiFoodConfig.didiFood.selectors.login.loginButton;
            await this.page.click(loginButtonSelector);

            // Esperar respuesta del login
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Verificar si requiere verificación SMS
            const currentUrl = this.page.url();
            if (currentUrl.includes('verification') || currentUrl.includes('sms')) {
                console.log('📱 Se requiere verificación SMS');
                this.requiresSMSVerification = true;
                return { success: false, requiresSMS: true };
            }

            // Verificar si el login fue exitoso
            if (currentUrl.includes('dashboard') || currentUrl.includes('orders') || currentUrl.includes('merchant')) {
                this.isLoggedIn = true;
                console.log('✅ Login exitoso en Didí Food');
                return { success: true };
            } else {
                console.log('❌ Login fallido en Didí Food');
                return { success: false };
            }
        } catch (error) {
            console.error('❌ Error durante login:', error);
            return { success: false, error: error.message };
        }
    }

    // Manejar verificación SMS
    async handleSMSVerification(phone, verificationCode) {
        try {
            if (!this.requiresSMSVerification) {
                return { success: false, error: 'No se requiere verificación SMS' };
            }

            console.log('📱 Procesando verificación SMS...');

            // Llenar campo de teléfono si no está lleno
            try {
                const phoneSelector = didiFoodConfig.didiFood.features.smsVerification.phoneInput;
                await this.page.waitForSelector(phoneSelector, { timeout: 5000 });
                await this.page.type(phoneSelector, phone);
            } catch (error) {
                console.log('⚠️ Campo de teléfono ya lleno o no encontrado');
            }

            // Enviar código SMS
            const sendCodeSelector = didiFoodConfig.didiFood.features.smsVerification.sendCodeButton;
            await this.page.waitForSelector(sendCodeSelector, { timeout: 10000 });
            await this.page.click(sendCodeSelector);

            // Esperar un poco para que llegue el SMS
            console.log('⏳ Esperando código SMS...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Llenar código de verificación
            const codeSelector = didiFoodConfig.didiFood.features.smsVerification.codeInput;
            await this.page.waitForSelector(codeSelector, { timeout: 10000 });
            await this.page.type(codeSelector, verificationCode);

            // Verificar código
            const verifySelector = didiFoodConfig.didiFood.features.smsVerification.verifyButton;
            await this.page.click(verifySelector);

            // Esperar respuesta
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Verificar si la verificación fue exitosa
            const currentUrl = this.page.url();
            if (currentUrl.includes('dashboard') || currentUrl.includes('orders')) {
                this.isLoggedIn = true;
                this.requiresSMSVerification = false;
                console.log('✅ Verificación SMS exitosa');
                return { success: true };
            } else {
                console.log('❌ Verificación SMS fallida');
                return { success: false };
            }
        } catch (error) {
            console.error('❌ Error durante verificación SMS:', error);
            return { success: false, error: error.message };
        }
    }

    // Navegar a la página de pedidos
    async navigateToOrders() {
        try {
            if (!this.isLoggedIn) {
                throw new Error('No hay sesión activa. Hacer login primero.');
            }

            console.log('📋 Navegando a página de pedidos de Didí Food...');
            
            await this.page.goto(didiFoodConfig.didiFood.urls.orders, {
                waitUntil: 'networkidle2'
            });

            // Esperar a que cargue el contenido
            await new Promise(resolve => setTimeout(resolve, 4000));
            
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
            console.log('🔍 Extrayendo pedidos de Didí Food...');
            
            // Obtener HTML de la página
            const html = await this.page.content();
            const $ = cheerio.load(html);
            
            const orders = [];
            const selectors = didiFoodConfig.didiFood.selectors.orders;
            
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

            console.log(`✅ Extraídos ${orders.length} pedidos de Didí Food`);
            return orders;
        } catch (error) {
            console.error('❌ Error extrayendo pedidos:', error);
            return [];
        }
    }

    // Parsear elemento individual de pedido
    parseOrderElement($, orderElement) {
        const selectors = didiFoodConfig.didiFood.selectors.orders;
        
        try {
            const orderData = {
                platform: 'Didi Food',
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
        const selectors = didiFoodConfig.didiFood.selectors.orders;
        const items = [];

        try {
            const itemsContainer = orderElement.find(selectors.itemsContainer);
            if (itemsContainer.length === 0) {
                return [{
                    name: 'Pedido Didí Food',
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
                name: 'Pedido Didí Food',
                quantity: 1,
                price: 0,
                total: 0
            }];
        } catch (error) {
            console.error('❌ Error extrayendo items:', error);
            return [{
                name: 'Pedido Didí Food',
                quantity: 1,
                price: 0,
                total: 0
            }];
        }
    }

    // Mapear estado de Didí Food a estado interno
    mapStatus(didiStatus) {
        const statusMap = didiFoodConfig.didiFood.statusMap;
        
        // Buscar coincidencia exacta
        if (statusMap[didiStatus]) {
            return statusMap[didiStatus];
        }

        // Buscar coincidencia parcial
        for (const [key, value] of Object.entries(statusMap)) {
            if (didiStatus.includes(key) || key.includes(didiStatus)) {
                return value;
            }
        }

        // Estado por defecto
        return 'pending';
    }

    // Iniciar monitoreo de pedidos
    async startMonitoring(email, password, phone = null) {
        if (this.isMonitoring) {
            console.log('⚠️ El monitoreo de Didí Food ya está activo');
            return;
        }

        try {
            console.log('🚀 Iniciando monitoreo de Didí Food...');
            
            // Inicializar navegador y hacer login
            await this.initializeBrowser();
            const loginResult = await this.login(email, password, phone);
            
            if (!loginResult.success) {
                if (loginResult.requiresSMS) {
                    throw new Error('Se requiere verificación SMS. Usar handleSMSVerification() primero.');
                } else {
                    throw new Error('No se pudo hacer login en Didí Food');
                }
            }

            this.isMonitoring = true;
            
            // Configurar monitoreo periódico
            this.monitoringInterval = setInterval(async () => {
                try {
                    await this.checkForNewOrders();
                } catch (error) {
                    console.error('❌ Error en monitoreo de Didí Food:', error);
                }
            }, didiFoodConfig.didiFood.monitoring.checkInterval);

            console.log('✅ Monitoreo de Didí Food iniciado');
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
        console.log('🛑 Monitoreo de Didí Food detenido');
    }

    // Verificar nuevos pedidos
    async checkForNewOrders() {
        try {
            if (!this.isLoggedIn) {
                console.log('⚠️ No hay sesión activa en Didí Food');
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
            console.log(`📦 Procesando nuevo pedido de Didí Food: ${orderData.platform_order_id}`);
            
            // Crear pedido en el sistema
            const order = await platformService.createOrder(orderData, 'Didi Food');
            console.log(`✅ Pedido creado: ${order.id}`);
            
            // Emitir actualización via WebSocket
            if (global.emitDashboardUpdate) {
                global.emitDashboardUpdate('newOrder', {
                    orderId: order.id,
                    platform: 'Didi Food',
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
                    // await platformService.updateOrderStatus(order.platform_order_id, order.status, 'Didi Food');
                    
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
            requiresSMSVerification: this.requiresSMSVerification,
            processedOrdersCount: this.processedOrders.size,
            lastCheck: new Date().toISOString()
        };
    }
}

module.exports = new DidiFoodScrapingService();
