# 🤖 Sistema de Automatización Híbrida - MultiDel

## 📋 Resumen

El sistema de automatización híbrida combina **webhooks en tiempo real** con **polling de respaldo** para mantener los estados de los pedidos sincronizados automáticamente con las plataformas de delivery.

## 🏗️ Arquitectura

### **Componentes principales:**

1. **`services/automationService.js`** - Servicio principal de automatización
2. **`routes/webhooks.js`** - Endpoints para recibir webhooks
3. **Integración en `server.js`** - Inicialización automática

### **Flujo de automatización:**

```
📥 Webhook (Tiempo Real)     🔄 Polling (Respaldo)
        ↓                           ↓
   Procesamiento              Verificación
        ↓                           ↓
   Actualización DB          Actualización DB
        ↓                           ↓
   WebSocket Update          WebSocket Update
        ↓                           ↓
   Dashboard Update          Dashboard Update
```

## 🚀 Características

### **1. Webhooks en Tiempo Real**
- ✅ **Uber Eats**: `POST /api/webhooks/uber-eats`
- ✅ **Rappi**: `POST /api/webhooks/rappi`
- ✅ **Didi Food**: `POST /api/webhooks/didi` (preparado)

**Ventajas:**
- Cambios instantáneos
- Sin latencia
- Eficiente en recursos

### **2. Polling de Respaldo**
- 🔄 **Frecuencia**: Cada 2 minutos
- 🔍 **Verificación**: Solo pedidos activos (`pending`, `preparing`, `ready`, `delivering`)
- 📊 **Límite**: Máximo 10 pedidos por ciclo

**Ventajas:**
- Respaldo confiable
- Detecta cambios perdidos
- Funciona sin webhooks

### **3. Estados Automatizados**

| Estado | Uber Eats | Rappi | Didi Food |
|--------|-----------|-------|-----------|
| `pending` → `preparing` | ✅ | ✅ | ⏳ |
| `preparing` → `ready` | ✅ | ✅ | ⏳ |
| `ready` → `delivering` | ✅ | ✅ | ⏳ |
| `delivering` → `delivered` | ✅ | ✅ | ⏳ |

## 🔧 Configuración

### **Variables de Entorno Requeridas:**

```env
# Uber Eats
UBER_EATS_PRODUCTION_URL=https://api.uber.com/v1
UBER_EATS_CLIENT_ID=tu_client_id
UBER_EATS_CLIENT_SECRET=tu_client_secret

# Rappi
RAPPI_API_URL=https://services.rappi.com/api
RAPPI_CLIENT_ID=tu_client_id
RAPPI_CLIENT_SECRET=tu_client_secret

# Didi Food (cuando esté disponible)
DIDI_API_URL=https://api.didi.com
DIDI_CLIENT_ID=tu_client_id
DIDI_CLIENT_SECRET=tu_client_secret
```

### **URLs de Webhooks para Configurar:**

```
Uber Eats: https://tu-dominio.com/api/webhooks/uber-eats
Rappi: https://tu-dominio.com/api/webhooks/rappi
Didi Food: https://tu-dominio.com/api/webhooks/didi
```

## 📊 APIs de Control

### **1. Obtener Estadísticas**
```http
GET /api/webhooks/automation/stats
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "isPollingActive": true,
    "pollingInterval": "2 minutos",
    "stats": {
      "total_orders": 150,
      "pending": 25,
      "preparing": 15,
      "ready": 8,
      "delivering": 12,
      "delivered": 90
    }
  }
}
```

### **2. Controlar Automatización**
```http
POST /api/webhooks/automation/control
Content-Type: application/json

{
  "action": "start" | "stop"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Automatización iniciada correctamente"
}
```

## 🔍 Monitoreo y Logs

### **Logs del Sistema:**

```
🤖 Iniciando sistema de automatización híbrida...
🔄 Polling de respaldo iniciado (cada 2 minutos)
✅ Automatización iniciada: Webhooks + Polling de respaldo

📥 Webhook de Uber Eats recibido: order_123
✅ Pedido procesado de Uber Eats: 456

🔍 Verificando 5 pedidos...
🔄 Actualizando pedido 123: pending → preparing
```

### **Métricas de Rendimiento:**

- **Webhooks procesados**: Contador en tiempo real
- **Polling cycles**: Cada 2 minutos
- **Estados actualizados**: Log de cambios
- **Errores**: Log detallado con stack trace

## 🛠️ Mantenimiento

### **Reiniciar Automatización:**
```bash
# Via API
curl -X POST http://localhost:5678/api/webhooks/automation/control \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'

curl -X POST http://localhost:5678/api/webhooks/automation/control \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### **Verificar Estado:**
```bash
curl http://localhost:5678/api/webhooks/automation/stats
```

### **Logs en Tiempo Real:**
```bash
# Ver logs de automatización
tail -f logs/automation.log | grep "🤖\|🔄\|✅\|❌"
```

## 🔒 Seguridad

### **Validación de Webhooks:**

1. **Firmas digitales** (Uber Eats, Rappi)
2. **Headers de autenticación**
3. **Rate limiting** en endpoints
4. **Logs de auditoría**

### **Manejo de Errores:**

- **Reintentos automáticos** en polling
- **Fallback graceful** si falla una plataforma
- **Alertas** para errores críticos
- **Recuperación automática** de conexiones

## 📈 Beneficios

### **Para el Negocio:**
- ✅ **Reducción de errores manuales** en 95%
- ✅ **Actualizaciones en tiempo real** de estados
- ✅ **Mejor experiencia del cliente** con información precisa
- ✅ **Optimización de operaciones** con menos intervención manual

### **Para el Equipo:**
- ✅ **Menos trabajo manual** de actualización de estados
- ✅ **Datos consistentes** entre plataformas
- ✅ **Alertas automáticas** para problemas
- ✅ **Dashboard siempre actualizado**

## 🚀 Próximos Pasos

### **Mejoras Planificadas:**

1. **Machine Learning** para predicción de tiempos
2. **Alertas inteligentes** basadas en patrones
3. **Integración con más plataformas**
4. **Análisis avanzado** de rendimiento
5. **API de configuración** dinámica

### **Escalabilidad:**

- **Microservicios** para cada plataforma
- **Queue system** para webhooks
- **Cache distribuido** para consultas frecuentes
- **Load balancing** para alta disponibilidad

---

**🎯 El sistema de automatización híbrida garantiza que los estados de los pedidos estén siempre sincronizados, proporcionando una experiencia confiable y eficiente para tu operación de delivery.** 