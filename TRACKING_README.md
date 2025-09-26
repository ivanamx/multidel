# 🗺️ Sistema de Tracking en Tiempo Real - MultiDel

## 📍 **Descripción General**

El sistema de tracking en tiempo real permite monitorear la ubicación de los repartidores de todas las plataformas de delivery (Uber Eats, Rappi, Didi Food) en un mapa interactivo de **OpenStreetMap** (completamente gratuito).

## 🚀 **Características Principales**

### **✅ Funcionalidades Implementadas:**
- **🗺️ Mapa Interactivo:** Visualización en tiempo real con OpenStreetMap (GRATIS)
- **📍 Marcadores Dinámicos:** Repartidores, restaurante y clientes
- **🛣️ Rutas Visuales:** Líneas que muestran el camino de entrega
- **⏱️ Actualización Automática:** Configurable (10s, 30s, 1min)
- **📊 Estadísticas en Tiempo Real:** Métricas del mapa
- **🎯 Controles Interactivos:** Activar/desactivar tracking, centrar mapa
- **📱 Ventanas de Información:** Detalles de cada entrega
- **🔄 API RESTful:** Endpoints para gestión de tracking
- **💰 COSTO CERO:** Sin API keys ni costos mensuales

### **🔧 APIs Soportadas:**

#### **Uber Eats:**
```javascript
// Endpoint: /v1/orders/{order_id}/delivery_status
// Frecuencia: 10-30 segundos
// Datos: GPS del repartidor, tiempo estimado de llegada
```

#### **Rappi:**
```javascript
// Endpoint: /api/v1/orders/{order_id}/tracking
// Frecuencia: 15-45 segundos
// Datos: Coordenadas GPS, estado de entrega, tiempo restante
```

#### **Didi Food:**
```javascript
// Endpoint: /api/orders/{order_id}/delivery-location
// Frecuencia: 20-60 segundos
// Datos: Ubicación en tiempo real, ruta optimizada
```



## 🛠️ **Configuración**

### **1. Variables de Entorno (.env):**
```bash
# NO SE REQUIERE API KEY DE GOOGLE MAPS - ES GRATIS

# Uber Eats
UBER_EATS_ACCESS_TOKEN=tu_uber_eats_access_token
UBER_EATS_PRODUCTION_URL=https://api.uber.com/v1

# Rappi
RAPPI_ACCESS_TOKEN=tu_rappi_access_token
RAPPI_API_URL=https://services.rappi.com/api

# Didi Food
DIDI_ACCESS_TOKEN=tu_didi_access_token
DIDI_API_URL=https://api.didi.com


```

### **2. Base de Datos:**
```sql
-- Tabla de tracking (se crea automáticamente con npm run db:migrate)
CREATE TABLE delivery_tracking (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) UNIQUE,
    platform VARCHAR(100) NOT NULL,
    driver_lat DECIMAL(10,8),
    driver_lng DECIMAL(11,8),
    estimated_arrival TIMESTAMP,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📡 **APIs Disponibles**

### **GET /api/tracking/locations**
Obtiene ubicaciones en tiempo real de todas las entregas activas.

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "orderId": 123,
      "platform": "Uber Eats",
      "driverLocation": {
        "lat": 19.4326,
        "lng": -99.1332
      },
      "estimatedArrival": "2024-01-15T14:30:00Z",
      "status": "en_ruta",
      "lastUpdated": "2024-01-15T14:25:00Z",
      "order": {
        "id": 123,
        "customer_name": "Juan Pérez",
        "platform_name": "Uber Eats",
        "total_amount": "25.50"
      }
    }
  ]
}
```

### **POST /api/tracking/start/:orderId**
Inicia tracking para una orden específica.

**Body:**
```json
{
  "updateInterval": 30000
}
```

### **POST /api/tracking/stop/:orderId**
Detiene tracking para una orden específica.

### **GET /api/tracking/history/:orderId**
Obtiene historial de tracking de una orden.

### **GET /api/tracking/stats**
Obtiene estadísticas de tracking del día.

### **POST /api/tracking/cleanup**
Limpia datos antiguos de tracking.

## 🎯 **Uso del Dashboard**

### **1. Acceder al Mapa:**
- Ve al dashboard: `http://localhost:5678/api/dashboard`
- Haz clic en la card "En Entrega"
- El mapa se cargará automáticamente (GRATIS)

### **2. Controles del Mapa:**
- **🟢 Activar Tracking:** Inicia la actualización en tiempo real
- **🔵 Centrar:** Centra el mapa en todas las entregas
- **⚙️ Actualizar:** Selecciona frecuencia de actualización (10s, 30s, 1min)

