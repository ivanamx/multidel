-- Actualizar todos los registros de orders con platform_id aleatorio entre 1, 2 y 3
UPDATE orders 
SET platform_id = CASE 
    WHEN random() < 0.33 THEN 1  -- Uber Eats
    WHEN random() < 0.66 THEN 2  -- Rappi
    ELSE 3                       -- Didi Food
END;

-- Verificar el resultado
SELECT 
    platform_id,
    COUNT(*) as cantidad_ordenes,
    CASE 
        WHEN platform_id = 1 THEN 'Uber Eats'
        WHEN platform_id = 2 THEN 'Rappi'
        WHEN platform_id = 3 THEN 'Didi Food'
        ELSE 'Desconocido'
    END as plataforma
FROM orders 
GROUP BY platform_id 
ORDER BY platform_id;

-- Mostrar algunos ejemplos
SELECT 
    id,
    platform_id,
    platform_order_id,
    customer_name,
    status,
    CASE 
        WHEN platform_id = 1 THEN 'Uber Eats'
        WHEN platform_id = 2 THEN 'Rappi'
        WHEN platform_id = 3 THEN 'Didi Food'
        ELSE 'Desconocido'
    END as plataforma
FROM orders 
ORDER BY id DESC 
LIMIT 10; 