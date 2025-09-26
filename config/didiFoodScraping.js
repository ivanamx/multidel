/**
 * Configuración de Web Scraping para Didí Food
 * 
 * Este archivo contiene las configuraciones para el monitoreo
 * del panel web de Didí Food.
 */

module.exports = {
    // Configuración del navegador (reutiliza configuración de Uber Eats)
    browser: {
        headless: process.env.SCRAPER_HEADLESS !== 'false', // true por defecto
        timeout: 30000, // 30 segundos
        viewport: {
            width: 1920,
            height: 1080
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    
    // Configuración de Didí Food
    didiFood: {
        // URLs del panel de restaurante
        urls: {
            login: 'https://merchant.didiglobal.com/login',
            dashboard: 'https://merchant.didiglobal.com/dashboard',
            orders: 'https://merchant.didiglobal.com/orders',
            // URLs alternativas por región
            loginMX: 'https://merchant.didiglobal.com/mx/login',
            loginCO: 'https://merchant.didiglobal.com/co/login',
            loginAR: 'https://merchant.didiglobal.com/ar/login'
        },
        
        // Selectores para elementos del panel
        selectors: {
            // Login
            login: {
                emailInput: 'input[name="email"], input[type="email"], #email, .login-input',
                passwordInput: 'input[name="password"], input[type="password"], #password, .password-input',
                loginButton: 'button[type="submit"], .login-button, [data-testid="login-button"], .btn-login',
                errorMessage: '.error-message, .alert-danger, [data-testid="error"], .login-error',
                // Selectores específicos de Didí
                phoneInput: 'input[name="phone"], input[type="tel"], #phone',
                verificationCode: 'input[name="code"], input[name="verification"], #verification-code'
            },
            
            // Dashboard/Orders
            orders: {
                // Contenedor principal de pedidos
                container: '.orders-container, .order-list, [data-testid="orders-list"], .dashboard-orders, .order-management',
                
                // Elementos individuales de pedido
                orderItem: '.order-item, .order-card, [data-testid="order-item"], .order-row, .order-detail',
                
                // Información del pedido
                orderId: '.order-id, [data-testid="order-id"], .order-number, .order-no',
                customerName: '.customer-name, [data-testid="customer-name"], .customer-info .name, .client-name',
                customerPhone: '.customer-phone, [data-testid="customer-phone"], .customer-info .phone, .client-phone',
                customerAddress: '.customer-address, [data-testid="customer-address"], .delivery-address, .client-address',
                orderStatus: '.order-status, [data-testid="order-status"], .status-badge, .order-state',
                orderTotal: '.order-total, [data-testid="order-total"], .total-amount, .order-price',
                orderTime: '.order-time, [data-testid="order-time"], .created-at, .order-date',
                
                // Items del pedido
                itemsContainer: '.order-items, [data-testid="order-items"], .items-list, .order-products',
                itemElement: '.item, .order-item-detail, [data-testid="order-item"], .product-item',
                itemName: '.item-name, .product-name, [data-testid="item-name"], .product-title',
                itemQuantity: '.item-quantity, .quantity, [data-testid="item-quantity"], .product-qty',
                itemPrice: '.item-price, .price, [data-testid="item-price"], .product-price'
            },
            
            // Estados de pedido específicos de Didí
            status: {
                pending: '.status-pending, [data-status="pending"], .pending, .waiting',
                confirmed: '.status-confirmed, [data-status="confirmed"], .confirmed, .accepted',
                preparing: '.status-preparing, [data-status="preparing"], .preparing, .cooking',
                ready: '.status-ready, [data-status="ready"], .ready, .prepared',
                delivering: '.status-delivering, [data-status="delivering"], .delivering, .on-the-way',
                delivered: '.status-delivered, [data-status="delivered"], .delivered, .completed',
                cancelled: '.status-cancelled, [data-status="cancelled"], .cancelled, .canceled'
            }
        },
        
        // Mapeo de estados de Didí Food a estados internos
        statusMap: {
            'pending': 'pending',
            'waiting': 'pending',
            'new': 'pending',
            'confirmed': 'pending',
            'accepted': 'pending',
            'preparing': 'preparing',
            'cooking': 'preparing',
            'in_preparation': 'preparing',
            'ready': 'ready',
            'prepared': 'ready',
            'ready_for_pickup': 'ready',
            'picked_up': 'delivering',
            'out_for_delivery': 'delivering',
            'delivering': 'delivering',
            'on_the_way': 'delivering',
            'delivered': 'delivered',
            'completed': 'delivered',
            'finished': 'delivered',
            'cancelled': 'cancelled',
            'canceled': 'cancelled',
            'rejected': 'cancelled'
        },
        
        // Configuración de monitoreo
        monitoring: {
            // Intervalo de verificación (en milisegundos)
            checkInterval: 90000, // 1.5 minutos (más conservador que Uber Eats)
            
            // Tiempo de espera para cargar página
            pageLoadTimeout: 30000, // 30 segundos
            
            // Número máximo de pedidos a procesar por ciclo
            maxOrdersPerCycle: 15,
            
            // Configuración de reintentos
            retry: {
                maxAttempts: 3,
                delay: 5000 // 5 segundos
            }
        },
        
        // Configuración específica de Didí Food
        features: {
            // Didí puede requerir verificación por SMS
            requiresSMSVerification: true,
            
            // Selectores para verificación SMS
            smsVerification: {
                phoneInput: 'input[name="phone"], input[type="tel"]',
                sendCodeButton: '.send-code-btn, [data-testid="send-code"]',
                codeInput: 'input[name="code"], input[name="verification"]',
                verifyButton: '.verify-btn, [data-testid="verify-code"]'
            },
            
            // Configuración de idioma (Didí opera en múltiples países)
            language: 'es', // español por defecto
            region: 'mx' // México por defecto
        }
    },
    
    // Configuración de logging
    logging: {
        enabled: true,
        level: 'info', // debug, info, warn, error
        logFile: 'logs/didi-food-scraper.log',
        screenshotOnError: true
    },
    
    // Configuración de seguridad
    security: {
        // Rotar User-Agent ocasionalmente
        rotateUserAgent: true,
        
        // Delay aleatorio entre requests (más conservador para Didí)
        randomDelay: {
            min: 2000, // 2 segundos
            max: 5000  // 5 segundos
        },
        
        // Headers adicionales para parecer más humano
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache'
        }
    }
};
