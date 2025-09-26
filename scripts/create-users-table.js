const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createUsersTable() {
    try {
        console.log('🚀 Iniciando creación de tabla de usuarios...');
        
        // Leer el archivo SQL
        const sqlFile = path.join(__dirname, 'create-users-table.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // Dividir el contenido en statements individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Ejecutando ${statements.length} statements SQL...`);
        
        // Ejecutar cada statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await db.query(statement);
                    console.log(`✅ Statement ${i + 1} ejecutado correctamente`);
                } catch (error) {
                    // Algunos statements pueden fallar si ya existen (como CREATE TABLE IF NOT EXISTS)
                    if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
                        console.log(`⚠️ Statement ${i + 1} omitido (ya existe): ${error.message}`);
                    } else {
                        console.error(`❌ Error en statement ${i + 1}:`, error.message);
                    }
                }
            }
        }
        
        // Verificar que la tabla se creó correctamente
        console.log('\n🔍 Verificando tabla de usuarios...');
        const tableCheck = await db.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        `);
        
        if (tableCheck.rows.length > 0) {
            console.log('✅ Tabla de usuarios creada correctamente con las siguientes columnas:');
            tableCheck.rows.forEach(row => {
                console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
        }
        
        // Mostrar usuarios creados
        console.log('\n👥 Usuarios en la base de datos:');
        const users = await db.query(`
            SELECT id, username, email, role, active, created_at 
            FROM users 
            ORDER BY created_at
        `);
        
        if (users.rows.length > 0) {
            users.rows.forEach(user => {
                console.log(`   - ${user.username} (${user.email}) - Rol: ${user.role} - Activo: ${user.active}`);
            });
        } else {
            console.log('   No se encontraron usuarios');
        }
        
        console.log('\n🎉 ¡Tabla de usuarios creada exitosamente!');
        console.log('\n📋 Credenciales por defecto:');
        console.log('   Administrador: admin / admin123');
        console.log('   Gerente: manager / manager123');
        console.log('   Personal: staff / staff123');
        console.log('\n⚠️ IMPORTANTE: Cambia estas contraseñas después del primer login');
        
    } catch (error) {
        console.error('❌ Error creando tabla de usuarios:', error);
        process.exit(1);
    } finally {
        // Cerrar conexión
        await db.pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createUsersTable();
}

module.exports = createUsersTable;
