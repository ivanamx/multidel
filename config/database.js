const { Pool } = require('pg');

// Validar y configurar la contraseña
const password = process.env.DB_PASSWORD || '';
if (!password) {
  console.warn('⚠️  DB_PASSWORD no está definida. Usando contraseña vacía.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'multidel_db',
  user: process.env.DB_USER || 'postgres',
  password: password,
  max: 20, // máximo 20 conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en la conexión de PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};