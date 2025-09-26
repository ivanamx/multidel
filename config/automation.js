/**
 * Configuración de Automatización del Dashboard
 * 
 * Este archivo contiene las configuraciones para diferentes estrategias
 * de actualización automática del dashboard.
 */

module.exports = {
    // Configuración de WebSockets
    websockets: {
        enabled: true,
        reconnectInterval: 5000, // 5 segundos
        maxReconnectAttempts: 10
    },
    
    // Configuración de actualizaciones automáticas
    autoRefresh: {
        enabled: true,
        interval: 30000, // 30 segundos
        statsUpdateInterval: 30000, // 30 segundos
        ordersUpdateInterval: 60000, // 1 minuto
        trackingUpdateInterval: 10000 // 10 segundos
    },
    
    // Configuración de notificaciones
    notifications: {
        enabled: true,
        newOrder: {
            enabled: true,
            duration: 5000 // 5 segundos
        },
        statusChange: {
            enabled: true,
            duration: 4000 // 4 segundos
        },
        sound: {
            enabled: false,
            newOrder: '/sounds/new-order.mp3',
            statusChange: '/sounds/status-change.mp3'
        }
    },
    
    // Configuración de indicadores visuales
    indicators: {
        connectionStatus: true,
        lastUpdate: true,
        loadingSpinner: true
    },
    
    // Configuración de fallback
    fallback: {
        enabled: true,
        // Si WebSockets falla, usar polling tradicional
        pollingInterval: 60000, // 1 minuto
        maxRetries: 3
    },
    
    // Configuración de rendimiento
    performance: {
        // Limitar actualizaciones si hay muchos clientes conectados
        maxClients: 100,
        // Debounce para evitar demasiadas actualizaciones
        debounceDelay: 1000, // 1 segundo
        // Cache de datos para reducir consultas a la BD
        cacheEnabled: true,
        cacheDuration: 5000 // 5 segundos
    }
};

/**
 * ESTRATEGIAS DE AUTOMATIZACIÓN DISPONIBLES:
 * 
 * 1. WEBSOCKETS (Recomendado)
 *    - Actualización en tiempo real
 *    - Menos carga en el servidor
 *    - Experiencia de usuario superior
 *    - Notificaciones instantáneas
 * 
 * 2. POLLING TRADICIONAL
 *    - Actualización cada X segundos
 *    - Más carga en el servidor
 *    - Simpler de implementar
 *    - Fallback cuando WebSockets falla
 * 
 * 3. SERVER-SENT EVENTS (SSE)
 *    - Actualización unidireccional
 *    - Menos complejo que WebSockets
 *    - Bueno para notificaciones
 * 
 * 4. LONG POLLING
 *    - Mantiene conexión abierta
 *    - Actualización cuando hay cambios
 *    - Más eficiente que polling tradicional
 * 
 * 5. HÍBRIDO
 *    - WebSockets para cambios importantes
 *    - Polling para actualizaciones regulares
 *    - Mejor balance entre rendimiento y confiabilidad
 */ 