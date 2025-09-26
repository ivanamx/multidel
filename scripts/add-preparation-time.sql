-- Script para agregar el campo preparation_time a la tabla orders
-- Ejecutar en PostgreSQL

-- Agregar columna preparation_time a la tabla orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 15;

-- Agregar comentario a la columna
COMMENT ON COLUMN orders.preparation_time IS 'Tiempo de preparación en minutos';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'preparation_time';

-- Mostrar la estructura actualizada de la tabla
\d orders; 