/**
 * Configuración de Web Scraping para Uber Eats
 * 
 * Este archivo contiene las configuraciones para el monitoreo
 * del panel web de Uber Eats Partner.
 */

module.exports = {
    // Configuración del navegador
    browser: {
        headless: process.env.SCRAPER_HEADLESS !== 'false', // true por defecto
        timeout: 30000, // 30 segundos
        viewport: {
            width: 1920,
            height: 1080
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    
    // Configuración de Uber Eats
    uberEats: {
        // URLs del panel de restaurante
        urls: {
            login: 'https://restaurants.ubereats.com/login',
            dashboard: 'https://restaurants.ubereats.com/dashboard',
            orders: 'https://restaurants.ubereats.com/orders'
        },
        
        // Selectores para elementos del panel
        selectors: {
            // Login
            login: {
                emailInput: 'input[name="email"], input[type="email"], #email',
                passwordInput: 'input[name="password"], input[type="password"], #password',
                loginButton: 'button[type="submit"], .login-button, [data-testid="login-button"]',
                errorMessage: '.error-message, .alert-danger, [data-testid="error"]'
            },
            
            // Dashboard/Orders
            orders: {
                // Contenedor principal de pedidos
                container: '.orders-container, .order-list, [data-testid="orders-list"], .dashboard-orders',
                
                // Elementos individuales de pedido
                orderItem: '.order-item, .order-card, [data-testid="order-item"], .order-row',
                
                // Información del pedido
                orderId: '.order-id, [data-testid="order-id"], .order-number',
                customerName: '.customer-name, [data-testid="customer-name"], .customer-info .name',
                customerPhone: '.customer-phone, [data-testid="customer-phone"], .customer-info .phone',
                customerAddress: '.customer-address, [data-testid="customer-address"], .delivery-address',
                orderStatus: '.order-status, [data-testid="order-status"], .status-badge',
                orderTotal: '.order-total, [data-testid="order-total"], .total-amount',
                orderTime: '.order-time, [data-testid="order-time"], .created-at',
                
                // Items del pedido
                itemsContainer: '.order-items, [data-testid="order-items"], .items-list',
                itemElement: '.item, .order-item-detail, [data-testid="order-item"]',
                itemName: '.item-name, .product-name, [data-testid="item-name"]',
                itemQuantity: '.item-quantity, .quantity, [data-testid="item-quantity"]',
                itemPrice: '.item-price, .price, [data-testid="item-price"]'
            },
            
            // Estados de pedido
            status: {
                pending: '.status-pending, [data-status="pending"], .pending',
                confirmed: '.status-confirmed, [data-status="confirmed"], .confirmed',
                preparing: '.status-preparing, [data-status="preparing"], .preparing',
                ready: '.status-ready, [data-status="ready"], .ready',
                delivering: '.status-delivering, [data-status="delivering"], .delivering',
                delivered: '.status-delivered, [data-status="delivered"], .delivered',
                cancelled: '.status-cancelled, [data-status="cancelled"], .cancelled'
            }
        },
        
        // Mapeo de estados de Uber Eats a estados internos
        statusMap: {
            'pending': 'pending',
            'new': 'pending',
            'confirmed': 'pending',
            'accepted': 'pending',
            'preparing': 'preparing',
            'in_preparation': 'preparing',
            'ready': 'ready',
            'ready_for_pickup': 'ready',
            'picked_up': 'delivering',
            'out_for_delivery': 'delivering',
            'delivering': 'delivering',
            'delivered': 'delivered',
            'completed': 'delivered',
            'cancelled': 'cancelled',
            'canceled': 'cancelled'
        },
        
        // Configuración de monitoreo
        monitoring: {
            // Intervalo de verificación (en milisegundos)
            checkInterval: 60000, // 1 minuto
            
            // Tiempo de espera para cargar página
            pageLoadTimeout: 30000, // 30 segundos
            
            // Número máximo de pedidos a procesar por ciclo
            maxOrdersPerCycle: 20,
            
            // Configuración de reintentos
            retry: {
                maxAttempts: 3,
                delay: 5000 // 5 segundos
            }
        }
    },
    
    // Configuración de logging
    logging: {
        enabled: true,
        level: 'info', // debug, info, warn, error
        logFile: 'logs/uber-eats-scraper.log',
        screenshotOnError: true
    },
    
    // Configuración de seguridad
    security: {
        // Rotar User-Agent ocasionalmente
        rotateUserAgent: true,
        
        // Delay aleatorio entre requests
        randomDelay: {
            min: 1000, // 1 segundo
            max: 3000  // 3 segundos
        },
        
        // Headers adicionales para parecer más humano
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    }
};