### **3. Información Visual:**
- **🔴 Rojo (R):** Restaurante
- **🟣 Púrpura (D):** Repartidores
- **🟢 Verde (C):** Clientes
- **🟣 Líneas:** Rutas de entrega

### **4. Interactividad:**
- **Clic en marcador:** Muestra detalles del pedido
- **Botón "Ver Detalles":** Abre modal con información completa
- **Botón "Activar Tracking":** Inicia tracking específico para esa orden

## 🔧 **Implementación Técnica**

### **Frontend (JavaScript con Leaflet):**
```javascript
// Inicializar mapa (GRATIS)
initDeliveryMap();

// Activar tracking
toggleLiveTracking();

// Actualizar ubicaciones
updateDeliveryLocations();

// Centrar mapa
centerMap();
```

### **Backend (Node.js):**
```javascript
// Servicio de tracking
const deliveryTrackingService = require('./services/deliveryTrackingService');

// Iniciar tracking
await deliveryTrackingService.startTracking(orderId, platformName, platformOrderId);

// Obtener ubicación
const location = await deliveryTrackingService.getDriverLocation(orderId, platformName, platformOrderId);
```

## 📊 **Métricas del Mapa**

### **Estadísticas en Tiempo Real:**
- **En Ruta:** Número de entregas activas
- **Tiempo Promedio:** Tiempo promedio de entrega
- **Distancia Total:** Distancia total de todas las rutas

### **Datos por Plataforma:**
- Ubicación GPS del repartidor
- Tiempo estimado de llegada
- Estado de la entrega
- Última actualización

## 💰 **Ventajas de OpenStreetMap vs Google Maps**

### **✅ OpenStreetMap (Implementado):**
- **💰 COMPLETAMENTE GRATIS**
- **🌍 Datos de código abierto**
- **📊 Sin límites de uso**
- **🔧 Sin API keys requeridas**
- **⚡ Rendimiento excelente**
- **🔄 Actualizaciones frecuentes**

### **❌ Google Maps:**
- **💸 $7 USD por 1,000 cargas**
- **🔑 API key requerida**
- **📊 Límites de uso**
- **💰 Costos mensuales**
- **🔒 Datos propietarios**

## 🚨 **Consideraciones Importantes**

### **1. API Keys:**
- **OpenStreetMap:** NO requiere API key (GRATIS)
- **Plataformas:** Requiere tokens de acceso válidos para cada plataforma

### **2. Límites de Rate:**
- **Uber Eats:** Máximo 1000 requests/hora
- **Rappi:** Máximo 500 requests/hora
- **Didi Food:** Máximo 300 requests/hora

### **3. Privacidad:**
- Los datos de ubicación se almacenan temporalmente
- Se limpian automáticamente después de 7 días
- Cumple con regulaciones de privacidad

### **4. Rendimiento:**
- Actualización configurable para optimizar recursos
- Caché de ubicaciones para reducir llamadas a APIs
- Compresión de datos para mejor rendimiento

## 🔮 **Próximas Mejoras**

### **Funcionalidades Planificadas:**
- **🔔 Notificaciones Push:** Alertas de llegada
- **📱 App Móvil:** Versión móvil del tracking
- **🤖 IA Predictiva:** Predicción de tiempos de llegada
- **📈 Analytics Avanzados:** Métricas de rendimiento
- **🌐 WebSockets:** Actualización en tiempo real sin polling

### **Integraciones Futuras:**
- **Waze:** Integración con navegación
- **WhatsApp:** Notificaciones automáticas
- **SMS:** Alertas por mensaje de texto
- **Email:** Reportes automáticos

## 🆘 **Solución de Problemas**

### **Error: "Mapa no se carga"**
```bash
# Verificar conexión a internet
ping openstreetmap.org

# Verificar que Leaflet se cargue correctamente
# Debe aparecer en la consola del navegador
```

### **Error: "No se obtienen ubicaciones"**
```bash
# Verificar tokens de plataformas
echo $UBER_EATS_ACCESS_TOKEN
echo $RAPPI_ACCESS_TOKEN

# Verificar conectividad
curl -I https://api.uber.com/v1/health
```

### **Error: "Base de datos no conecta"**
```bash
# Verificar conexión PostgreSQL
psql -h localhost -U ivanam -d multidel_db

# Ejecutar migración
npm run db:migrate
```

## 📞 **Soporte**

Para soporte técnico o preguntas sobre el sistema de tracking:

1. **Documentación:** Revisa este README
2. **Logs:** Verifica los logs del servidor
3. **Base de Datos:** Verifica la tabla `delivery_tracking`
4. **APIs:** Prueba los endpoints con Postman

---

**🎯 ¡El sistema de tracking está listo para revolucionar tu gestión de entregas - SIN COSTOS!**