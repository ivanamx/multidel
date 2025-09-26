/**
 * Configuración de Email para Integración con Plataformas
 * 
 * Este archivo contiene las configuraciones para el monitoreo
 * de emails de las plataformas de delivery.
 */

module.exports = {
    // Configuración de servidor IMAP
    imap: {
        host: process.env.EMAIL_HOST || 'imap.gmail.com',
        port: process.env.EMAIL_PORT || 993,
        secure: true, // usar SSL
        auth: {
            user: process.env.EMAIL_USER || 'pedidos@tu-restaurante.com',
            pass: process.env.EMAIL_PASSWORD || 'tu_password_de_aplicacion'
        }
    },
    
    // Configuración específica por plataforma
    platforms: {
        rappi: {
            // Filtros para emails de Rappi
            filters: {
                from: ['noreply@rappi.com', 'pedidos@rappi.com', 'notificaciones@rappi.com'],
                subject: ['pedido', 'order', 'nuevo pedido', 'order received'],
                keywords: ['rappi', 'pedido', 'order']
            },
            // Configuración del parser
            parser: {
                // Patrones para extraer información
                patterns: {
                    orderId: /pedido\s*#?(\d+)/i,
                    customerName: /cliente[:\s]+([^\n\r]+)/i,
                    customerPhone: /tel[eé]fono[:\s]+([^\n\r]+)/i,
                    address: /direcci[óo]n[:\s]+([^\n\r]+)/i,
                    total: /total[:\s]+\$?([0-9,]+\.?[0-9]*)/i,
                    status: /estado[:\s]+([^\n\r]+)/i
                },
                // Mapeo de estados
                statusMap: {
                    'pendiente': 'pending',
                    'confirmado': 'pending',
                    'en preparación': 'preparing',
                    'preparando': 'preparing',
                    'listo': 'ready',
                    'en camino': 'delivering',
                    'entregado': 'delivered',
                    'cancelado': 'cancelled'
                }
            }
        },
        
        uberEats: {
            filters: {
                from: ['noreply@uber.com', 'eats@uber.com'],
                subject: ['uber eats', 'order', 'pedido'],
                keywords: ['uber', 'eats', 'pedido']
            },
            parser: {
                patterns: {
                    orderId: /order\s*#?(\d+)/i,
                    customerName: /customer[:\s]+([^\n\r]+)/i,
                    total: /total[:\s]+\$?([0-9,]+\.?[0-9]*)/i
                }
            }
        },
        
        didi: {
            filters: {
                from: ['noreply@didi.com', 'food@didi.com'],
                subject: ['didi food', 'pedido'],
                keywords: ['didi', 'food', 'pedido']
            }
        }
    },
    
    // Configuración de monitoreo
    monitoring: {
        // Intervalo de verificación de emails (en milisegundos)
        checkInterval: 60000, // 1 minuto
        
        // Número máximo de emails a procesar por ciclo
        maxEmailsPerCycle: 10,
        
        // Tiempo de espera entre procesamiento de emails
        processingDelay: 2000, // 2 segundos
        
        // Configuración de reintentos
        retry: {
            maxAttempts: 3,
            delay: 5000 // 5 segundos
        }
    },
    
    // Configuración de logging
    logging: {
        enabled: true,
        level: 'info', // debug, info, warn, error
        logFile: 'logs/email-parser.log'
    }
};
