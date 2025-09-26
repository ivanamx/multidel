# Sistema de Autenticación MultiDel

Este documento explica cómo configurar y usar el sistema de autenticación agregado al proyecto MultiDel.

## 🚀 Instalación y Configuración

### 1. Crear la tabla de usuarios

Ejecuta el siguiente comando para crear la tabla de usuarios en la base de datos:

```bash
npm run db:create-users
```

Este comando:
- Crea la tabla `users` con todos los campos necesarios
- Crea índices para mejorar el rendimiento
- Inserta usuarios por defecto
- Configura triggers automáticos

### 2. Configurar variables de entorno

Asegúrate de que tu archivo `.env` tenga la siguiente configuración:

```env
# JWT Secret (cambia por uno seguro)
JWT_SECRET=tu_jwt_secret_super_seguro

# Configuración de base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=multidel_db
DB_USER=postgres
DB_PASSWORD=tu_password
```

## 👥 Usuarios por Defecto

El sistema crea automáticamente los siguientes usuarios:

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| admin | admin@multidel.com | admin123 | Administrador |
| manager | manager@multidel.com | manager123 | Gerente |
| staff | staff@multidel.com | staff123 | Personal |

⚠️ **IMPORTANTE**: Cambia estas contraseñas después del primer login.

## 🔐 Funcionalidades del Sistema

### Backend (API)

#### Rutas de Autenticación

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar nuevo usuario
- `GET /api/auth/me` - Obtener información del usuario actual
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/change-password` - Cambiar contraseña

#### Middleware de Autenticación

- `authenticateToken` - Verifica el token JWT
- `requireRole(roles)` - Verifica roles específicos

#### Ejemplo de uso del middleware:

```javascript
const { authenticateToken, requireRole } = require('./middleware/auth');

// Proteger ruta con autenticación
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Proteger ruta con rol específico
app.get('/api/admin-only', authenticateToken, requireRole(['admin']), (req, res) => {
    res.json({ message: 'Solo administradores' });
});
```

### Frontend

#### Página de Login (`/login.html`)

- Formulario de login con validación
- Modal de registro de nuevos usuarios
- Manejo de errores y mensajes
- Redirección automática al dashboard

#### Dashboard con Autenticación

- Verificación automática de sesión
- Menú de usuario con opciones
- Cambio de contraseña
- Logout seguro

#### Gestión de Sesiones

- Tokens JWT con expiración de 24 horas
- Almacenamiento seguro en localStorage
- Verificación automática de sesión
- Logout automático al expirar

## 🛡️ Seguridad

### Características de Seguridad

1. **Contraseñas Encriptadas**: Usando bcrypt con salt rounds de 12
2. **Tokens JWT**: Firmados con secret personalizado
3. **Validación de Datos**: Usando Joi para validación
4. **Rate Limiting**: Protección contra ataques de fuerza bruta
5. **Headers de Seguridad**: Usando Helmet.js
6. **CORS**: Configurado apropiadamente

### Roles y Permisos

- **admin**: Acceso completo al sistema
- **manager**: Acceso a gestión y reportes
- **staff**: Acceso básico a operaciones

## 📱 Uso del Sistema

### 1. Acceder al Sistema

1. Navega a `http://localhost:3000/login.html`
2. Usa las credenciales por defecto o crea una nueva cuenta
3. Serás redirigido automáticamente al dashboard

### 2. Cambiar Contraseña

1. Haz clic en tu nombre de usuario en el dashboard
2. Selecciona "Cambiar Contraseña"
3. Ingresa tu contraseña actual y la nueva
4. Confirma el cambio

### 3. Cerrar Sesión

1. Haz clic en tu nombre de usuario
2. Selecciona "Cerrar Sesión"
3. Serás redirigido a la página de login

## 🔧 Desarrollo

### Agregar Autenticación a Nuevas Rutas

```javascript
const { authenticateToken, requireRole } = require('./middleware/auth');

// Ruta protegida básica
router.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Ruta protegida', user: req.user });
});

// Ruta solo para administradores
router.get('/admin', authenticateToken, requireRole(['admin']), (req, res) => {
    res.json({ message: 'Solo administradores' });
});
```

### Verificar Permisos en el Frontend

```javascript
// Verificar si el usuario tiene un rol específico
if (window.authManager.hasPermission('admin')) {
    // Mostrar funcionalidad de administrador
}

// Obtener información del usuario actual
const user = window.authManager.getCurrentUser();
console.log('Usuario actual:', user);
```

## 🐛 Solución de Problemas

### Error: "Token de acceso requerido"

- Verifica que estés logueado
- Revisa que el token esté en localStorage
- Intenta hacer logout y login nuevamente

### Error: "Token expirado"

- Tu sesión ha expirado (24 horas)
- Haz logout y login nuevamente

### Error: "Usuario no encontrado"

- El usuario puede haber sido desactivado
- Contacta al administrador

### Error de conexión a la base de datos

- Verifica la configuración de la base de datos
- Asegúrate de que PostgreSQL esté ejecutándose
- Revisa las credenciales en el archivo `.env`

## 📝 Notas Adicionales

- Los tokens JWT expiran después de 24 horas
- Las contraseñas se encriptan con bcrypt
- El sistema es compatible con el dashboard existente
- Se mantiene toda la funcionalidad previa del sistema

## 🔄 Actualizaciones Futuras

Posibles mejoras que se pueden implementar:

- Autenticación de dos factores (2FA)
- Recuperación de contraseña por email
- Sesiones múltiples
- Auditoría de acciones de usuarios
- Integración con sistemas externos (LDAP, OAuth)
