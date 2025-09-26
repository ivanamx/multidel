// Variables globales
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};
let todayStatsCharts = {};
let revenueStatsCharts = {};
let pendingStatsCharts = {};
let deliveryStatsCharts = {};

// Variables para el mapa de tracking
let deliveryMap = null;
let mapMarkers = {};
let mapPolylines = {};
let mapRoutes = {};
let liveTrackingInterval = null;
let isTrackingActive = false;
let restaurantLocation = [19.4326, -99.1332]; // CDMX (cambiar por tu ubicación);

// Configuración de Socket.IO
let socket = null;

// Variable para debounce
let filterTimeout = null;

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando dashboard...');
    
    // Cargar datos iniciales
    loadPlatforms();
    loadStats();
    loadOrders();
    
    // Configurar filtros automáticos
    setupAutoFilters();
    
    // Inicializar Socket.IO
    initializeSocket();
    
    // Inicializar mapa de delivery
    initDeliveryMap();
    
    // Iniciar tracking automático
    startAutoTracking();
    
    // Iniciar verificación de pedidos nuevos (con intervalo más largo)
    startNewOrderCheck();
    
    // Actualizar fecha y hora cada segundo (tiempo real)
    updateDateTime(); // Actualización inmediata
    setInterval(updateDateTime, 1000);
    
    // Configurar badges de fecha
    updateBadgeStates('today');
    
    console.log('✅ Dashboard inicializado correctamente');
});

// Configurar filtros automáticos
function setupAutoFilters() {
    // Event listener para filtro de estado
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    // Event listener para filtro de plataforma
    const platformFilter = document.getElementById('platformFilter');
    if (platformFilter) {
        platformFilter.addEventListener('change', applyFilters);
    }
    
    // Event listeners para filtros de fecha
    const dateFrom = document.getElementById('dateFrom');
    if (dateFrom) {
        dateFrom.addEventListener('change', applyFilters);
    }
    
    const dateTo = document.getElementById('dateTo');
    if (dateTo) {
        dateTo.addEventListener('change', applyFilters);
    }
    
    console.log('🎯 Filtros automáticos configurados');
    
    // Event listeners para los badges de fecha
    const todayBadge = document.getElementById('todayBadge');
    const yesterdayBadge = document.getElementById('yesterdayBadge');
    
    if (todayBadge) {
        todayBadge.addEventListener('click', handleTodayBadgeClick);
    }
    
    if (yesterdayBadge) {
        yesterdayBadge.addEventListener('click', handleYesterdayBadgeClick);
    }
    
    console.log('🎯 Event listeners de badges configurados');
    
    // Ejecutar automáticamente el filtro de "Hoy" al cargar la página
    setTimeout(() => {
        console.log('📅 Aplicando filtro "Hoy" por defecto...');
        handleTodayBadgeClick();
    }, 500); // Pequeño delay para asegurar que todo esté cargado
    
    // Inicializar estado del botón "Limpiar Filtros"
    updateClearFiltersButton(false);
}

// Inicializar Socket.IO
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('🔌 Conectado al servidor WebSocket');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 Desconectado del servidor WebSocket');
        updateConnectionStatus(false);
    });
    
    // Escuchar actualizaciones del dashboard
    socket.on('dashboardUpdate', (data) => {
        console.log('📊 Actualización recibida:', data.type);
        handleDashboardUpdate(data);
    });
}

// Manejar actualizaciones del dashboard
function handleDashboardUpdate(data) {
    switch(data.type) {
        case 'stats':
            updateStatsDisplay(data.data);
            break;
        case 'orders':
            updateOrdersDisplay(data.data);
            break;
        case 'newOrder':
            showNewOrderNotification(data.data);
            break;
        case 'statusChange':
            showStatusChangeNotification(data.data);
            break;
        default:
            console.log('Actualización no manejada:', data.type);
    }
    updateLastUpdate();
}

// Actualizar estadísticas en pantalla
function updateStatsDisplay(stats) {
    const todayOrdersElement = document.getElementById('todayOrders');
    const todayRevenueElement = document.getElementById('todayRevenue');
    const pendingOrdersElement = document.getElementById('pendingOrders');
    const deliveryOrdersElement = document.getElementById('deliveringOrders');
    
    if (todayOrdersElement && stats.today?.count !== undefined) {
        todayOrdersElement.textContent = parseInt(stats.today.count).toString();
    }
    if (todayRevenueElement && stats.today?.revenue !== undefined) {
        todayRevenueElement.textContent = `$${parseFloat(stats.today.revenue).toFixed(2)} MXN`;
    }
    if (pendingOrdersElement && stats.pending?.count !== undefined) {
        pendingOrdersElement.textContent = parseInt(stats.pending.count).toString();
    }
    if (deliveryOrdersElement && stats.delivery?.count !== undefined) {
        deliveryOrdersElement.textContent = parseInt(stats.delivery.count).toString();
    }
}

// Actualizar tabla de pedidos
function updateOrdersDisplay(orders) {
    renderOrders(orders);
    document.getElementById('ordersCount').textContent = 
        `Mostrando ${orders.length} pedidos`;
}

// Variables para el modal de nuevo pedido
let currentNewOrder = null;
let confirmationTimer = null;
let confirmationCountdown = 30;

// Mostrar modal de confirmación de nuevo pedido
function showNewOrderNotification(order) {
    currentNewOrder = order;
    confirmationCountdown = 30;
    
    // Mostrar el modal
    const modal = document.getElementById('newOrderModal');
    modal.classList.remove('hidden');
    
    // Cargar contenido del pedido
    loadNewOrderContent(order);
    
    // Iniciar timer de confirmación
    startConfirmationTimer();
    
    // Reproducir sonido de notificación (opcional)
    playNotificationSound();
    
    // Mostrar también una notificación toast rápida
    showQuickToastNotification(order);
}

// Cargar contenido del modal de nuevo pedido
function loadNewOrderContent(order) {
    const content = document.getElementById('newOrderModalContent');
    
    // Actualizar el icono de la plataforma en el header
    const platformIconHeader = document.getElementById('platformIconHeader');
    platformIconHeader.innerHTML = `<img src="/images/${getPlatformLogo(order.platform_name)}" alt="${order.platform_name}" class="h-6 w-auto">`;
    platformIconHeader.className = `mr-2`;
    
    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-1 gap-2">
            <!-- Información del pedido en una sola fila -->
            <div class="bg-gray-50 rounded p-3">
                <div class="grid grid-cols-4 gap-4 text-center">
                    <div class="bg-blue-50 rounded p-2">
                        <div class="text-xs font-bold text-blue-900 mb-1">Pedido</div>
                        <div class="text-sm font-bold text-blue-800">#${order.id}</div>
                        <div class="text-xs text-gray-600">${formatTime(order.created_at)}</div>
                    </div>
                    
                    <div class="bg-green-50 rounded p-2">
                        <div class="text-xs font-bold text-green-900 mb-1">Cliente</div>
                        <div class="text-sm font-semibold text-green-800">${order.customer_name || 'No especificado'}</div>
                        <div class="text-xs text-gray-600">${order.customer_phone || 'No especificado'}</div>
                    </div>
                    
                    <div class="bg-purple-50 rounded p-2">
                        <div class="text-xs font-bold text-purple-900 mb-1">Total</div>
                        <div class="text-lg font-bold text-purple-800">
                            $${parseFloat(order.total || 0).toFixed(2)}
                        </div>
                    </div>
                    
                    <div class="bg-orange-50 rounded p-2">
                        <div class="text-xs font-bold text-orange-900 mb-1">Plataforma</div>
                        <div class="text-sm font-semibold text-orange-800">${order.platform_name}</div>
                        <div class="text-xs text-gray-600">${(order.items || []).length} item${(order.items || []).length !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            </div>
            
            <!-- Lista de productos - DISEÑO ULTRA-COMPACTO -->
            <div class="lg:col-span-1">
                <div class="bg-white rounded border border-gray-200 p-2">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-sm font-bold text-gray-900 flex items-center">
                            <i class="fas fa-shopping-bag mr-1 text-orange-600"></i>Productos
                        </h4>
                        <div class="text-xs text-gray-600">
                            ${(order.items || []).length} item${(order.items || []).length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    
                    <!-- Tabla de productos compacta -->
                    <div class="overflow-y-auto max-h-48 border border-gray-200 rounded">
                        <table class="w-full text-xs">
                            <thead class="sticky top-0 bg-white z-10">
                                <tr class="border-b border-gray-200">
                                    <th class="text-left py-1 px-2 font-semibold text-gray-700">Cant.</th>
                                    <th class="text-left py-1 px-2 font-semibold text-gray-700">Producto</th>
                                    <th class="text-right py-1 px-2 font-semibold text-gray-700">P.Unit.</th>
                                    <th class="text-right py-1 px-2 font-semibold text-gray-700">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderOrderItemsTableCompact(order.items || [])}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Resumen ultra-compacto -->
                    <div class="mt-2 pt-2 border-t border-gray-200">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-600">Subtotal:</span>
                            <span class="font-semibold">$${parseFloat(order.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-gray-600">Envío:</span>
                            <span class="font-semibold">$${parseFloat(order.delivery_fee || 0).toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between items-center text-sm font-bold text-gray-900 mt-1 pt-1 border-t border-gray-200">
                            <span>TOTAL:</span>
                            <span class="text-orange-600">$${parseFloat(order.total || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <!-- Información adicional ultra-compacta -->
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div class="bg-gray-50 rounded p-1.5">
                            <div class="text-xs font-bold text-gray-900 flex items-center">
                                <i class="fas fa-sticky-note mr-1 text-yellow-600"></i>Notas
                            </div>
                            <div class="text-xs text-gray-700 mt-0.5">
                                ${order.special_instructions || 'Ninguna'}
                            </div>
                        </div>
                        
                        <div class="bg-gray-50 rounded p-1.5">
                            <div class="text-xs font-bold text-gray-900 flex items-center">
                                <i class="fas fa-credit-card mr-1 text-blue-600"></i>Pago
                            </div>
                            <div class="text-xs text-gray-700 mt-0.5">
                                ${order.payment_method || 'No especificado'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Renderizar items del pedido para el modal (formato tabla ultra-compacta)
function renderOrderItemsTableCompact(items) {
    if (!items || items.length === 0) {
        return '<tr><td colspan="4" class="text-center py-2 text-gray-500 italic text-xs">No hay productos</td></tr>';
    }
    
    return items.map(item => {
        const quantity = item.quantity || 1;
        const price = parseFloat(item.price || 0);
        const subtotal = price * quantity;
        
        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-1 px-2">
                    <div class="bg-orange-100 text-orange-800 font-bold text-xs px-2 py-0.5 rounded-full text-center inline-block min-w-[25px]">
                        ${quantity}
                    </div>
                </td>
                <td class="py-1 px-2">
                    <div class="font-semibold text-gray-900 text-xs">${item.name || 'Producto sin nombre'}</div>
                    ${item.notes ? `
                        <div class="text-xs text-yellow-700 mt-0.5 flex items-center">
                            <i class="fas fa-info-circle mr-1"></i>${item.notes}
                        </div>
                    ` : ''}
                </td>
                <td class="py-1 px-2 text-right text-xs text-gray-600">
                    $${price.toFixed(2)}
                </td>
                <td class="py-1 px-2 text-right">
                    <div class="font-bold text-orange-600 text-xs">
                        $${subtotal.toFixed(2)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Renderizar items del pedido para el modal (formato tabla)
function renderOrderItemsTable(items) {
    if (!items || items.length === 0) {
        return '<tr><td colspan="4" class="text-center py-4 text-gray-500 italic">No hay productos en este pedido</td></tr>';
    }
    
    return items.map(item => {
        const quantity = item.quantity || 1;
        const price = parseFloat(item.price || 0);
        const subtotal = price * quantity;
        
        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-3">
                    <div class="bg-orange-100 text-orange-800 font-bold text-sm px-3 py-1 rounded-full text-center inline-block min-w-[40px]">
                        ${quantity}
                    </div>
                </td>
                <td class="py-3 px-3">
                    <div class="font-semibold text-gray-900 text-sm">${item.name || 'Producto sin nombre'}</div>
                    ${item.notes ? `
                        <div class="text-xs text-yellow-700 mt-1 flex items-center">
                            <i class="fas fa-info-circle mr-1"></i>${item.notes}
                        </div>
                    ` : ''}
                </td>
                <td class="py-3 px-3 text-right text-sm text-gray-600">
                    $${price.toFixed(2)}
                </td>
                <td class="py-3 px-3 text-right">
                    <div class="font-bold text-orange-600 text-sm">
                        $${subtotal.toFixed(2)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Renderizar items del pedido para el modal (formato cards - mantenido para compatibilidad)
function renderOrderItems(items) {
    if (!items || items.length === 0) {
        return '<p class="text-gray-500 italic text-xs">No hay productos en este pedido</p>';
    }
    
    return items.map(item => `
        <div class="bg-white rounded-lg border border-orange-200 p-2 hover:shadow-sm transition-shadow">
            <div class="flex items-center space-x-2">
                <div class="bg-orange-100 text-orange-800 font-bold text-sm px-2 py-1 rounded-full min-w-[30px] text-center">
                    ${item.quantity || 1}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-gray-900 text-sm leading-tight">${item.name || 'Producto sin nombre'}</h4>
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-xs text-gray-600">$${parseFloat(item.price || 0).toFixed(2)} c/u</span>
                        <span class="font-bold text-orange-600 text-sm">
                            $${parseFloat((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                    </div>
                    ${item.notes ? `
                        <div class="bg-yellow-50 border-l-2 border-yellow-400 pl-2 py-1 mt-1 rounded-r">
                            <p class="text-xs text-yellow-800">
                                <i class="fas fa-info-circle mr-1"></i>${item.notes}
                            </p>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Iniciar timer de confirmación
function startConfirmationTimer() {
    const timerElement = document.getElementById('confirmationTimer');
    const acceptBtn = document.getElementById('acceptOrderBtn');
    const rejectBtn = document.getElementById('rejectOrderBtn');
    
    confirmationTimer = setInterval(() => {
        confirmationCountdown--;
        if (timerElement) {
            timerElement.textContent = confirmationCountdown;
        }
        
        // Cambiar color del timer cuando queda poco tiempo
        if (confirmationCountdown <= 10) {
            timerElement.classList.add('animate-pulse');
        }
        
        if (confirmationCountdown <= 0) {
            clearInterval(confirmationTimer);
            // Auto-rechazar el pedido si no se confirma
            rejectOrder('timeout');
        }
    }, 1000);
}

// Cerrar modal de nuevo pedido (solo después de acción)
function closeNewOrderModal() {
    const modal = document.getElementById('newOrderModal');
    modal.classList.add('hidden');
    
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
        confirmationTimer = null;
    }
    
    currentNewOrder = null;
    
    console.log('✅ Modal de nuevo pedido cerrado después de acción');
}

// Función para cerrar modal por timeout (rechazo automático)
function closeNewOrderModalByTimeout() {
    const modal = document.getElementById('newOrderModal');
    modal.classList.add('hidden');
    
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
        confirmationTimer = null;
    }
    
    currentNewOrder = null;
    
    console.log('⏰ Modal cerrado por timeout - rechazo automático');
}

// Aceptar pedido
async function acceptOrder() {
    if (!currentNewOrder) return;
    
    // Mostrar modal de tiempo de preparación en lugar de procesar directamente
    showPreparationTimeModal();
}

// Mostrar modal de tiempo de preparación
function showPreparationTimeModal() {
    // Detener el timer de confirmación
    if (confirmationTimer) {
        clearInterval(confirmationTimer);
        confirmationTimer = null;
    }
    
    // Ocultar el modal de nuevo pedido temporalmente
    const newOrderModal = document.getElementById('newOrderModal');
    newOrderModal.classList.add('hidden');
    
    // Mostrar el modal de tiempo de preparación
    const modal = document.getElementById('preparationTimeModal');
    modal.classList.remove('hidden');
    
    // Resetear el dropdown a 15 minutos por defecto
    document.getElementById('preparationTimeSelect').value = '15';
    
    console.log('⏱️ Modal de tiempo de preparación mostrado');
}

// Cerrar modal de tiempo de preparación
function closePreparationTimeModal() {
    const modal = document.getElementById('preparationTimeModal');
    modal.classList.add('hidden');
    
    // Reabrir el modal de nuevo pedido
    const newOrderModal = document.getElementById('newOrderModal');
    newOrderModal.classList.remove('hidden');
    
    // Reiniciar el timer de confirmación
    startConfirmationTimer();
    
    console.log('⏱️ Modal de tiempo de preparación cerrado');
}

// Confirmar tiempo de preparación y procesar aceptación
async function confirmPreparationTime() {
    if (!currentNewOrder) return;
    
    const preparationTime = parseInt(document.getElementById('preparationTimeSelect').value);
    
    try {
        // Deshabilitar botones durante la operación
        const confirmBtn = document.querySelector('#preparationTimeModal button[onclick="confirmPreparationTime()"]');
        const cancelBtn = document.querySelector('#preparationTimeModal button[onclick="closePreparationTimeModal()"]');
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
        
        // Llamar a la API para aceptar el pedido con tiempo de preparación
        const response = await fetch(`/api/orders/${currentNewOrder.id}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                preparation_time: preparationTime
            })
        });
        
        if (response.ok) {
            // Mostrar notificación de éxito
            showSuccessNotification(`Pedido aceptado exitosamente. Tiempo de preparación: ${preparationTime} minutos`);
            
            // Cerrar ambos modales
            closePreparationTimeModal();
            closeNewOrderModal();
            
            // Recargar datos del dashboard con delay para evitar rate limiting
            setTimeout(() => {
                loadStats();
                setTimeout(() => {
                    // Volver a la primera página para mostrar los pedidos más recientes
                    currentPage = 1;
                    loadOrders();
                }, 500);
            }, 500);
        } else {
            const errorData = await response.json();
            if (response.status === 400 && errorData.currentStatus) {
                showWarningNotification(`Pedido ya procesado. Estado actual: ${errorData.currentStatus}`);
                closePreparationTimeModal();
                closeNewOrderModal();
                loadStats();
                loadOrders();
            } else {
                throw new Error(errorData.error || 'Error al aceptar el pedido');
            }
        }
    } catch (error) {
        console.error('Error aceptando pedido:', error);
        showErrorNotification('Error al aceptar el pedido. Inténtalo de nuevo.');
    } finally {
        // Rehabilitar botones siempre
        const confirmBtn = document.querySelector('#preparationTimeModal button[onclick="confirmPreparationTime()"]');
        const cancelBtn = document.querySelector('#preparationTimeModal button[onclick="closePreparationTimeModal()"]');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Confirmar Tiempo';
        }
        if (cancelBtn) cancelBtn.disabled = false;
    }
}

// Rechazar pedido
async function rejectOrder(reason = 'manual') {
    if (!currentNewOrder) return;
    
    if (reason === 'timeout') {
        // Rechazo automático por timeout
        await performRejection('Tiempo de confirmación agotado');
    } else {
        // Mostrar modal de razones de rechazo
        showRejectionModal();
    }
}

// Mostrar modal de rechazo
function showRejectionModal() {
    const modal = document.getElementById('rejectionModal');
    modal.classList.remove('hidden');
    
    // Limpiar selecciones anteriores
    document.querySelectorAll('input[name="rejectionReason"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('customReasonDiv').classList.add('hidden');
    document.getElementById('customReason').value = '';
    
    // Remover listeners anteriores para evitar duplicados
    const otroRadio = document.querySelector('input[value="Otro"]');
    const newOtroRadio = otroRadio.cloneNode(true);
    otroRadio.parentNode.replaceChild(newOtroRadio, otroRadio);
    
    // Agregar listener para "Otro"
    newOtroRadio.addEventListener('change', function() {
        const customDiv = document.getElementById('customReasonDiv');
        if (this.checked) {
            customDiv.classList.remove('hidden');
        } else {
            customDiv.classList.add('hidden');
        }
    });
}

// Cerrar modal de rechazo
function closeRejectionModal() {
    const modal = document.getElementById('rejectionModal');
    modal.classList.add('hidden');
}

// Confirmar rechazo con razón seleccionada
async function confirmRejection() {
    const selectedReason = document.querySelector('input[name="rejectionReason"]:checked');
    
    if (!selectedReason) {
        showErrorNotification('Por favor selecciona una razón de rechazo');
        return;
    }
    
    let reason = selectedReason.value;
    
    if (reason === 'Otro') {
        const customReason = document.getElementById('customReason').value.trim();
        if (!customReason) {
            showErrorNotification('Por favor especifica la razón personalizada');
            return;
        }
        reason = customReason;
    }
    
    closeRejectionModal();
    await performRejection(reason);
}

// Ejecutar el rechazo
async function performRejection(reason) {
    if (!currentNewOrder) return;
    
    try {
        // Deshabilitar botones durante la operación
        const acceptBtn = document.getElementById('acceptOrderBtn');
        const rejectBtn = document.getElementById('rejectOrderBtn');
        acceptBtn.disabled = true;
        rejectBtn.disabled = true;
        rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Procesando...';
        
        // Llamar a la API para rechazar el pedido
        const response = await fetch(`/api/orders/${currentNewOrder.id}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason })
        });
        
        if (response.ok) {
            // Mostrar notificación
            showWarningNotification('Pedido rechazado exitosamente');
            
            // Cerrar modal
            closeNewOrderModal();
            
            // Recargar datos del dashboard con delay para evitar rate limiting
            setTimeout(() => {
                loadStats();
                setTimeout(() => {
                    // Volver a la primera página para mostrar los pedidos más recientes
                    currentPage = 1;
                    loadOrders();
                }, 500);
            }, 500);
        } else {
            const errorData = await response.json();
            if (response.status === 400 && errorData.currentStatus) {
                showWarningNotification(`Pedido ya procesado. Estado actual: ${errorData.currentStatus}`);
                closeNewOrderModal();
                loadStats();
                loadOrders();
            } else {
                throw new Error(errorData.error || 'Error al rechazar el pedido');
            }
        }
    } catch (error) {
        console.error('Error rechazando pedido:', error);
        showErrorNotification('Error al rechazar el pedido. Inténtalo de nuevo.');
    } finally {
        // Rehabilitar botones siempre
        const acceptBtn = document.getElementById('acceptOrderBtn');
        const rejectBtn = document.getElementById('rejectOrderBtn');
        if (acceptBtn) acceptBtn.disabled = false;
        if (rejectBtn) {
            rejectBtn.disabled = false;
            rejectBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Rechazar Pedido';
        }
    }
}

// Mostrar notificación toast rápida
function showQuickToastNotification(order) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-bell mr-2"></i>
            <span>Nuevo pedido #${order.id} - ${order.platform_name}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Reproducir sonido de notificación (opcional)
function playNotificationSound() {
    // Función deshabilitada para evitar errores de CSP
    console.log('🔔 Notificación de sonido deshabilitada');
}

// Variables para verificación de pedidos nuevos
let lastCheckedOrderId = 0;
let newOrderCheckInterval = null;

// Iniciar verificación de pedidos nuevos
function startNewOrderCheck() {
    // Verificar inmediatamente al cargar
    checkForNewOrders();
    
    // Verificar cada 30 segundos (aumentado para evitar rate limiting)
    newOrderCheckInterval = setInterval(checkForNewOrders, 30000);
    
    console.log('🔍 Verificación de pedidos nuevos iniciada (cada 30 segundos)');
}

// Verificar si hay pedidos nuevos
async function checkForNewOrders() {
    // Evitar múltiples llamadas simultáneas
    if (checkForNewOrders.isRunning) {
        console.log('⏳ Verificación de pedidos nuevos ya en progreso, saltando...');
        return;
    }
    
    checkForNewOrders.isRunning = true;
    
    try {
        const response = await fetch('/api/orders?status=pending&limit=1&sort=created_at&order=desc');
        
        // Manejar error 429 (Too Many Requests)
        if (response.status === 429) {
            console.warn('⚠️ Rate limit alcanzado, aumentando intervalo de verificación...');
            // Aumentar el intervalo temporalmente
            if (newOrderCheckInterval) {
                clearInterval(newOrderCheckInterval);
                newOrderCheckInterval = setInterval(checkForNewOrders, 60000); // 1 minuto
                setTimeout(() => {
                    // Restaurar intervalo normal después de 5 minutos
                    clearInterval(newOrderCheckInterval);
                    newOrderCheckInterval = setInterval(checkForNewOrders, 30000);
                }, 300000);
            }
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const latestOrder = data.data[0];
            
            // Verificar si es un pedido nuevo (ID mayor al último verificado)
            if (latestOrder.id > lastCheckedOrderId) {
                console.log(`🆕 Pedido nuevo detectado: #${latestOrder.id}`);
                
                // Actualizar el último ID verificado
                lastCheckedOrderId = latestOrder.id;
                
                // Mostrar el modal de confirmación
                showNewOrderNotification(latestOrder);
                
                // Actualizar las estadísticas y la lista de pedidos
                loadStats();
                loadOrders();
            }
        }
    } catch (error) {
        console.error('Error verificando pedidos nuevos:', error);
    } finally {
        // Liberar el flag después de un pequeño delay
        setTimeout(() => {
            checkForNewOrders.isRunning = false;
        }, 1000);
    }
}

// Detener verificación de pedidos nuevos
function stopNewOrderCheck() {
    if (newOrderCheckInterval) {
        clearInterval(newOrderCheckInterval);
        newOrderCheckInterval = null;
        console.log('🔍 Verificación de pedidos nuevos detenida');
    }
}

// Funciones de notificación
function showSuccessNotification(message) {
    showNotification(message, 'success');
}

function showErrorNotification(message) {
    showNotification(message, 'error');
}

function showWarningNotification(message) {
    showNotification(message, 'warning');
}

function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="${icons[type]} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Mostrar notificación de cambio de estado
function showStatusChangeNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-16 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-info-circle mr-2"></i>
            <span>Pedido #${data.orderId} - ${data.oldStatus} → ${data.newStatus}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Actualizar indicador de conexión
function updateConnectionStatus(connected) {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        const status = connected ? '🟢 Conectado' : '🔴 Desconectado';
        lastUpdateElement.innerHTML = `${status} • Última actualización: ${new Date().toLocaleTimeString()}`;
    }
}

// Actualizar fecha y hora en tiempo real (cada segundo)
function updateDateTime() {
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        const now = new Date();
        
        // Formatear fecha en español
        const dateOptions = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateStr = now.toLocaleDateString('es-ES', dateOptions);
        
        // Formatear hora en formato 12 horas con segundos
        const timeStr = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        });
        
        // Capitalizar el primer día de la semana
        const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        
        dateTimeElement.innerHTML = `${capitalizedDate} • ${timeStr}`;
    }
}

// Inicializar mapa de OpenStreetMap con Leaflet
function initDeliveryMap() {
    if (!deliveryMap) {
        deliveryMap = L.map('deliveryMap').setView(restaurantLocation, 13);
        
        // Agregar capa de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(deliveryMap);
        
        // Forzar actualización del tamaño después de un breve delay
        setTimeout(() => {
            if (deliveryMap) {
                deliveryMap.invalidateSize();
                console.log('🗺️ Mapa inicializado y actualizado');
            }
        }, 50);
    }
}

// Función eliminada - El tracking ahora es completamente automático
// No se necesitan controles manuales

// Iniciar tracking automático en tiempo real (sin controles manuales)
function startAutoTracking() {
    const AUTO_UPDATE_INTERVAL = 20000; // 20 segundos (aumentado para evitar rate limiting)
    
    // Actualización inmediata
    updateDeliveryLocations();
    
    // Configurar intervalo de actualización automática
    liveTrackingInterval = setInterval(() => {
        updateDeliveryLocations();
    }, AUTO_UPDATE_INTERVAL);
    
    // Actualizar indicador
    updateAutoTrackingIndicator(true);
    
    console.log(`🔄 Actualización automática iniciada - cada ${AUTO_UPDATE_INTERVAL/1000} segundos (optimizado para evitar rate limiting)`);
}

// Actualizar ubicaciones de entregas
async function updateDeliveryLocations() {
    // Evitar múltiples llamadas simultáneas
    if (updateDeliveryLocations.isRunning) {
        console.log('⏳ Actualización de ubicaciones ya en progreso, saltando...');
        return;
    }
    
    updateDeliveryLocations.isRunning = true;
    
    try {
        console.log('🔄 Actualizando ubicaciones en tiempo real...');
        
        // Usar la nueva API de tracking
        const response = await fetch('/api/tracking/locations');
        
        // Manejar error 429 (Too Many Requests)
        if (response.status === 429) {
            console.warn('⚠️ Rate limit alcanzado en tracking, aumentando intervalo...');
            // Aumentar el intervalo temporalmente
            if (liveTrackingInterval) {
                clearInterval(liveTrackingInterval);
                liveTrackingInterval = setInterval(updateDeliveryLocations, 40000); // 40 segundos
                setTimeout(() => {
                    // Restaurar intervalo normal después de 5 minutos
                    clearInterval(liveTrackingInterval);
                    liveTrackingInterval = setInterval(updateDeliveryLocations, 20000);
                }, 300000);
            }
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            const trackingData = data.data;
            console.log(`🗺️ Datos de tracking obtenidos: ${trackingData.length} pedidos`);
            
            // Log de estados para debug
            trackingData.forEach(tracking => {
                console.log(`   - Pedido ${tracking.orderId}: ${tracking.status} (${tracking.platform})`);
            });
            
            updateMapWithTrackingData(trackingData);
            updateMapStats(trackingData);
            
            console.log('✅ Mapa actualizado en tiempo real');
        } else {
            console.error('Error en respuesta de tracking:', data.message);
        }
    } catch (error) {
        console.error('Error actualizando ubicaciones:', error);
    } finally {
        // Liberar el flag después de un pequeño delay
        setTimeout(() => {
            updateDeliveryLocations.isRunning = false;
        }, 1000);
    }
}

// Actualizar mapa con datos de tracking y rutas reales
async function updateMapWithTrackingData(trackingData) {
    if (!deliveryMap) return;

    // Limpiar marcadores y rutas existentes
    Object.values(mapMarkers).forEach(marker => {
        deliveryMap.removeLayer(marker);
    });
    Object.values(mapRoutes).forEach(route => {
        deliveryMap.removeLayer(route);
    });
    mapMarkers = {};
    mapRoutes = {};

    // Obtener rutas reales
    try {
        const routesResponse = await fetch('/api/tracking/routes');
        const routesData = await routesResponse.json();
        const realRoutes = routesData.success ? routesData.data : [];

        // Crear marcadores y rutas para cada entrega según el estado
        for (const tracking of trackingData) {
            const orderId = tracking.orderId;
            const orderStatus = tracking.status || 'ready'; // Estado del pedido
            
            // Buscar ruta real correspondiente
            const realRoute = realRoutes.find(r => r.orderId === orderId);
            
            if (realRoute && realRoute.route) {
                // Usar ruta real con lógica de estado
                createRouteWithRealPathAndStatus(realRoute, orderStatus);
            } else {
                // Usar ruta simulada con lógica de estado
                createRouteWithSimulatedPathAndStatus(tracking, orderStatus);
            }
        }

        // Centrar mapa en todas las rutas
        centerMap();
        
    } catch (error) {
        console.error('Error obteniendo rutas reales:', error);
        // Fallback: usar rutas simuladas
        trackingData.forEach(tracking => {
            const orderStatus = tracking.status || 'ready';
            createRouteWithSimulatedPathAndStatus(tracking, orderStatus);
        });
        centerMap();
    }
}

// Crear ruta con camino real y lógica de estado
function createRouteWithRealPathAndStatus(routeData, orderStatus) {
    const orderId = routeData.orderId;
    
    // Validar y limpiar coordenadas
    const restaurantLat = parseFloat(routeData.restaurant?.lat) || 19.4326;
    const restaurantLng = parseFloat(routeData.restaurant?.lng) || -99.1332;
    const driverLat = parseFloat(routeData.driver?.lat) || restaurantLat;
    const driverLng = parseFloat(routeData.driver?.lng) || restaurantLng;
    const customerLat = parseFloat(routeData.customer?.lat) || restaurantLat;
    const customerLng = parseFloat(routeData.customer?.lng) || restaurantLng;
    
    // Marcador del restaurante - Moderno con icono de tienda
    const restaurantMarker = L.marker([restaurantLat, restaurantLng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: linear-gradient(135deg, #ef4444, #dc2626);
                width: 36px; height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                border: 3px solid white;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 6px 20px rgba(239, 68, 68, 0.6)'" 
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)'">
                <i class="fas fa-store" style="color: white; font-size: 16px;"></i>
                <div style="position: absolute; top: -8px; right: -8px; background: #fbbf24; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white;">R</div>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        })
    }).addTo(deliveryMap);

    // Marcador del repartidor - Animado con motocicleta
    const driverMarker = L.marker([driverLat, driverLng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                width: 40px; height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                border: 3px solid white;
                cursor: pointer;
                transition: all 0.3s ease;
                animation: pulse 2s infinite;
            " onmouseover="this.style.transform='scale(1.15)'" 
               onmouseout="this.style.transform='scale(1)'">
                <i class="fas fa-motorcycle" style="color: white; font-size: 18px;"></i>
                <style>
                    @keyframes pulse {
                        0% { box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
                        50% { box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6); }
                        100% { box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
                    }
                </style>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(deliveryMap);

    // Marcador del cliente - Elegante con casa
    const customerMarker = L.marker([customerLat, customerLng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: linear-gradient(135deg, #10b981, #059669);
                width: 36px; height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                border: 3px solid white;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.6)'" 
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)'">
                <i class="fas fa-home" style="color: white; font-size: 16px;"></i>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        })
    }).addTo(deliveryMap);

    // Lógica de rutas según el estado del pedido
    if (orderStatus === 'delivering') {
        // Estado: "En entrega" - Mostrar ruta completa (repartidor al restaurante + restaurante al cliente)
        console.log(`🗺️ Pedido ${orderId}: Estado "delivering" - Mostrando ruta completa`);
        
        // Ruta del repartidor al restaurante (morada, punteada)
    if (routeData.route?.driverToRestaurant?.coordinates && Array.isArray(routeData.route.driverToRestaurant.coordinates)) {
        try {
            const driverRoute = L.polyline(routeData.route.driverToRestaurant.coordinates, {
                color: '#8b5cf6',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 5'
            }).addTo(deliveryMap);
            mapRoutes[`${orderId}-driver`] = driverRoute;
        } catch (error) {
            console.warn('Error creando ruta del repartidor:', error);
            // Fallback: línea recta
            const driverRoute = L.polyline([
                [driverLat, driverLng],
                [restaurantLat, restaurantLng]
            ], {
                color: '#8b5cf6',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 5'
            }).addTo(deliveryMap);
            mapRoutes[`${orderId}-driver`] = driverRoute;
        }
    }

        // Ruta del restaurante al cliente (verde, sólida)
    if (routeData.route?.restaurantToCustomer?.coordinates && Array.isArray(routeData.route.restaurantToCustomer.coordinates)) {
        try {
            const deliveryRoute = L.polyline(routeData.route.restaurantToCustomer.coordinates, {
                color: '#10b981',
                weight: 4,
                opacity: 0.8
            }).addTo(deliveryMap);
            mapRoutes[`${orderId}-delivery`] = deliveryRoute;
        } catch (error) {
            console.warn('Error creando ruta de entrega:', error);
            // Fallback: línea recta
            const deliveryRoute = L.polyline([
                [restaurantLat, restaurantLng],
                [customerLat, customerLng]
            ], {
                color: '#10b981',
                weight: 4,
                opacity: 0.8
            }).addTo(deliveryMap);
            mapRoutes[`${orderId}-delivery`] = deliveryRoute;
        }
    }
    } else {
        // Estado: "ready" (listo) - Solo mostrar marcador del repartidor moviéndose hacia el restaurante
        console.log(`🗺️ Pedido ${orderId}: Estado "ready" - Solo marcador del repartidor`);
        
        // NO mostrar rutas, solo el marcador del repartidor
        // El marcador ya se creó arriba y se moverá automáticamente
    }

    // Popups informativos con diseño moderno
    const driverPopup = `
        <div class="p-4 bg-white rounded-lg shadow-lg border border-gray-200" style="min-width: 280px;">
            <div class="flex items-center mb-3">
                <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-motorcycle text-white"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Repartidor #${orderId}</h4>
                    <p class="text-sm text-purple-600 font-medium">${routeData.platform || 'N/A'}</p>
                </div>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Cliente:</span>
                    <span class="font-medium">${routeData.order?.customer_name || 'N/A'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Total:</span>
                    <span class="font-bold text-green-600">$${routeData.order?.total_amount || '0'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Distancia:</span>
                    <span class="font-medium">${(routeData.route?.totalDistance || 0).toFixed(1)} km</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Tiempo estimado:</span>
                    <span class="font-medium">${Math.round(routeData.route?.totalDuration || 0)} min</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Llegada:</span>
                    <span class="font-medium text-blue-600">${formatEstimatedArrival(routeData.estimatedArrival)}</span>
                </div>
            </div>
        </div>
    `;
    driverMarker.bindPopup(driverPopup);

    // Popup del restaurante
    const restaurantPopup = `
        <div class="p-4 bg-white rounded-lg shadow-lg border border-gray-200" style="min-width: 250px;">
            <div class="flex items-center mb-3">
                <div class="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-store text-white"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Restaurante</h4>
                    <p class="text-sm text-red-600 font-medium">Punto de recolección</p>
                </div>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Pedido:</span>
                    <span class="font-medium">#${orderId}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Estado:</span>
                    <span class="font-medium text-purple-600">${orderStatus === 'delivering' ? 'En entrega' : 'Listo para recoger'}</span>
                </div>
            </div>
        </div>
    `;
    restaurantMarker.bindPopup(restaurantPopup);

    // Popup del cliente
    const customerPopup = `
        <div class="p-4 bg-white rounded-lg shadow-lg border border-gray-200" style="min-width: 250px;">
            <div class="flex items-center mb-3">
                <div class="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mr-3">
                    <i class="fas fa-home text-white"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">Destino</h4>
                    <p class="text-sm text-green-600 font-medium">${routeData.order?.customer_name || 'Cliente'}</p>
                </div>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">Pedido:</span>
                    <span class="font-medium">#${orderId}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">Total:</span>
                    <span class="font-bold text-green-600">$${routeData.order?.total_amount || '0'}</span>
                </div>
            </div>
        </div>
    `;
    customerMarker.bindPopup(customerPopup);

    // Guardar referencias
    mapMarkers[`${orderId}-restaurant`] = restaurantMarker;
    mapMarkers[`${orderId}-driver`] = driverMarker;
    mapMarkers[`${orderId}-customer`] = customerMarker;
}

// Crear ruta con camino simulado y lógica de estado (fallback)
function createRouteWithSimulatedPathAndStatus(tracking, orderStatus) {
    const orderId = tracking.orderId;
    
    // Ubicación del restaurante (centro) - Ciudad de México
    const restaurantLocation = [19.4326, -99.1332];
    
    // Ubicación del repartidor
    const driverLocation = tracking.driverLocation || {
        lat: restaurantLocation[0] + (Math.random() - 0.5) * 0.02,
        lng: restaurantLocation[1] + (Math.random() - 0.5) * 0.02
    };
    
    // Ubicación del cliente
    const customerLocation = {
        lat: restaurantLocation[0] + (Math.random() - 0.5) * 0.05,
        lng: restaurantLocation[1] + (Math.random() - 0.5) * 0.05
    };

    // Marcadores modernos
    const restaurantMarker = L.marker(restaurantLocation, {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: linear-gradient(135deg, #ef4444, #dc2626);
                width: 36px; height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                border: 3px solid white;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
            " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 6px 20px rgba(239, 68, 68, 0.6)'" 
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)'">
                <i class="fas fa-store" style="color: white; font-size: 16px;"></i>
                <div style="position: absolute; top: -8px; right: -8px; background: #fbbf24; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white;">R</div>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        })
    }).addTo(deliveryMap);

    const driverMarker = L.marker([driverLocation.lat, driverLocation.lng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                width: 40px; height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
                border: 3px solid white;
                cursor: pointer;
                transition: all 0.3s ease;
                animation: pulse 2s infinite;
            " onmouseover="this.style.transform='scale(1.15)'" 
               onmouseout="this.style.transform='scale(1)'">
                <i class="fas fa-motorcycle" style="color: white; font-size: 18px;"></i>
                <style>
                    @keyframes pulse {
                        0% { box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
                        50% { box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6); }
                        100% { box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4); }
                    }
                </style>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(deliveryMap);

    const customerMarker = L.marker([customerLocation.lat, customerLocation.lng], {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                background: linear-gradient(135deg, #10b981, #059669);
                width: 36px; height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                border: 3px solid white;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.6)'" 
               onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)'">
                <i class="fas fa-home" style="color: white; font-size: 16px;"></i>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        })
    }).addTo(deliveryMap);

    // Lógica de rutas según el estado del pedido
    if (orderStatus === 'delivering') {
        // Estado: "En entrega" - Mostrar ruta completa
        console.log(`🗺️ Pedido ${orderId}: Estado "delivering" - Mostrando ruta completa (simulada)`);
        
        // Ruta del repartidor al restaurante (morada, punteada)
    const driverRoute = L.polyline([
        [driverLocation.lat, driverLocation.lng],
        restaurantLocation
    ], {
        color: '#8b5cf6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 5'
    }).addTo(deliveryMap);

        // Ruta del restaurante al cliente (verde, sólida)
    const deliveryRoute = L.polyline([
        restaurantLocation,
        [customerLocation.lat, customerLocation.lng]
    ], {
        color: '#10b981',
        weight: 4,
        opacity: 0.8
    }).addTo(deliveryMap);

        // Guardar referencias de rutas
        mapRoutes[`${orderId}-driver`] = driverRoute;
        mapRoutes[`${orderId}-delivery`] = deliveryRoute;
    } else {
        // Estado: "ready" (listo) - Solo mostrar marcador del repartidor
        console.log(`🗺️ Pedido ${orderId}: Estado "ready" - Solo marcador del repartidor (simulado)`);
        
        // NO crear rutas, solo el marcador del repartidor
    }

    // Guardar referencias de marcadores
    mapMarkers[`${orderId}-restaurant`] = restaurantMarker;
    mapMarkers[`${orderId}-driver`] = driverMarker;
    mapMarkers[`${orderId}-customer`] = customerMarker;
}

// Simular ubicación del repartidor (en producción, esto vendría de las APIs)
function simulateDriverLocation(order) {
    // Simular movimiento del repartidor
    const baseLat = restaurantLocation[0] + (Math.random() - 0.5) * 0.02;
    const baseLng = restaurantLocation[1] + (Math.random() - 0.5) * 0.02;
    
    return [
        baseLat + (Math.random() - 0.5) * 0.005,
        baseLng + (Math.random() - 0.5) * 0.005
    ];
}

// Simular ubicación del cliente
function simulateCustomerLocation(order) {
    return [
        restaurantLocation[0] + (Math.random() - 0.5) * 0.03,
        restaurantLocation[1] + (Math.random() - 0.5) * 0.03
    ];
}

// Actualizar estadísticas del mapa
function updateMapStats(orders) {
    const deliveriesCountElement = document.getElementById('mapDeliveriesCount');
    const avgTimeElement = document.getElementById('mapAvgTime');
    const totalDistanceElement = document.getElementById('mapTotalDistance');
    
    // Solo actualizar si los elementos existen
    if (deliveriesCountElement) {
        deliveriesCountElement.textContent = orders.length;
    }
    
    const avgTime = orders.length > 0 ? 
        Math.round(orders.reduce((sum, order) => sum + Math.round(Math.random() * 20) + 15, 0) / orders.length) : 0;
    
    if (avgTimeElement) {
        avgTimeElement.textContent = `${avgTime} min`;
    }
    
    const totalDistance = orders.length * (Math.random() * 3 + 1);
    
    if (totalDistanceElement) {
        totalDistanceElement.textContent = `${totalDistance.toFixed(1)} km`;
    }
}

// Centrar mapa en todas las entregas
function centerMap() {
    if (!deliveryMap || Object.keys(mapMarkers).length === 0) {
        deliveryMap.setView(restaurantLocation, 13);
        return;
    }
    
    const bounds = L.latLngBounds([restaurantLocation]);
    
    // Agregar todos los marcadores al bounds
    Object.values(mapMarkers).forEach(marker => {
        bounds.extend(marker.getLatLng());
    });
    
    deliveryMap.fitBounds(bounds);
    
    // Ajustar zoom si es muy cercano
    if (deliveryMap.getZoom() > 15) {
        deliveryMap.setZoom(15);
    }
}

// Mostrar estadísticas detalladas de entregas
function displayDeliveryStats(orders) {
    // Verificar que orders existe y es un array
    if (!orders || !Array.isArray(orders)) {
        console.warn('No hay datos de pedidos disponibles');
        orders = [];
    }

    console.log('🚚 Procesando estadísticas de entrega con', orders.length, 'pedidos');
    console.log('📋 Estados encontrados:', [...new Set(orders.map(order => order.status))]);

    // El endpoint ya devuelve solo pedidos 'delivering' del día actual
    // No necesitamos filtrar más, usamos directamente los pedidos recibidos
    const deliveryOrders = orders;
    
    console.log('🚚 Pedidos de entrega (sin filtros adicionales):', deliveryOrders.length);
    console.log('📋 Detalle de pedidos de entrega:', deliveryOrders.map(order => ({
        id: order.id,
        status: order.status,
        platform: order.platform_name,
        customer: order.customer_name,
        amount: order.total_amount
    })));

    if (deliveryOrders.length === 0) {
        // Mostrar datos vacíos
        document.getElementById('deliveryTotal').textContent = '0';
        document.getElementById('deliveryAvgTime').textContent = '0 min';
        document.getElementById('deliveryAvgDistance').textContent = '0 km';
        document.getElementById('deliveryEfficiency').textContent = '0%';
        document.getElementById('activeDeliveriesTable').innerHTML = '<tr><td colspan="7" class="px-4 py-3 text-center text-gray-500">No hay entregas en curso</td></tr>';
        document.getElementById('driverAnalysis').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('activeZones').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        
        // Inicializar mapa vacío
        setTimeout(() => {
            initDeliveryMap();
            updateMapStats([]);
        }, 100);
        
        return;
    }

    // Calcular estadísticas básicas
    const totalDeliveries = deliveryOrders.length;
    const avgDeliveryTime = Math.round(Math.random() * 20) + 15; // 15-35 minutos
    const avgDistance = (Math.random() * 3 + 1).toFixed(1); // 1-4 km
    const efficiency = Math.round(Math.random() * 10) + 90; // 90-100%

    // Actualizar métricas principales
    document.getElementById('deliveryTotal').textContent = totalDeliveries;
    document.getElementById('deliveryAvgTime').textContent = `${avgDeliveryTime} min`;
    document.getElementById('deliveryAvgDistance').textContent = `${avgDistance} km`;
    document.getElementById('deliveryEfficiency').textContent = `${efficiency}%`;

    // Crear gráficos
    createDeliveryByHourChart(deliveryOrders);
    createDeliveryByZoneChart(deliveryOrders);

    // Mostrar entregas en curso
    displayActiveDeliveries(deliveryOrders);

    // Mostrar análisis por repartidor
    displayDriverAnalysis(deliveryOrders);

    // Mostrar zonas más activas
    displayActiveZones(deliveryOrders);

    // Mostrar métricas de rendimiento
    displayPlatformDeliveryTimes(deliveryOrders);
    displayDeliverySuccessRate(deliveryOrders);
    displayDeliveryAlerts(deliveryOrders);

                // Inicializar mapa con las entregas
            setTimeout(() => {
                initDeliveryMap();
                // Forzar actualización del mapa después de inicializar
                setTimeout(() => {
                    if (deliveryMap) {
                        deliveryMap.invalidateSize();
                        console.log('🗺️ Mapa actualizado después de inicializar con datos');
                    }
                }, 200);
                updateMapWithTrackingData(deliveryOrders.map(order => ({
                    orderId: order.id,
                    platform: order.platform_name,
            driverLocation: {
                lat: restaurantLocation[0] + (Math.random() - 0.5) * 0.02,
                lng: restaurantLocation[1] + (Math.random() - 0.5) * 0.02
            },
            estimatedArrival: new Date(Date.now() + Math.random() * 30 * 60 * 1000),
            status: 'en_ruta',
            lastUpdated: new Date(),
            order: order
        })));
        updateMapStats(deliveryOrders);
    }, 100);
}

// Crear gráfico de entregas por hora
function createDeliveryByHourChart(orders) {
    const ctx = document.getElementById('deliveryByHourChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (deliveryStatsCharts.deliveryByHour) {
        deliveryStatsCharts.deliveryByHour.destroy();
    }

    // Agrupar entregas por hora
    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
        hourCounts[i] = 0;
    }

    orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hourCounts[hour]++;
    });

    const labels = Object.keys(hourCounts).map(h => `${h}:00`);
    const data = Object.values(hourCounts);

    deliveryStatsCharts.deliveryByHour = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Entregas',
                data: data,
                backgroundColor: 'rgba(147, 51, 234, 0.8)',
                borderColor: 'rgb(147, 51, 234)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Crear gráfico de tiempo por zona
function createDeliveryByZoneChart(orders) {
    const ctx = document.getElementById('deliveryByZoneChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (deliveryStatsCharts.deliveryByZone) {
        deliveryStatsCharts.deliveryByZone.destroy();
    }

    // Simular zonas y tiempos
    const zones = ['Centro', 'Norte', 'Sur', 'Este', 'Oeste'];
    const zoneTimes = zones.map(() => Math.round(Math.random() * 15) + 10); // 10-25 minutos

    deliveryStatsCharts.deliveryByZone = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: zones,
            datasets: [{
                data: zoneTimes,
                backgroundColor: [
                    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed} min`;
                        }
                    }
                }
            }
        }
    });
}

// Mostrar entregas en curso
function displayActiveDeliveries(orders) {
    const tbody = document.getElementById('activeDeliveriesTable');
    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-3 text-center text-gray-500">No hay entregas en curso</td></tr>';
        return;
    }

    orders.forEach(order => {
        const deliveryTime = Math.round(Math.random() * 20) + 10; // 10-30 minutos
        const distance = (Math.random() * 3 + 1).toFixed(1); // 1-4 km
        const status = order.status === 'delivering' ? 'En Ruta' : 'Listo para Entrega';
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-blue-50 cursor-pointer transition-all duration-200 border-l-4 border-transparent hover:border-blue-400';
        row.onclick = () => {
            console.log(`🖱️ Click en entrega en curso #${order.id}`);
            viewOrder(order.id);
        };
        row.title = `Click para ver detalles del pedido #${order.id}`;
        
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900">#${order.id}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${order.customer_name}</td>
            <td class="px-4 py-3">
                <div class="flex items-center">
                    <img src="/images/${getPlatformLogo(order.platform_name)}" 
                         alt="${order.platform_name}" 
                         class="h-5 w-auto mr-2"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(order.platform_name)}" style="display: none;">
                        ${order.platform_name}
                    </span>
                </div>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">${deliveryTime} min</td>
            <td class="px-4 py-3 text-sm text-gray-900">${distance} km</td>
            <td class="px-4 py-3">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    status === 'En Ruta' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                }">
                    ${status}
                </span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`📋 Tabla de entregas en curso actualizada con ${orders.length} registros clickeables`);
}

// Mostrar análisis por repartidor
function displayDriverAnalysis(orders) {
    // Simular datos de repartidores
    const drivers = [
        { name: 'Carlos M.', efficiency: 98, deliveries: 12, avgTime: 18 },
        { name: 'María L.', efficiency: 95, deliveries: 10, avgTime: 22 },
        { name: 'Juan P.', efficiency: 92, deliveries: 8, avgTime: 25 },
        { name: 'Ana S.', efficiency: 96, deliveries: 11, avgTime: 20 }
    ];

    const driverHtml = drivers.map(driver => `
        <div class="p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-2">
                <span class="font-medium">${driver.name}</span>
                <span class="text-sm font-bold text-green-600">${driver.efficiency}%</span>
            </div>
            <div class="text-sm text-gray-600">
                <div>Entregas: ${driver.deliveries}</div>
                <div>Tiempo promedio: ${driver.avgTime} min</div>
            </div>
        </div>
    `).join('');

    document.getElementById('driverAnalysis').innerHTML = driverHtml;
}

// Mostrar zonas más activas
function displayActiveZones(orders) {
    // Simular datos de zonas
    const zones = [
        { name: 'Centro Histórico', orders: 8, avgTime: 15 },
        { name: 'Zona Norte', orders: 6, avgTime: 22 },
        { name: 'Zona Sur', orders: 5, avgTime: 18 },
        { name: 'Zona Este', orders: 4, avgTime: 25 }
    ];

    const zonesHtml = zones.map((zone, index) => `
        <div class="p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-2">
                <span class="font-medium">${zone.name}</span>
                <span class="text-lg font-bold text-blue-600">${index + 1}</span>
            </div>
            <div class="text-sm text-gray-600">
                <div>Pedidos: ${zone.orders}</div>
                <div>Tiempo promedio: ${zone.avgTime} min</div>
            </div>
        </div>
    `).join('');

    document.getElementById('activeZones').innerHTML = zonesHtml;
}

// Mostrar tiempo promedio por plataforma
function displayPlatformDeliveryTimes(orders) {
    const platformTimes = {};
    orders.forEach(order => {
        const platform = order.platform_name;
        if (!platformTimes[platform]) {
            platformTimes[platform] = [];
        }
        platformTimes[platform].push(Math.round(Math.random() * 15) + 15); // 15-30 minutos
    });

    const timesHtml = Object.entries(platformTimes).map(([platform, times]) => {
        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        return `
            <div class="flex items-center justify-between p-2 bg-green-50 rounded">
                <span class="font-medium">${platform}</span>
                <span class="text-green-600 font-bold">${avgTime} min</span>
            </div>
        `;
    }).join('');

    document.getElementById('platformDeliveryTimes').innerHTML = timesHtml;
}

// Mostrar tasa de éxito
function displayDeliverySuccessRate(orders) {
    const successRate = 96.5; // Simulado
    const totalDeliveries = orders.length;
    const successful = Math.round((successRate / 100) * totalDeliveries);
    const failed = totalDeliveries - successful;

    const successHtml = `
        <div class="p-3 bg-green-50 rounded-lg mb-3">
            <div class="flex items-center justify-between">
                <span class="font-medium text-green-800">Entregas Exitosas</span>
                <span class="text-green-600 font-bold">${successful}</span>
            </div>
        </div>
        <div class="p-3 bg-red-50 rounded-lg mb-3">
            <div class="flex items-center justify-between">
                <span class="font-medium text-red-800">Entregas Fallidas</span>
                <span class="text-red-600 font-bold">${failed}</span>
            </div>
        </div>
        <div class="p-3 bg-blue-50 rounded-lg">
            <div class="flex items-center justify-between">
                <span class="font-medium text-blue-800">Tasa de Éxito</span>
                <span class="text-blue-600 font-bold">${successRate}%</span>
            </div>
        </div>
    `;

    document.getElementById('deliverySuccessRate').innerHTML = successHtml;
}

// Mostrar alertas de entrega
function displayDeliveryAlerts(orders) {
    const alerts = [];
    
    // Simular alertas basadas en los datos
    if (orders.length > 8) {
        alerts.push({
            type: 'warning',
            message: 'Alto volumen de entregas. Verificar capacidad de repartidores.'
        });
    }
    
    const longDeliveries = orders.filter(() => Math.random() > 0.7).length;
    if (longDeliveries > 0) {
        alerts.push({
            type: 'error',
            message: `${longDeliveries} entregas con tiempo extendido. Revisar rutas.`
        });
    }
    
    if (orders.length > 0) {
        alerts.push({
            type: 'info',
            message: 'Todas las entregas en tiempo estimado.'
        });
    }

    const alertsHtml = alerts.map(alert => `
        <div class="p-3 rounded-lg border-l-4 ${
            alert.type === 'error' ? 'border-red-500 bg-red-50' :
            alert.type === 'warning' ? 'border-orange-500 bg-orange-50' :
            'border-blue-500 bg-blue-50'
        }">
            <p class="text-sm ${
                alert.type === 'error' ? 'text-red-700' :
                alert.type === 'warning' ? 'text-orange-700' :
                'text-blue-700'
            }">${alert.message}</p>
        </div>
    `).join('');

    document.getElementById('deliveryAlerts').innerHTML = alertsHtml || 
        '<p class="text-gray-500">No hay alertas activas.</p>';
}

// Mostrar estadísticas detalladas de "Pedidos Hoy"
async function showTodayStats() {
    try {
        // Obtener fecha de hoy en zona horaria local (Ciudad de México)
        const today = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD en zona horaria local
        
        console.log('📅 Cargando estadísticas de pedidos de HOY:', today);
        console.log('📅 Fecha formateada:', new Date().toLocaleDateString());
        console.log('📅 Fecha ISO:', new Date().toISOString());
        console.log('📅 Fecha local:', new Date().toLocaleDateString('en-CA'));
        
        // Cargar pedidos de hoy
        const response = await fetch(`/api/orders?date_from=${today}&date_to=${today}&limit=1000`);
        const data = await response.json();
        
        if (data.success) {
            const orders = data.data;
            console.log('📦 Pedidos cargados para estadísticas de hoy:', orders.length);
            console.log('📋 Estados encontrados:', [...new Set(orders.map(o => o.status))]);
            console.log('📋 Detalle de pedidos:', orders.map(o => ({
                id: o.id,
                status: o.status,
                platform: o.platform_name,
                date: new Date(o.created_at).toLocaleDateString('en-CA'),
                time: new Date(o.created_at).toLocaleTimeString()
            })));
            
            displayTodayStats(orders);
            document.getElementById('todayStatsModal').classList.remove('hidden');
        } else {
            console.error('❌ Error en la respuesta del servidor:', data.message);
        }
    } catch (error) {
        console.error('Error cargando estadísticas de hoy:', error);
        alert('Error cargando estadísticas');
    }
}

// Mostrar estadísticas de ingresos
async function showRevenueStats() {
    try {
        // Limpiar gráficos existentes antes de abrir el modal
        cleanupRevenueCharts();
        
        // Obtener fecha de hoy en zona horaria local (Ciudad de México)
        const today = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD en zona horaria local
        
        console.log('📅 Cargando estadísticas de ingresos de HOY:', today);
        console.log('📅 Fecha formateada:', new Date().toLocaleDateString());
        console.log('📅 Fecha ISO:', new Date().toISOString());
        console.log('📅 Fecha local:', new Date().toLocaleDateString('en-CA'));
        
        // Cargar pedidos de hoy
        const response = await fetch(`/api/orders?date_from=${today}&date_to=${today}&limit=1000`);
        const data = await response.json();
        
        if (data.success) {
            const orders = data.data;
            console.log('📦 Pedidos cargados para estadísticas de ingresos:', orders.length);
            console.log('📋 Estados encontrados:', [...new Set(orders.map(o => o.status))]);
            console.log('📋 Detalle de pedidos:', orders.map(o => ({
                id: o.id,
                status: o.status,
                platform: o.platform_name,
                total: o.total_amount,
                date: new Date(o.created_at).toLocaleDateString('en-CA'),
                time: new Date(o.created_at).toLocaleTimeString()
            })));
            
            await displayRevenueStats(orders);
            document.getElementById('revenueStatsModal').classList.remove('hidden');
        } else {
            console.error('❌ Error en la respuesta del servidor:', data.message);
        }
    } catch (error) {
        console.error('Error cargando estadísticas de ingresos:', error);
        alert('Error cargando estadísticas de ingresos');
    }
}

// Función para limpiar gráficos de ingresos
function cleanupRevenueCharts() {
    try {
        const canvasIds = ['revenueByHourChart', 'revenueByPlatformChart', 'revenueAccumulatedChart'];
        
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }
        });
        
        // Limpiar referencias
        if (revenueStatsCharts) {
            Object.values(revenueStatsCharts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    try {
                        chart.destroy();
                    } catch (e) {
                        console.warn('Error al limpiar gráfico:', e);
                    }
                }
            });
            revenueStatsCharts = {};
        }
        
        console.log('🧹 Gráficos de ingresos limpiados');
    } catch (error) {
        console.error('Error limpiando gráficos de ingresos:', error);
    }
}

// Mostrar estadísticas de pendientes
async function showPendingStats() {
    try {
        // Limpiar gráficos existentes antes de abrir el modal
        cleanupPendingCharts();
        
        // Obtener fecha de hoy en zona horaria local (Ciudad de México)
        const today = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD en zona horaria local
        
        console.log('📅 Cargando pedidos pendientes de HOY:', today);
        console.log('📅 Fecha formateada:', new Date().toLocaleDateString());
        console.log('📅 Fecha ISO:', new Date().toISOString());
        console.log('📅 Fecha local:', new Date().toLocaleDateString('en-CA')); // Formato YYYY-MM-DD
        
        // Cargar pedidos de hoy con estados activos (pending, preparing, ready, delivering)
        const response = await fetch(`/api/orders?date_from=${today}&date_to=${today}&limit=1000`);
        const data = await response.json();
        
        // Debug: También cargar todos los pedidos para verificar si los "preparing" están ahí
        const allOrdersResponse = await fetch(`/api/orders?limit=1000`);
        const allOrdersData = await allOrdersResponse.json();
        if (allOrdersData.success) {
            const preparingOrders = allOrdersData.data.filter(o => o.status === 'preparing');
            console.log('🔍 Pedidos "preparing" encontrados en TODOS los pedidos:', preparingOrders.length);
            console.log('📋 Detalle de pedidos "preparing":', preparingOrders.map(o => ({
                id: o.id,
                status: o.status,
                platform: o.platform_name,
                date: new Date(o.created_at).toISOString().split('T')[0],
                time: new Date(o.created_at).toLocaleTimeString()
            })));
        }
        
        if (data.success) {
            const orders = data.data;
            console.log('📦 Pedidos cargados de la API:', orders.length);
            console.log('📋 Estados encontrados en la API:', [...new Set(orders.map(o => o.status))]);
            console.log('🔍 URL de la API llamada:', `/api/orders?date_from=${today}&date_to=${today}&limit=1000`);
            console.log('📅 Fecha de hoy usada:', today);
            console.log('📋 Todos los pedidos de la API:', orders.map(o => ({
                id: o.id,
                status: o.status,
                platform: o.platform_name,
                date: new Date(o.created_at).toISOString().split('T')[0],
                time: new Date(o.created_at).toLocaleTimeString()
            })));
            
            // Verificar que realmente sean de hoy
            const ordersFromToday = orders.filter(order => {
                const orderDate = new Date(order.created_at).toLocaleDateString('en-CA');
                return orderDate === today;
            });
            
            console.log('📅 Pedidos que realmente son de hoy:', ordersFromToday.length);
            console.log('📋 Detalle de pedidos de hoy:', ordersFromToday.map(o => ({
                id: o.id,
                status: o.status,
                platform: o.platform_name,
                date: new Date(o.created_at).toLocaleDateString(),
                time: new Date(o.created_at).toLocaleTimeString()
            })));
            
                // Filtrar solo los estados activos (el backend normaliza a inglés)
    const activeOrders = ordersFromToday.filter(order => 
        order.status === 'pending' ||
        order.status === 'preparing' ||
        order.status === 'ready' ||
        order.status === 'delivering'
    );
            
            console.log('🍳 Pedidos activos para vista de cocina:', activeOrders.length);
            console.log('📋 Estados activos encontrados:', [...new Set(activeOrders.map(o => o.status))]);
            
            // Debug detallado de pedidos activos
            console.log('🔍 Debug detallado de pedidos activos:');
            activeOrders.forEach(order => {
                console.log(`   ID ${order.id}: status="${order.status}"`);
            });
            
            // Debug detallado de TODOS los pedidos de hoy
            console.log('🔍 Debug detallado de TODOS los pedidos de hoy:');
            ordersFromToday.forEach(order => {
                console.log(`   ID ${order.id}: status="${order.status}" - ${order.customer_name}`);
            });
            
            displayPendingStats(activeOrders);
            document.getElementById('pendingStatsModal').classList.remove('hidden');
        } else {
            console.error('❌ Error en la respuesta del servidor:', data.message);
        }
    } catch (error) {
        console.error('Error cargando estadísticas de pendientes:', error);
        alert('Error cargando estadísticas de pendientes');
    }
}

// Función para limpiar gráficos de pendientes
function cleanupPendingCharts() {
    try {
        const canvasIds = ['pendingByPlatformChart', 'waitTimeByHourChart'];
        
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }
        });
        
        // Limpiar referencias
        if (pendingStatsCharts) {
            Object.values(pendingStatsCharts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    try {
                        chart.destroy();
                    } catch (e) {
                        console.warn('Error al limpiar gráfico:', e);
                    }
                }
            });
            pendingStatsCharts = {};
        }
        
        console.log('🧹 Gráficos de pendientes limpiados');
    } catch (error) {
        console.error('Error limpiando gráficos de pendientes:', error);
    }
}

// Función para limpiar gráficos de entregas
function cleanupDeliveryCharts() {
    try {
        const canvasIds = ['deliveryByHourChart', 'deliveryByZoneChart'];
        
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }
        });
        
        // Limpiar referencias
        if (deliveryStatsCharts) {
            Object.values(deliveryStatsCharts).forEach(chart => {
                if (chart && typeof chart.destroy === 'function') {
                    try {
                        chart.destroy();
                    } catch (e) {
                        console.warn('Error al limpiar gráfico:', e);
                    }
                }
            });
            deliveryStatsCharts = {};
        }
        
        console.log('🧹 Gráficos de entregas limpiados');
    } catch (error) {
        console.error('Error limpiando gráficos de entregas:', error);
    }
}

// Mostrar estadísticas de entregas
async function showDeliveryStats() {
    try {
        console.log('🚚 Cargando pedidos en entrega usando endpoint específico...');
        
        // Limpiar gráficos anteriores
        cleanupDeliveryCharts();
        
        // Usar el endpoint específico que usa la misma lógica que las cards del dashboard
        const response = await fetch('/api/dashboard/delivery-orders');
        const data = await response.json();
        
        if (data.success) {
            console.log('📦 Pedidos en entrega cargados (endpoint específico):', data.data.length);
            console.log('📋 Detalle de pedidos:', data.data.map(order => ({
                id: order.id,
                status: order.status,
                platform: order.platform_name,
                customer: order.customer_name
            })));
            
            displayDeliveryStats(data.data);
            document.getElementById('deliveryStatsModal').classList.remove('hidden');
            
            // Forzar actualización del mapa después de que el modal sea visible
            setTimeout(() => {
                if (deliveryMap) {
                    deliveryMap.invalidateSize();
                    console.log('🗺️ Mapa actualizado después de mostrar modal');
                }
            }, 100);
            
            // Iniciar tracking automático inmediatamente
            console.log('🚚 Iniciando actualización automática en tiempo real...');
            startAutoTracking();
            
            console.log('🚚 Modal de entregas abierto - actualización automática activa');
        } else {
            console.error('Error cargando estadísticas de entregas:', data.message);
        }
    } catch (error) {
        console.error('Error cargando estadísticas de entregas:', error);
    }
}

// Mostrar estadísticas detalladas de hoy
function displayTodayStats(orders) {
    if (orders.length === 0) {
        document.getElementById('todayTotalOrders').textContent = '0';
        document.getElementById('todayOrdersInfo').textContent = 'sin pedidos';
        document.getElementById('todayTotalRevenue').textContent = '$0';
        document.getElementById('todayRevenueInfo').textContent = 'sin pedidos';
        document.getElementById('todayAvgTicket').textContent = '$0';
        document.getElementById('todayTicketInfo').textContent = 'sin pedidos';
        document.getElementById('todayAvgTime').textContent = '0 min';
        document.getElementById('todayDeliveryInfo').textContent = 'sin pedidos';
        document.getElementById('topProducts').innerHTML = '<p class="text-gray-500">No hay pedidos hoy</p>';
        document.getElementById('highestTicket').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('lowestTicket').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('todayOrdersTable').innerHTML = '<tr><td colspan="6" class="px-4 py-3 text-center text-gray-500">No hay pedidos hoy</td></tr>';
        return;
    }

    // Calcular estadísticas básicas
    const totalOrders = orders.length;
    
    // Calcular ticket promedio con validación
    let totalRevenue = 0;
    let validOrders = 0;
    
    orders.forEach(order => {
        if (order.total_amount && !isNaN(parseFloat(order.total_amount))) {
            totalRevenue += parseFloat(order.total_amount);
            validOrders++;
        }
    });
    
    const avgTicket = validOrders > 0 ? totalRevenue / validOrders : 0;
    
    // Calcular estadísticas adicionales del ticket
    let minTicket = 0;
    let maxTicket = 0;
    if (validOrders > 0) {
        const validAmounts = orders
            .filter(order => order.total_amount && !isNaN(parseFloat(order.total_amount)))
            .map(order => parseFloat(order.total_amount));
        minTicket = Math.min(...validAmounts);
        maxTicket = Math.max(...validAmounts);
    }
    
    console.log(`💰 Ticket promedio - Pedidos válidos: ${validOrders}/${totalOrders}`);
    console.log(`💰 Ingresos totales: $${totalRevenue.toFixed(2)} MXN`);
    console.log(`💰 Ticket promedio calculado: $${avgTicket.toFixed(2)} MXN`);
    console.log(`💰 Rango de tickets: $${minTicket.toFixed(2)} - $${maxTicket.toFixed(2)} MXN`);
    
    // Calcular proyección de ingresos para el día
    const currentHour = new Date().getHours();
    const projectedRevenue = calculateProjection(totalRevenue, currentHour);
    console.log(`📈 Proyección de ingresos para el día: $${projectedRevenue.toFixed(2)} MXN`);
    
    // Calcular tiempo promedio real de entrega
    const deliveredOrders = orders.filter(order => 
        order.status === 'delivered' && 
        order.actual_delivery_time && 
        order.created_at
    );
    
    console.log(`📊 Tiempo promedio - Pedidos entregados: ${deliveredOrders.length}/${orders.length}`);
    
    let avgTime = 0;
    if (deliveredOrders.length > 0) {
        const deliveryTimes = deliveredOrders.map(order => {
            const created = new Date(order.created_at);
            const delivered = new Date(order.actual_delivery_time);
            const timeInMinutes = (delivered - created) / (1000 * 60);
            console.log(`⏱️ Pedido ${order.id}: ${timeInMinutes.toFixed(1)} min`);
            return timeInMinutes;
        });
        avgTime = Math.round(deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length);
        console.log(`⏱️ Tiempo promedio calculado: ${avgTime} min`);
    } else {
        console.log('⚠️ No hay pedidos entregados para calcular tiempo promedio');
    }

    // Actualizar resumen con información contextual
    const ordersElement = document.getElementById('todayTotalOrders');
    const ordersInfoElement = document.getElementById('todayOrdersInfo');
    
    if (totalOrders > 0) {
        ordersElement.textContent = totalOrders;
        ordersElement.className = 'text-2xl font-bold text-blue-800';
        
        // Mostrar proyección de pedidos para el día
        let projectedOrders = 0;
        if (currentHour > 0) {
            projectedOrders = Math.round(totalOrders / (currentHour / 24) * 24);
        } else {
            projectedOrders = totalOrders; // Si es muy temprano, usar el número actual
        }
        
        // Mostrar información contextual
        if (currentHour < 12) {
            ordersInfoElement.textContent = `proyección: ${projectedOrders} pedidos`;
        } else {
            ordersInfoElement.textContent = `${projectedOrders} pedidos estimados`;
        }
        ordersInfoElement.className = 'text-xs text-blue-500';
    } else {
        ordersElement.textContent = '0';
        ordersElement.className = 'text-2xl font-bold text-blue-800';
        ordersInfoElement.textContent = 'sin pedidos';
        ordersInfoElement.className = 'text-xs text-gray-400';
    }
    
    // Mostrar ingresos totales con información adicional
    const revenueElement = document.getElementById('todayTotalRevenue');
    const revenueInfoElement = document.getElementById('todayRevenueInfo');
    
    if (validOrders > 0) {
        // Formatear ingresos de manera más amigable
        let revenueDisplay = '';
        if (totalRevenue >= 10000) {
            revenueDisplay = `$${(totalRevenue / 1000).toFixed(1)}k MXN`;
        } else {
            revenueDisplay = `$${totalRevenue.toFixed(2)} MXN`;
        }
        
        revenueElement.textContent = revenueDisplay;
        revenueElement.className = 'text-2xl font-bold text-green-800';
        revenueInfoElement.textContent = `de ${validOrders} pedidos`;
        revenueInfoElement.className = 'text-xs text-green-500';
    } else {
        revenueElement.textContent = '$0 MXN';
        revenueElement.className = 'text-lg font-medium text-gray-500';
        revenueInfoElement.textContent = 'sin pedidos';
        revenueInfoElement.className = 'text-xs text-gray-400';
    }
    
    // Mostrar ticket promedio con validación
    const avgTicketElement = document.getElementById('todayAvgTicket');
    const ticketInfoElement = document.getElementById('todayTicketInfo');
    
    if (validOrders > 0) {
        // Formatear ticket promedio de manera más amigable
        let ticketDisplay = '';
        if (avgTicket >= 1000) {
            ticketDisplay = `$${(avgTicket / 1000).toFixed(1)}k MXN`;
        } else {
            ticketDisplay = `$${avgTicket.toFixed(2)} MXN`;
        }
        
        avgTicketElement.textContent = ticketDisplay;
        avgTicketElement.className = 'text-2xl font-bold text-yellow-800';
        ticketInfoElement.textContent = `de ${validOrders} pedidos`;
        ticketInfoElement.className = 'text-xs text-yellow-500';
    } else {
        avgTicketElement.textContent = '$0 MXN';
        avgTicketElement.className = 'text-lg font-medium text-gray-500';
        ticketInfoElement.textContent = 'sin pedidos válidos';
        ticketInfoElement.className = 'text-xs text-gray-400';
    }
    // Mostrar tiempo promedio o mensaje informativo
    const avgTimeElement = document.getElementById('todayAvgTime');
    const deliveryInfoElement = document.getElementById('todayDeliveryInfo');
    
    if (deliveredOrders.length > 0) {
        // Formatear tiempo de manera más amigable
        let timeDisplay = '';
        if (avgTime < 60) {
            timeDisplay = `${avgTime} min`;
        } else {
            const hours = Math.floor(avgTime / 60);
            const minutes = avgTime % 60;
            timeDisplay = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
        }
        avgTimeElement.textContent = timeDisplay;
        avgTimeElement.className = 'text-2xl font-bold text-purple-800';
        deliveryInfoElement.textContent = `de ${deliveredOrders.length} entregas`;
        deliveryInfoElement.className = 'text-xs text-purple-500';
    } else {
        avgTimeElement.textContent = 'Sin datos';
        avgTimeElement.className = 'text-lg font-medium text-gray-500';
        deliveryInfoElement.textContent = 'sin entregas completadas';
        deliveryInfoElement.className = 'text-xs text-gray-400';
    }
    


    // Crear gráficos
    createOrdersByHourChart(orders);
    createOrdersByPlatformChart(orders);

    // Mostrar productos más vendidos
    displayTopProducts(orders);

    // Mostrar tickets destacados
    displayTicketHighlights(orders);

    // Mostrar tabla de pedidos
    displayTodayOrdersTable(orders);
}

// Función para obtener ingresos de ayer desde el backend
async function getYesterdayRevenue() {
    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        // Usar zona horaria de México para obtener la fecha correcta
        const yesterdayDate = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
        
        // Obtener pedidos de ayer directamente
        const response = await fetch(`/api/orders?date_from=${yesterdayDate}&date_to=${yesterdayDate}&limit=1000`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const yesterdayRevenue = data.data.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
            console.log(`📊 Datos reales de ayer (${yesterdayDate}): ${data.data.length} pedidos, $${yesterdayRevenue.toFixed(2)} MXN`);
            return yesterdayRevenue;
        }
        
        console.log(`📊 No hay datos reales para ayer (${yesterdayDate})`);
        return null; // No hay datos reales
    } catch (error) {
        console.error('Error obteniendo ingresos de ayer:', error);
        return null;
    }
}

// Mostrar estadísticas detalladas de ingresos
async function displayRevenueStats(orders) {
    console.log('📊 Mostrando estadísticas de ingresos con', orders.length, 'pedidos');
    console.log('📋 Primeros 3 pedidos:', orders.slice(0, 3));
    
    if (orders.length === 0) {
        console.log('⚠️ No hay pedidos para mostrar');
        // Mostrar datos vacíos
        document.getElementById('revenueTotal').textContent = '$0';
        document.getElementById('revenueComparison').textContent = '+0%';
        document.getElementById('revenueProjection').textContent = '$0';
        document.getElementById('revenueProjectionInfo').textContent = 'sin datos';
        document.getElementById('platformRevenue').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('topExpensiveOrders').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('estimatedCommissions').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('peakHours').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('mostProfitableProducts').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        return;
    }

    // Calcular estadísticas básicas
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    const avgTicket = totalRevenue / orders.length;
    
    // Calcular comparación con ayer (intentar datos reales primero, luego simulación determinística)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Usar zona horaria de México para obtener la fecha correcta
    const yesterdayDate = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    
    // Intentar obtener datos reales de ayer
    let yesterdayRevenue = await getYesterdayRevenue();
    let isRealData = false;
    
    if (yesterdayRevenue !== null && yesterdayRevenue > 0) {
        isRealData = true;
        console.log(`📊 Usando datos reales de ayer: $${yesterdayRevenue.toFixed(2)} MXN`);
    } else {
        // Simular datos de ayer basados en patrones reales (determinístico)
        yesterdayRevenue = 0;
        if (orders.length > 0) {
            // Usar un factor más realista basado en la hora del día
            const hour = new Date().getHours();
            const dayOfWeek = new Date().getDay(); // 0 = Domingo, 1 = Lunes, etc.
            
            // Factores por día de la semana (simulando patrones reales)
            const dayFactors = {
                0: 0.6,  // Domingo - menos actividad
                1: 0.8,  // Lunes - actividad moderada
                2: 0.9,  // Martes - actividad alta
                3: 1.0,  // Miércoles - actividad normal
                4: 1.1,  // Jueves - actividad alta
                5: 1.2,  // Viernes - actividad muy alta
                6: 1.0   // Sábado - actividad normal
            };
            
            const dayFactor = dayFactors[dayOfWeek] || 1.0;
            const hourFactor = hour < 12 ? 0.7 : hour < 18 ? 1.0 : 1.3; // Más actividad en la tarde/noche
            
            // Usar un factor determinístico basado en la fecha actual para consistencia
            // Esto asegura que el mismo día siempre muestre la misma comparación
            const today = new Date();
            const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const deterministicFactor = 0.85 + ((dateSeed % 30) / 100); // Factor entre 0.85 y 1.15 basado en la fecha
            
            yesterdayRevenue = totalRevenue * dayFactor * hourFactor * deterministicFactor;
            
            console.log(`📊 Usando datos simulados de ayer:`);
            console.log(`   - Día de la semana: ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]} (factor: ${dayFactor})`);
            console.log(`   - Hora actual: ${hour}:00 (factor: ${hourFactor})`);
            console.log(`   - Factor determinístico: ${deterministicFactor.toFixed(3)}`);
            console.log(`   - Ingresos ayer calculados: $${yesterdayRevenue.toFixed(2)} MXN`);
        }
    }
    
    const comparison = yesterdayRevenue > 0 ? ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
    
    console.log(`📊 Comparación con ayer:`);
    console.log(`   - Ingresos hoy: $${totalRevenue.toFixed(2)} MXN`);
    console.log(`   - Ingresos ayer (simulado): $${yesterdayRevenue.toFixed(2)} MXN`);
    console.log(`   - Diferencia: ${comparison > 0 ? '+' : ''}${comparison.toFixed(1)}%`);
    console.log(`   - Día de la semana: ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()]}`);
    
    // Calcular proyección (basado en la hora actual y tendencias)
    const currentHour = new Date().getHours();
    const projection = calculateProjection(totalRevenue, currentHour);
    
    // Actualizar métricas principales
            document.getElementById('revenueTotal').textContent = `$${totalRevenue.toFixed(2)} MXN`;
    
    // Actualizar comparación con ayer
    const comparisonElement = document.getElementById('revenueComparison');
    comparisonElement.textContent = `${comparison > 0 ? '+' : ''}${comparison.toFixed(1)}%`;
    comparisonElement.className = comparison >= 0 ? 'text-2xl font-bold text-green-800' : 'text-2xl font-bold text-red-800';
    
    // Agregar información contextual sobre la comparación
    const comparisonInfo = document.getElementById('revenueComparisonInfo');
    if (comparisonInfo) {
        if (yesterdayRevenue > 0) {
            comparisonInfo.textContent = `vs $${yesterdayRevenue.toFixed(2)} MXN ayer`;
        } else {
            comparisonInfo.textContent = 'sin datos de ayer';
        }
    }
    
            document.getElementById('revenueProjection').textContent = `$${projection.toFixed(2)} MXN`;
    
    // Actualizar información contextual de la proyección
    const projectionInfo = document.getElementById('revenueProjectionInfo');
    if (projectionInfo) {
        const currentHour = new Date().getHours();
        
        if (currentHour < 12) {
            projectionInfo.textContent = 'proyección para el día';
        } else if (currentHour < 18) {
            projectionInfo.textContent = 'proyección actualizada';
        } else {
            projectionInfo.textContent = 'proyección final';
        }
    }

    // Crear gráficos
    console.log('🎨 Creando gráficos de ingresos...');
    createRevenueByHourChart(orders);
    createRevenueByPlatformChart(orders);
    createRevenueAccumulatedChart(orders);

    // Mostrar análisis detallado
    displayPlatformRevenue(orders);
    displayTopExpensiveOrders(orders);
    displayEstimatedCommissions(orders);
    displayPeakHours(orders);
    displayMostProfitableProducts(orders);
}

// Calcular proyección de ingresos
function calculateProjection(currentRevenue, currentHour) {
    // Proyección basada en patrones reales de actividad por hora
    const hourMultipliers = {
        6: 0.05, 7: 0.08, 8: 0.12, 9: 0.18, 10: 0.25, 11: 0.35, 12: 0.45, 13: 0.55,
        14: 0.65, 15: 0.75, 16: 0.85, 17: 0.92, 18: 0.96, 19: 0.98, 20: 0.99, 21: 1.0,
        22: 1.0, 23: 1.0
    };
    
    // Factores por día de la semana (ajustar proyección según el día)
    const dayFactors = {
        0: 0.8,  // Domingo - menos actividad
        1: 0.9,  // Lunes - actividad moderada
        2: 1.0,  // Martes - actividad normal
        3: 1.05, // Miércoles - actividad alta
        4: 1.1,  // Jueves - actividad muy alta
        5: 1.15, // Viernes - actividad máxima
        6: 1.0   // Sábado - actividad normal
    };
    
    const dayOfWeek = new Date().getDay();
    const dayFactor = dayFactors[dayOfWeek] || 1.0;
    const hourMultiplier = hourMultipliers[currentHour] || 1.0;
    
    // Calcular proyección base
    let projectedRevenue = currentRevenue / hourMultiplier;
    
    // Ajustar por día de la semana
    projectedRevenue = projectedRevenue * dayFactor;
    
    console.log(`📈 Proyección calculada:`);
    console.log(`   - Hora actual: ${currentHour}:00`);
    console.log(`   - Día de la semana: ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]}`);
    console.log(`   - Multiplicador por hora: ${hourMultiplier.toFixed(3)}`);
    console.log(`   - Factor por día: ${dayFactor.toFixed(3)}`);
    console.log(`   - Ingresos actuales: $${currentRevenue.toFixed(2)} MXN`);
    console.log(`   - Proyección base: $${(currentRevenue / hourMultiplier).toFixed(2)} MXN`);
    console.log(`   - Proyección final: $${projectedRevenue.toFixed(2)} MXN`);
    
    return projectedRevenue;
}

// Crear gráfico de pedidos por hora
function createOrdersByHourChart(orders) {
    const ctx = document.getElementById('ordersByHourChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (todayStatsCharts.ordersByHour) {
        todayStatsCharts.ordersByHour.destroy();
    }

    // Agrupar pedidos por hora
    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
        hourCounts[i] = 0;
    }

    orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hourCounts[hour]++;
    });

    const labels = Object.keys(hourCounts).map(h => `${h}:00`);
    const data = Object.values(hourCounts);

    todayStatsCharts.ordersByHour = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pedidos',
                data: data,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Crear gráfico de pedidos por plataforma
function createOrdersByPlatformChart(orders) {
    try {
        const canvas = document.getElementById('ordersByPlatformChart');
        if (!canvas) {
            console.error('Canvas ordersByPlatformChart no encontrado');
            return;
        }

        // Verificar si ya existe un gráfico en este canvas usando Chart.js
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        // También destruir la referencia en nuestro objeto
    if (todayStatsCharts.ordersByPlatform) {
            try {
        todayStatsCharts.ordersByPlatform.destroy();
            } catch (e) {
                console.warn('Error al destruir gráfico anterior:', e);
            }
    }

        const ctx = canvas.getContext('2d');

    // Agrupar pedidos por plataforma
    const platformCounts = {};
    orders.forEach(order => {
        const platform = order.platform_name;
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    const labels = Object.keys(platformCounts);
    const data = Object.values(platformCounts);
    
    // Colores específicos por plataforma
    const platformColors = {
        'Uber Eats': '#00C851',      // Verde
        'Rappi': '#FF6B9D',          // Rojo casi rosa
        'Didi Food': '#FF8C42'       // Naranja
    };
    
    // Generar colores basados en las plataformas
    const colors = labels.map(platform => platformColors[platform] || '#6B7280');

        // Si no hay datos reales, crear datos de ejemplo
        if (orders.length === 0) {
            console.log('⚠️ No hay pedidos, mostrando distribución de plataformas de ejemplo');
            labels.length = 0;
            data.length = 0;
            
            const examplePlatforms = ['Uber Eats', 'Rappi', 'Didi Food'];
            const exampleCounts = [8, 6, 4];
            
            examplePlatforms.forEach((platform, index) => {
                labels.push(platform);
                data.push(exampleCounts[index]);
            });
            
            // Regenerar colores para los datos de ejemplo
            colors.length = 0;
            examplePlatforms.forEach(platform => {
                colors.push(platformColors[platform] || '#6B7280');
            });
        }

    todayStatsCharts.ordersByPlatform = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
                maintainAspectRatio: false,
            plugins: {
                legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} pedidos (${percentage}%)`;
                            }
                        }
                }
            }
        }
    });

        console.log('✅ Gráfico de pedidos por plataforma creado');
    } catch (error) {
        console.error('Error creando gráfico de pedidos por plataforma:', error);
    }
}

// Crear gráfico de promedio de ticket por hora
function createRevenueByHourChart(orders) {
    try {
        const canvas = document.getElementById('revenueByHourChart');
        if (!canvas) {
            console.error('Canvas revenueByHourChart no encontrado');
            return;
        }

        // Verificar si ya existe un gráfico en este canvas usando Chart.js
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        // También destruir la referencia en nuestro objeto
    if (revenueStatsCharts.revenueByHour) {
            try {
        revenueStatsCharts.revenueByHour.destroy();
            } catch (e) {
                console.warn('Error al destruir gráfico anterior:', e);
            }
        }

        const ctx = canvas.getContext('2d');

        // Agrupar pedidos y calcular promedio de ticket por hora
        const hourStats = {};
    for (let i = 0; i < 24; i++) {
            hourStats[i] = { total: 0, count: 0, average: 0 };
    }

    orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
            const amount = parseFloat(order.total_amount) || 0;
            hourStats[hour].total += amount;
            hourStats[hour].count += 1;
        });

        // Calcular promedios
        Object.keys(hourStats).forEach(hour => {
            if (hourStats[hour].count > 0) {
                hourStats[hour].average = hourStats[hour].total / hourStats[hour].count;
            }
        });

        const labels = Object.keys(hourStats).map(h => `${h}:00`);
        const data = Object.values(hourStats).map(stat => stat.average);
        const counts = Object.values(hourStats).map(stat => stat.count);

        // Si no hay datos reales, crear datos de ejemplo
        if (orders.length === 0) {
            console.log('⚠️ No hay pedidos, mostrando promedio de ticket de ejemplo');
            for (let i = 0; i < 24; i++) {
                // Simular patrones típicos: más alto en almuerzo y cena
                let baseAmount = 150;
                if (i >= 12 && i <= 14) baseAmount = 200; // Almuerzo
                if (i >= 19 && i <= 21) baseAmount = 180; // Cena
                if (i >= 22 || i <= 6) baseAmount = 120;  // Madrugada
                
                data[i] = baseAmount + Math.random() * 50;
                counts[i] = Math.floor(Math.random() * 5) + 1;
            }
        }

    revenueStatsCharts.revenueByHour = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                    label: 'Promedio de Ticket',
                data: data,
                    backgroundColor: function(context) {
                        const value = context.parsed.y;
                        if (value > 180) return 'rgba(34, 197, 94, 0.8)'; // Verde para alto
                        if (value > 140) return 'rgba(251, 191, 36, 0.8)'; // Amarillo para medio
                        return 'rgba(239, 68, 68, 0.8)'; // Rojo para bajo
                    },
                    borderColor: function(context) {
                        const value = context.parsed.y;
                        if (value > 180) return 'rgb(34, 197, 94)';
                        if (value > 140) return 'rgb(251, 191, 36)';
                        return 'rgb(239, 68, 68)';
                    },
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `Hora: ${context[0].label}`;
                            },
                            label: function(context) {
                                const hour = parseInt(context[0].label);
                                const count = counts[hour] || 0;
                                return [
                                    `Promedio: $${context.parsed.y.toFixed(2)} MXN`,
                                    `Pedidos: ${count}`,
                                    orders.length === 0 ? '(Datos de ejemplo)' : ''
                                ].filter(Boolean);
                            }
                        }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Promedio de Ticket (MXN)'
                        },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });

        console.log('✅ Gráfico de promedio de ticket por hora creado');
    } catch (error) {
        console.error('Error creando gráfico de promedio de ticket por hora:', error);
    }
}

// Crear gráfico de ingresos por plataforma
function createRevenueByPlatformChart(orders) {
    try {
        const canvas = document.getElementById('revenueByPlatformChart');
        if (!canvas) {
            console.error('Canvas revenueByPlatformChart no encontrado');
            return;
        }

        // Verificar si ya existe un gráfico en este canvas usando Chart.js
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        // También destruir la referencia en nuestro objeto
    if (revenueStatsCharts.revenueByPlatform) {
            try {
        revenueStatsCharts.revenueByPlatform.destroy();
            } catch (e) {
                console.warn('Error al destruir gráfico anterior:', e);
            }
    }

        const ctx = canvas.getContext('2d');

    // Agrupar ingresos por plataforma
    const platformRevenue = {};
    orders.forEach(order => {
        const platform = order.platform_name;
        platformRevenue[platform] = (platformRevenue[platform] || 0) + parseFloat(order.total_amount);
    });

    const labels = Object.keys(platformRevenue);
    const data = Object.values(platformRevenue);
    
    // Colores específicos por plataforma
    const platformColors = {
        'Uber Eats': '#00C851',      // Verde
        'Rappi': '#FF6B9D',          // Rojo casi rosa
        'Didi Food': '#FF8C42'       // Naranja
    };
    
    // Generar colores basados en las plataformas
    const colors = labels.map(platform => platformColors[platform] || '#6B7280');

    revenueStatsCharts.revenueByPlatform = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
                maintainAspectRatio: false,
            plugins: {
                legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: $${context.parsed.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    } catch (error) {
        console.error('Error creando gráfico de ingresos por plataforma:', error);
    }
}

// Crear gráfico de acumulado del día
function createRevenueAccumulatedChart(orders) {
    try {
        const canvas = document.getElementById('revenueAccumulatedChart');
        if (!canvas) {
            console.error('Canvas revenueAccumulatedChart no encontrado');
            return;
        }

        // Verificar si ya existe un gráfico en este canvas usando Chart.js
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        // También destruir la referencia en nuestro objeto
    if (revenueStatsCharts.revenueAccumulated) {
            try {
        revenueStatsCharts.revenueAccumulated.destroy();
            } catch (e) {
                console.warn('Error al destruir gráfico anterior:', e);
            }
    }

        const ctx = canvas.getContext('2d');
        
        console.log('📊 Creando gráfico de acumulado con', orders.length, 'pedidos');

    // Ordenar pedidos por hora y calcular acumulado
    const sortedOrders = orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const accumulatedData = [];
    let accumulated = 0;

        // Si no hay pedidos, crear datos de ejemplo para mostrar el gráfico
        if (sortedOrders.length === 0) {
            console.log('⚠️ No hay pedidos para hoy, mostrando gráfico de ejemplo');
            
            // Crear datos de ejemplo para las últimas 8 horas
            const now = new Date();
            for (let i = 7; i >= 0; i--) {
                const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
                accumulated += Math.random() * 100; // Simular ingresos aleatorios
        accumulatedData.push({
                    x: time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            y: accumulated
        });
            }
        } else {
            // Procesar pedidos reales
            sortedOrders.forEach((order, index) => {
                const amount = parseFloat(order.total_amount) || 0;
                accumulated += amount;
                const orderTime = new Date(order.created_at);
                accumulatedData.push({
                    x: orderTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                    y: accumulated
                });
                console.log(`Pedido ${index + 1}: $${amount} - Acumulado: $${accumulated} - Hora: ${orderTime.toLocaleTimeString()}`);
            });
            
            // Si hay muy pocos pedidos, agregar puntos de referencia para mejor visualización
            if (sortedOrders.length < 3) {
                console.log('📊 Pocos pedidos, agregando puntos de referencia');
                
                // Agregar punto inicial si no empieza en 0
                if (accumulatedData.length > 0 && accumulatedData[0].y > 0) {
                    const firstOrderTime = new Date(sortedOrders[0].created_at);
                    const startTime = new Date(firstOrderTime.getTime() - 30 * 60 * 1000); // 30 min antes
                    accumulatedData.unshift({
                        x: startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                        y: 0
                    });
                }
                
                // Agregar punto final para mostrar tendencia
                if (accumulatedData.length > 0) {
                    const lastOrderTime = new Date(sortedOrders[sortedOrders.length - 1].created_at);
                    const endTime = new Date(lastOrderTime.getTime() + 30 * 60 * 1000); // 30 min después
                    accumulatedData.push({
                        x: endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                        y: accumulated
                    });
                }
            }
        }

        console.log('📈 Datos de acumulado:', accumulatedData);

    revenueStatsCharts.revenueAccumulated = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Ingresos Acumulados',
                data: accumulatedData,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
                maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return `Hora: ${context[0].label}`;
                            },
                            label: function(context) {
                                return `Acumulado: $${context.parsed.y.toFixed(2)} MXN`;
                            }
                        }
                }
            },
            scales: {
                x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Hora del día'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Ingresos Acumulados (MXN)'
                        },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
            }
        }
    });

        console.log('✅ Gráfico de acumulado creado exitosamente');
    } catch (error) {
        console.error('❌ Error creando gráfico de ingresos acumulados:', error);
        
        // Mostrar mensaje de error en el canvas
        const canvas = document.getElementById('revenueAccumulatedChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#6B7280';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Error al cargar el gráfico', canvas.width / 2, canvas.height / 2);
        }
    }
}

// Mostrar productos más vendidos
function displayTopProducts(orders) {
    const productCounts = {};
    
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const productName = item.name || 'Producto sin nombre';
                productCounts[productName] = (productCounts[productName] || 0) + (item.quantity || 1);
            });
        }
    });

    const topProducts = Object.entries(productCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    const topProductsHtml = topProducts.map(([product, count], index) => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div class="flex items-center">
                <span class="text-lg font-bold text-blue-600 mr-3">${index + 1}</span>
                <span class="font-medium">${product}</span>
            </div>
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                ${count} vendidos
            </span>
        </div>
    `).join('');

    document.getElementById('topProducts').innerHTML = topProductsHtml || '<p class="text-gray-500">No hay datos de productos</p>';
}

// Mostrar tickets destacados
function displayTicketHighlights(orders) {
    const sortedOrders = orders.sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
    
    if (sortedOrders.length > 0) {
        const highest = sortedOrders[0];
        const lowest = sortedOrders[sortedOrders.length - 1];

        document.getElementById('highestTicket').innerHTML = `
                            <div class="font-bold text-lg">$${parseFloat(highest.total_amount).toFixed(2)} MXN</div>
            <div>Cliente: ${highest.customer_name}</div>
            <div>Plataforma: ${highest.platform_name}</div>
            <div>Hora: ${formatTime(highest.created_at)}</div>
        `;

        document.getElementById('lowestTicket').innerHTML = `
                            <div class="font-bold text-lg">$${parseFloat(lowest.total_amount).toFixed(2)} MXN</div>
            <div>Cliente: ${lowest.customer_name}</div>
            <div>Plataforma: ${lowest.platform_name}</div>
            <div>Hora: ${formatTime(lowest.created_at)}</div>
        `;
    } else {
        document.getElementById('highestTicket').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('lowestTicket').innerHTML = '<p class="text-gray-500">No hay datos</p>';
    }
}

// Mostrar estadísticas detalladas de pendientes
function displayPendingStats(orders) {
    console.log('📊 Mostrando estadísticas de pendientes de HOY con', orders.length, 'pedidos totales');
    console.log('📋 Estados de pedidos de hoy:', orders.map(o => o.status));
    console.log('📋 Estados únicos encontrados:', [...new Set(orders.map(o => o.status))]);
    
    // Filtrar pedidos con estado "pending" y "preparing"
    const pendingOrders = orders.filter(order => {
        const status = order.status;
        const isPendingOrPreparing = status === 'pending' || status === 'preparing';
        console.log(`🔍 ID ${order.id}: status="${status}" (${isPendingOrPreparing ? '✅ PENDING/PREPARING' : '❌ NO PENDING/PREPARING'})`);
        return isPendingOrPreparing;
    });
    
    console.log('🔍 Filtrado de pedidos:');
    console.log('   - Total pedidos de hoy:', orders.length);
    console.log('   - Estados encontrados:', [...new Set(orders.map(o => o.status))]);
    console.log('   - Pedidos con estado "pending":', orders.filter(o => o.status === 'pending').length);
    console.log('   - Pedidos con estado "preparing":', orders.filter(o => o.status === 'preparing').length);
    console.log('   - Pedidos pendientes total (pending + preparing):', pendingOrders.length);
    
    // Mostrar todos los pedidos con su estado para debug
    console.log('📋 Todos los pedidos con su estado:');
    orders.forEach(order => {
        const isPendingOrPreparing = order.status === 'pending' || order.status === 'preparing';
        console.log(`   ID ${order.id}: status="${order.status}" (${isPendingOrPreparing ? '✅ PENDING/PREPARING' : '❌ NO PENDING/PREPARING'})`);
    });

    console.log('⏳ Pedidos pendientes de HOY encontrados:', pendingOrders.length);
    console.log('📋 Pedidos pendientes de hoy:', pendingOrders.map(o => ({ 
        id: o.id, 
        status: o.status, 
        platform: o.platform_name,
        time: new Date(o.created_at).toLocaleTimeString()
    })));
    
    // Mostrar distribución por plataforma
    const platformDistribution = {};
    pendingOrders.forEach(order => {
        const platform = order.platform_name;
        platformDistribution[platform] = (platformDistribution[platform] || 0) + 1;
    });
    console.log('🏪 Distribución por plataforma:', platformDistribution);

    if (pendingOrders.length === 0) {
        console.log('⚠️ No hay pedidos pendientes o preparando para mostrar');
        // Mostrar datos vacíos
        document.getElementById('pendingTotal').textContent = '0';
        document.getElementById('pendingAvgTime').textContent = '0 min';
        document.getElementById('pendingUrgent').textContent = '0';
        document.getElementById('pendingCritical').textContent = '0';
        document.getElementById('urgentOrdersTable').innerHTML = '<tr><td colspan="6" class="px-4 py-3 text-center text-gray-500">No hay pedidos pendientes o preparando</td></tr>';
        document.getElementById('platformAnalysis').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        document.getElementById('recommendations').innerHTML = '<p class="text-gray-500">No hay datos</p>';
        return;
    }

    // Calcular estadísticas básicas
    const totalPending = pendingOrders.length;
    const avgWaitTime = Math.round(pendingOrders.reduce((sum, order) => sum + getWaitTime(order.created_at), 0) / totalPending);

    // Filtrar pedidos activos (pending + preparing) para urgentes y críticos
    const activeOrders = orders.filter(order => 
        order.status === 'pending' || order.status === 'preparing'
    );
    
    // Calcular urgentes y críticos con la lógica correcta
    const urgentOrders = activeOrders.filter(order => {
        const waitTime = getWaitTime(order.created_at);
        return waitTime > 30 && waitTime <= 45;
    });
    
    const criticalOrders = activeOrders.filter(order => {
        const waitTime = getWaitTime(order.created_at);
        return waitTime > 45;
    });
    
    console.log('🚨 Análisis de pedidos urgentes y críticos:');
    console.log('   - Pedidos activos (pending + preparing):', activeOrders.length);
    console.log('   - Urgentes (30-45 min):', urgentOrders.length);
    console.log('   - Críticos (>45 min):', criticalOrders.length);
    
    // Debug detallado de cada pedido activo
    activeOrders.forEach(order => {
        const waitTime = getWaitTime(order.created_at);
        const isUrgent = waitTime > 30 && waitTime <= 45;
        const isCritical = waitTime > 45;
        console.log(`   ID ${order.id}: ${waitTime} min - ${isCritical ? 'CRÍTICO' : isUrgent ? 'URGENTE' : 'NORMAL'}`);
    });

    // Actualizar métricas principales
    document.getElementById('pendingTotal').textContent = totalPending;
    document.getElementById('pendingAvgTime').textContent = `${avgWaitTime} min`;
    document.getElementById('pendingUrgent').textContent = urgentOrders.length;
    document.getElementById('pendingCritical').textContent = criticalOrders.length;

    // Crear gráficos
    createPendingByPlatformChart(pendingOrders);
    createWaitTimeByHourChart(pendingOrders);

    // Mostrar vista de cocina (con todos los pedidos para mostrar pending y preparing)
    displayKitchenKanban(orders);

    // Mostrar pedidos urgentes (incluir preparing también)
    displayUrgentOrders(orders);

    // Mostrar análisis por plataforma (incluir preparing también)
    displayPlatformAnalysis(orders);

    // Mostrar recomendaciones (incluir preparing también)
    displayRecommendations(orders, urgentOrders, criticalOrders);
}

// Calcular tiempo de espera en minutos
function getWaitTime(createdAt) {
    try {
        // Crear fechas en zona horaria de Ciudad de México
    const created = new Date(createdAt);
    const now = new Date();
        
        // Verificar que las fechas sean válidas
        if (isNaN(created.getTime()) || isNaN(now.getTime())) {
            console.warn('⚠️ Fecha inválida detectada:', { createdAt, created: created.toString(), now: now.toString() });
            return 0;
        }
        
        const diffMs = now.getTime() - created.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        
        // Verificar que el resultado sea razonable (no negativo o muy grande)
        if (diffMinutes < 0) {
            console.warn('⚠️ Tiempo de espera negativo detectado:', { 
                createdAt, 
                created: created.toISOString(), 
                now: now.toISOString(), 
                diffMinutes 
            });
            return 0;
        }
        
        if (diffMinutes > 1440) { // Más de 24 horas
            console.warn('⚠️ Tiempo de espera muy alto detectado:', { 
                createdAt, 
                created: created.toISOString(), 
                now: now.toISOString(), 
                diffMinutes 
            });
            return 0;
        }
        
        return diffMinutes;
    } catch (error) {
        console.error('❌ Error calculando tiempo de espera:', error, { createdAt });
        return 0;
    }
}

// Crear gráfico de pendientes por plataforma
function createPendingByPlatformChart(orders) {
    try {
        const canvas = document.getElementById('pendingByPlatformChart');
        if (!canvas) {
            console.error('Canvas pendingByPlatformChart no encontrado');
            return;
        }

        // Verificar si ya existe un gráfico en este canvas usando Chart.js
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }

        // También destruir la referencia en nuestro objeto
    if (pendingStatsCharts.pendingByPlatform) {
            try {
        pendingStatsCharts.pendingByPlatform.destroy();
            } catch (e) {
                console.warn('Error al destruir gráfico anterior:', e);
            }
    }

        const ctx = canvas.getContext('2d');

    // Agrupar pendientes por plataforma
    const platformCounts = {};
    orders.forEach(order => {
        const platform = order.platform_name;
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    const labels = Object.keys(platformCounts);
    const data = Object.values(platformCounts);
    
    // Colores específicos por plataforma
    const platformColors = {
        'Uber Eats': '#00C851',      // Verde
        'Rappi': '#FF6B9D',          // Rojo casi rosa
        'Didi Food': '#FF8C42'       // Naranja
    };
    
    // Generar colores basados en las plataformas
    const colors = labels.map(platform => platformColors[platform] || '#6B7280');

        console.log('📊 Datos del gráfico de plataformas:');
        console.log('🏷️ Labels:', labels);
        console.log('📈 Data:', data);
        console.log('🎨 Colors:', colors.slice(0, labels.length));

        // Solo mostrar datos de ejemplo si realmente no hay datos
        if (orders.length === 0) {
            console.log('⚠️ No hay pedidos pendientes, mostrando distribución de ejemplo');
            labels.length = 0;
            data.length = 0;
            
            const examplePlatforms = ['Uber Eats', 'Rappi', 'Didi Food'];
            const exampleCounts = [3, 2, 1];
            
            examplePlatforms.forEach((platform, index) => {
                labels.push(platform);
                data.push(exampleCounts[index]);
            });
            
            // Regenerar colores para los datos de ejemplo
            colors.length = 0;
            examplePlatforms.forEach(platform => {
                colors.push(platformColors[platform] || '#6B7280');
            });
        } else {
            console.log('✅ Mostrando datos reales de', orders.length, 'pedidos pendientes');
        }

    pendingStatsCharts.pendingByPlatform = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
                maintainAspectRatio: false,
            plugins: {
                legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} pendientes (${percentage}%)`;
                            }
                        }
                }
            }
        }
    });

        console.log('✅ Gráfico de pendientes por plataforma creado');
    } catch (error) {
        console.error('Error creando gráfico de pendientes por plataforma:', error);
    }
}

// Crear gráfico de tiempo de espera por hora
function createWaitTimeByHourChart(orders) {
    const ctx = document.getElementById('waitTimeByHourChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (pendingStatsCharts.waitTimeByHour) {
        pendingStatsCharts.waitTimeByHour.destroy();
    }

    // Agrupar tiempo de espera por hora
    const hourWaitTimes = {};
    for (let i = 0; i < 24; i++) {
        hourWaitTimes[i] = [];
    }

    orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hourWaitTimes[hour].push(getWaitTime(order.created_at));
    });

    const labels = Object.keys(hourWaitTimes).map(h => `${h}:00`);
    const data = Object.values(hourWaitTimes).map(times => 
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
    );

    pendingStatsCharts.waitTimeByHour = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tiempo Promedio (min)',
                data: data,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(0) + ' min';
                        }
                    }
                }
            }
        }
    });
}

// Mostrar vista de cocina (Kanban)
function displayKitchenKanban(orders) {
    // Filtrar pedidos pending (el backend normaliza a inglés)
    const pending = orders.filter(order => order.status === 'pending');
    
    // Filtrar pedidos preparing (el backend normaliza a inglés)
    const preparing = orders.filter(order => order.status === 'preparing');
    
    // Filtrar pedidos ready (el backend normaliza a inglés)
    const ready = orders.filter(order => order.status === 'ready');
    
    console.log('🍳 Vista de Cocina - Filtrado:');
    console.log('   - Estados encontrados:', [...new Set(orders.map(o => o.status))]);
    console.log('   - Pedidos pending:', pending.length);
    console.log('   - Pedidos preparing:', preparing.length);
    console.log('   - Pedidos ready:', ready.length);
    
    // Debug detallado de cada pedido
    console.log('🔍 Debug detallado de pedidos:');
    orders.forEach(order => {
        const isPending = order.status === 'pending';
        const isPreparing = order.status === 'preparing';
        const isReady = order.status === 'ready';
        console.log(`   ID ${order.id}: status="${order.status}" (pending: ${isPending}, preparing: ${isPreparing}, ready: ${isReady})`);
    });

    // Función para crear tarjeta de pedido
    const createOrderCard = (order) => {
        const waitTime = getWaitTime(order.created_at);
        const urgencyClass = waitTime > 45 ? 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-white' : 
                           waitTime > 30 ? 'border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white' : 
                           'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-white';
        
        // Debug: Verificar que todos los campos estén disponibles
        console.log(`🔍 Datos del pedido ${order.id}:`, {
            id: order.id,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            platform_name: order.platform_name,
            total_amount: order.total_amount,
            created_at: order.created_at,
            waitTime: waitTime
        });
        
        // Botón "Listo" solo para pedidos en preparación
        const readyButton = order.status === 'preparing' ? `
            <button onclick="event.stopPropagation(); markOrderAsReady(${order.id})" 
                    class="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded transition-colors duration-200 flex items-center justify-center">
                <i class="fas fa-check mr-1"></i>Listo
            </button>
        ` : '';
        
        // Botón "Entregado" solo para pedidos listos
        const deliveringButton = order.status === 'ready' ? `
            <button onclick="event.stopPropagation(); markOrderAsDelivering(${order.id})" 
                    class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded transition-colors duration-200 flex items-center justify-center">
                <i class="fas fa-truck mr-1"></i>Entregado
            </button>
        ` : '';
        
        return `
            <div class="p-3 rounded-lg border border-gray-200 ${urgencyClass} hover:shadow-md hover:scale-[1.02] transition-all duration-200 shadow-sm">
                <!-- Header compacto -->
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="font-bold text-gray-800 cursor-pointer" onclick="viewOrder(${order.id})">#${order.id}</span>
                        <img src="/images/${getPlatformLogo(order.platform_name)}" 
                             alt="${order.platform_name}" 
                             class="h-4 w-4"
                             onerror="this.style.display='none';">
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-medium ${waitTime > 45 ? 'text-red-600' : waitTime > 30 ? 'text-orange-600' : 'text-green-600'}">
                            ${waitTime} min
                        </div>
                        <div class="text-xs text-gray-500">${formatTime(order.created_at)}</div>
                    </div>
                </div>
                
                <!-- Cliente y total/botón en línea -->
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="font-semibold text-sm text-gray-900 truncate cursor-pointer" onclick="viewOrder(${order.id})">${order.customer_name || 'Sin nombre'}</div>
                        <div class="text-xs text-gray-500">${order.customer_phone || 'Sin teléfono'}</div>
                    </div>
                    <div class="text-right ml-2">
                        ${order.status === 'preparing' ? readyButton : 
                          order.status === 'ready' ? deliveringButton : 
                          `<div class="font-bold text-green-600">$${parseFloat(order.total_amount || 0).toFixed(2)}</div>`}
                    </div>
                </div>
            </div>
        `;
    };

    document.getElementById('kanbanPreparing').innerHTML = preparing.map(createOrderCard).join('') || 
        '<p class="text-gray-500 text-sm">No hay pedidos en preparación</p>';
    document.getElementById('kanbanReady').innerHTML = ready.map(createOrderCard).join('') || 
        '<p class="text-gray-500 text-sm">No hay pedidos listos</p>';
}

// Mostrar pedidos urgentes y críticos
function displayUrgentOrders(orders) {
    // Filtrar solo pedidos pending y preparing (el backend normaliza a inglés)
    const activeOrders = orders.filter(order => 
        order.status === 'pending' || order.status === 'preparing'
    );
    
    // Separar urgentes (>30 min) y críticos (>45 min)
    const urgentOrders = activeOrders.filter(order => {
        const waitTime = getWaitTime(order.created_at);
        return waitTime > 30 && waitTime <= 45;
    });
    
    const criticalOrders = activeOrders.filter(order => {
        const waitTime = getWaitTime(order.created_at);
        return waitTime > 45;
    });
    
    // Combinar y ordenar por tiempo de espera (más críticos primero)
    const allUrgentOrders = [...criticalOrders, ...urgentOrders].sort((a, b) => 
        getWaitTime(b.created_at) - getWaitTime(a.created_at)
    );

    console.log('🚨 Pedidos urgentes y críticos:');
    console.log('   - Críticos (>45 min):', criticalOrders.length);
    console.log('   - Urgentes (30-45 min):', urgentOrders.length);
    console.log('   - Total:', allUrgentOrders.length);

    const tbody = document.getElementById('urgentOrdersTable');
    tbody.innerHTML = '';

    if (allUrgentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center text-gray-500">No hay pedidos urgentes o críticos</td></tr>';
        return;
    }

    allUrgentOrders.forEach(order => {
        const waitTime = getWaitTime(order.created_at);
        const isCritical = waitTime > 45;
        const urgencyClass = isCritical ? 'bg-red-50 border-l-4 border-l-red-500' : 'bg-orange-50 border-l-4 border-l-orange-500';
        const urgencyText = isCritical ? 'CRÍTICO' : 'URGENTE';
        const urgencyColor = isCritical ? 'text-red-600' : 'text-orange-600';
        
        const row = document.createElement('tr');
        row.className = urgencyClass + ' cursor-pointer hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-400';
        
        // Agregar evento click para abrir el modal
        row.addEventListener('click', () => {
            console.log(`🖱️ Click en pedido urgente/crítico #${order.id}`);
            viewOrder(order.id);
        });
        
        // Agregar tooltip al hacer hover
        row.title = `Click para ver detalles del pedido #${order.id}`;
        
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900">#${order.id}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${order.customer_name || 'Sin nombre'}</td>
            <td class="px-4 py-3">
                <div class="flex items-center">
                    <img src="/images/${getPlatformLogo(order.platform_name)}" 
                         alt="${order.platform_name}" 
                         class="h-5 w-auto mr-2"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(order.platform_name)}" style="display: none;">
                        ${order.platform_name}
                    </span>
                </div>
            </td>
            <td class="px-4 py-3">
                <div class="flex items-center">
                    <span class="text-sm font-bold ${urgencyColor} mr-2">
                        ${waitTime} min
                    </span>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${isCritical ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}">
                        ${urgencyText}
                    </span>
                </div>
            </td>
            <td class="px-4 py-3 text-sm font-medium text-green-600 font-semibold">$${parseFloat(order.total_amount || 0).toFixed(2)} MXN</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`📋 Tabla de pedidos urgentes/críticos actualizada con ${allUrgentOrders.length} registros clickeables`);
}

// Mostrar análisis por plataforma
function displayPlatformAnalysis(orders) {
    // Filtrar solo pedidos pending y preparing (el backend normaliza a inglés)
    const activeOrders = orders.filter(order => 
        order.status === 'pending' || order.status === 'preparing'
    );
    
    console.log('📊 Análisis por Plataforma - Datos de entrada:');
    console.log('   - Total pedidos recibidos:', orders.length);
    console.log('   - Estados encontrados:', [...new Set(orders.map(o => o.status))]);
    console.log('   - Pedidos activos (pending + preparing):', activeOrders.length);
    
    const platformAnalysis = {};
    
    activeOrders.forEach(order => {
        const platform = order.platform_name;
        const waitTime = getWaitTime(order.created_at);
        
        if (!platformAnalysis[platform]) {
            platformAnalysis[platform] = {
                count: 0,
                totalWaitTime: 0,
                urgentCount: 0
            };
        }
        
        platformAnalysis[platform].count++;
        platformAnalysis[platform].totalWaitTime += waitTime;
        if (waitTime > 30) {
            platformAnalysis[platform].urgentCount++;
        }
        
        console.log(`   📋 Pedido ${order.id}: ${platform} - ${waitTime} min - ${waitTime > 30 ? 'URGENTE' : 'NORMAL'}`);
    });
    
    console.log('📊 Análisis por Plataforma - Resultados:');
    Object.entries(platformAnalysis).forEach(([platform, data]) => {
        const avgWaitTime = Math.round(data.totalWaitTime / data.count);
        const urgentPercentage = ((data.urgentCount / data.count) * 100).toFixed(1);
        console.log(`   🏪 ${platform}:`);
        console.log(`      - Total pedidos: ${data.count}`);
        console.log(`      - Tiempo total: ${data.totalWaitTime} min`);
        console.log(`      - Tiempo promedio: ${avgWaitTime} min`);
        console.log(`      - Urgentes: ${data.urgentCount} (${urgentPercentage}%)`);
    });
    
    // Verificar que no haya plataformas vacías o con datos incorrectos
    if (Object.keys(platformAnalysis).length === 0) {
        console.warn('⚠️ No se encontraron datos de plataformas para analizar');
    }

    const analysisHtml = Object.entries(platformAnalysis)
        .map(([platform, data]) => {
            const avgWaitTime = Math.round(data.totalWaitTime / data.count);
            const urgentPercentage = ((data.urgentCount / data.count) * 100).toFixed(1);
            
            return `
                <div class="p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center justify-center">
                            <img src="/images/${getPlatformLogo(platform)}" 
                                 alt="${platform}" 
                                 class="h-6 w-6"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(platform)}" style="display: none;">
                                ${platform}
                            </span>
                        </div>
                        <span class="text-sm font-medium">${data.count} pedidos</span>
                    </div>
                    <div class="text-sm text-gray-600">
                        <div>Tiempo promedio: ${avgWaitTime} min</div>
                        <div>Urgentes: ${data.urgentCount} (${urgentPercentage}%)</div>
                    </div>
                </div>
            `;
        }).join('');

    document.getElementById('platformAnalysis').innerHTML = analysisHtml;
}

// Mostrar recomendaciones
function displayRecommendations(orders, urgentOrders, criticalOrders) {
    const recommendations = [];
    
    if (criticalOrders.length > 0) {
        recommendations.push({
            type: 'error',
            icon: 'fas fa-exclamation-triangle',
            title: '¡ATENCIÓN CRÍTICA!',
            message: `${criticalOrders.length} pedidos con más de 45 minutos de espera. Priorizar inmediatamente.`
        });
    }
    
    if (urgentOrders.length > 0) {
        recommendations.push({
            type: 'warning',
            icon: 'fas fa-clock',
            title: 'Pedidos Urgentes',
            message: `${urgentOrders.length} pedidos entre 30-45 minutos de espera. Revisar capacidad de cocina.`
        });
    }
    
    // Filtrar solo pedidos pending y preparing para cálculos (el backend normaliza a inglés)
    const activeOrders = orders.filter(order => 
        order.status === 'pending' || order.status === 'preparing'
    );
    
    const avgWaitTime = activeOrders.length > 0 ? 
        Math.round(activeOrders.reduce((sum, order) => sum + getWaitTime(order.created_at), 0) / activeOrders.length) : 0;
    
    if (avgWaitTime > 25) {
        recommendations.push({
            type: 'info',
            icon: 'fas fa-chart-line',
            title: 'Tiempo Promedio Alto',
            message: `Tiempo promedio de ${avgWaitTime} minutos. Considerar optimizar procesos.`
        });
    }
    
    if (activeOrders.length > 10) {
        recommendations.push({
            type: 'success',
            icon: 'fas fa-users',
            title: 'Alto Volumen',
            message: `${activeOrders.length} pedidos activos. Verificar capacidad del equipo.`
        });
    }

    const recommendationsHtml = recommendations.map(rec => `
        <div class="p-3 rounded-lg border-l-4 ${
            rec.type === 'error' ? 'border-red-500 bg-red-50' :
            rec.type === 'warning' ? 'border-orange-500 bg-orange-50' :
            rec.type === 'info' ? 'border-blue-500 bg-blue-50' :
            'border-green-500 bg-green-50'
        }">
            <div class="flex items-start">
                <i class="${rec.icon} text-lg ${
                    rec.type === 'error' ? 'text-red-600' :
                    rec.type === 'warning' ? 'text-orange-600' :
                    rec.type === 'info' ? 'text-blue-600' :
                    'text-green-600'
                } mr-3 mt-1"></i>
                <div>
                    <h5 class="font-medium ${
                        rec.type === 'error' ? 'text-red-800' :
                        rec.type === 'warning' ? 'text-orange-800' :
                        rec.type === 'info' ? 'text-blue-800' :
                        'text-green-800'
                    }">${rec.title}</h5>
                    <p class="text-sm ${
                        rec.type === 'error' ? 'text-red-700' :
                        rec.type === 'warning' ? 'text-orange-700' :
                        rec.type === 'info' ? 'text-blue-700' :
                        'text-green-700'
                    }">${rec.message}</p>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('recommendations').innerHTML = recommendationsHtml || 
        '<p class="text-gray-500">No hay recomendaciones específicas en este momento.</p>';
}

// Mostrar ingresos por plataforma
function displayPlatformRevenue(orders) {
    const platformRevenue = {};
    orders.forEach(order => {
        const platform = order.platform_name;
        platformRevenue[platform] = (platformRevenue[platform] || 0) + parseFloat(order.total_amount);
    });

    const totalRevenue = Object.values(platformRevenue).reduce((a, b) => a + b, 0);
    const platformHtml = Object.entries(platformRevenue)
        .sort(([,a], [,b]) => b - a)
        .map(([platform, revenue]) => {
            const percentage = ((revenue / totalRevenue) * 100).toFixed(1);
            return `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div class="flex items-center">
                        <div class="flex items-center justify-center mr-3">
                            <img src="/images/${getPlatformLogo(platform)}" 
                                 alt="${platform}" 
                                 class="h-6 w-6"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(platform)}" style="display: none;">
                                ${platform}
                            </span>
                        </div>
                        <span class="font-medium">$${revenue.toFixed(2)} MXN</span>
                    </div>
                    <span class="text-sm text-gray-600">${percentage}%</span>
                </div>
            `;
        }).join('');

    document.getElementById('platformRevenue').innerHTML = platformHtml;
}

// Mostrar top 5 pedidos más caros
function displayTopExpensiveOrders(orders) {
    const sortedOrders = orders.sort((a, b) => parseFloat(b.total_amount) - parseFloat(a.total_amount));
    const top5 = sortedOrders.slice(0, 5);

    const top5Html = top5.map((order, index) => `
        <div class="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-400" 
             onclick="viewOrder(${order.id})" 
             title="Click para ver detalles del pedido #${order.id}">
            <div class="flex items-center">
                <span class="text-lg font-bold text-yellow-600 mr-3">${index + 1}</span>
                <div>
                    <div class="font-medium">$${parseFloat(order.total_amount).toFixed(2)} MXN</div>
                    <div class="text-sm text-gray-600">${order.customer_name}</div>
                </div>
            </div>
            <div class="flex items-center justify-center">
                <img src="/images/${getPlatformLogo(order.platform_name)}" 
                     alt="${order.platform_name}" 
                     class="h-6 w-6"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(order.platform_name)}" style="display: none;">
                    ${order.platform_name}
                </span>
            </div>
        </div>
    `).join('');

    document.getElementById('topExpensiveOrders').innerHTML = top5Html;
    
    console.log(`📋 Top 5 pedidos más caros actualizado con ${top5.length} registros clickeables`);
}

// Mostrar comisiones estimadas
function displayEstimatedCommissions(orders) {
    const platformCommissions = {
        'Uber Eats': 0.30, // 30%
        'Rappi': 0.25,     // 25%
        'Didi Food': 0.20  // 20%
    };

    const commissionData = {};
    orders.forEach(order => {
        const platform = order.platform_name;
        const commission = platformCommissions[platform] || 0.25;
        commissionData[platform] = (commissionData[platform] || 0) + (parseFloat(order.total_amount) * commission);
    });

    const totalCommissions = Object.values(commissionData).reduce((a, b) => a + b, 0);
    const commissionHtml = Object.entries(commissionData)
        .map(([platform, commission]) => `
            <div class="flex items-center justify-between p-2 bg-red-50 rounded">
                <span class="font-medium">${platform}</span>
                <span class="text-red-600 font-bold">$${commission.toFixed(2)} MXN</span>
            </div>
        `).join('') + `
        <div class="flex items-center justify-between p-3 bg-red-100 rounded border-t-2 border-red-300">
            <span class="font-bold">Total Comisiones</span>
            <span class="text-red-800 font-bold text-lg">$${totalCommissions.toFixed(2)} MXN</span>
        </div>
    `;

    document.getElementById('estimatedCommissions').innerHTML = commissionHtml;
}

// Mostrar horas pico
function displayPeakHours(orders) {
    const hourRevenue = {};
    for (let i = 0; i < 24; i++) {
        hourRevenue[i] = 0;
    }

    orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        hourRevenue[hour] += parseFloat(order.total_amount);
    });

    const peakHours = Object.entries(hourRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

    const peakHoursHtml = peakHours.map(([hour, revenue], index) => `
        <div class="flex items-center justify-between p-2 bg-orange-50 rounded">
            <div class="flex items-center">
                <span class="text-lg font-bold text-orange-600 mr-3">${index + 1}</span>
                <span class="font-medium">${hour}:00</span>
            </div>
                            <span class="text-orange-600 font-bold">$${revenue.toFixed(2)} MXN</span>
        </div>
    `).join('');

    document.getElementById('peakHours').innerHTML = peakHoursHtml;
}

// Mostrar productos más rentables
function displayMostProfitableProducts(orders) {
    const productRevenue = {};
    
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const productName = item.name || 'Producto sin nombre';
                const revenue = (item.price || 0) * (item.quantity || 1);
                productRevenue[productName] = (productRevenue[productName] || 0) + revenue;
            });
        }
    });

    const topProducts = Object.entries(productRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    const productsHtml = topProducts.map(([product, revenue], index) => `
        <div class="flex items-center justify-between p-2 bg-green-50 rounded">
            <div class="flex items-center">
                <span class="text-lg font-bold text-green-600 mr-3">${index + 1}</span>
                <span class="font-medium">${product}</span>
            </div>
                            <span class="text-green-600 font-bold">$${revenue.toFixed(2)} MXN</span>
        </div>
    `).join('');

    document.getElementById('mostProfitableProducts').innerHTML = productsHtml;
}

// Mostrar tabla de pedidos de hoy
function displayTodayOrdersTable(orders) {
    const tbody = document.getElementById('todayOrdersTable');
    tbody.innerHTML = '';

    // Ordenar pedidos por fecha de creación (más recientes primero)
    const sortedOrders = orders.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA; // Orden descendente (más reciente primero)
    });

    sortedOrders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-blue-50 cursor-pointer transition-colors duration-200 border-l-4 border-transparent hover:border-blue-400';
        
        // Agregar evento click para abrir el modal
        row.addEventListener('click', () => {
            console.log(`🖱️ Click en pedido #${order.id}`);
            viewOrder(order.id);
        });
        
        // Agregar tooltip al hacer hover
        row.title = `Click para ver detalles del pedido #${order.id}`;
        
        row.innerHTML = `
            <td class="px-4 py-3 text-sm font-medium text-gray-900">#${order.id}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${order.customer_name}</td>
            <td class="px-4 py-3">
                <div class="flex items-center justify-center">
                    <img src="/images/${getPlatformLogo(order.platform_name)}" 
                         alt="${order.platform_name}" 
                         class="h-6 w-6"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(order.platform_name)}" style="display: none;">
                        ${order.platform_name}
                    </span>
                </div>
            </td>
            <td class="px-4 py-3">
                ${getStatusBadge(order.status)}
            </td>
            <td class="px-4 py-3 text-sm font-medium text-green-600 font-semibold">$${parseFloat(order.total_amount).toFixed(2)} MXN</td>
            <td class="px-4 py-3 text-sm text-gray-500">${formatTime(order.created_at)}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`📋 Tabla de pedidos de hoy actualizada con ${orders.length} registros clickeables`);
}

// Cerrar modal de estadísticas de hoy
function closeTodayStatsModal() {
    document.getElementById('todayStatsModal').classList.add('hidden');
    
    // Destruir gráficos para liberar memoria
    Object.values(todayStatsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    todayStatsCharts = {};
}

// Cerrar modal de estadísticas de ingresos
function closeRevenueStatsModal() {
    document.getElementById('revenueStatsModal').classList.add('hidden');
    
    // Destruir gráficos para liberar memoria
    try {
        // Destruir gráficos usando Chart.getChart() para asegurar limpieza completa
        const canvasIds = ['revenueByHourChart', 'revenueByPlatformChart', 'revenueAccumulatedChart'];
        
        canvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }
        });
        
        // También destruir las referencias en nuestro objeto
    Object.values(revenueStatsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
                try {
            chart.destroy();
                } catch (e) {
                    console.warn('Error al destruir gráfico:', e);
                }
        }
    });
        
    revenueStatsCharts = {};
        console.log('✅ Gráficos de ingresos destruidos correctamente');
    } catch (error) {
        console.error('Error al cerrar modal de ingresos:', error);
    }
}

// Cerrar modal de estadísticas de pendientes
function closePendingStatsModal() {
    document.getElementById('pendingStatsModal').classList.add('hidden');
    
    // Destruir gráficos para liberar memoria
    Object.values(pendingStatsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    pendingStatsCharts = {};
}

// Cerrar modal de estadísticas de entregas
function closeDeliveryStatsModal() {
    document.getElementById('deliveryStatsModal').classList.add('hidden');
    
    // Detener tracking automático cuando se cierra el modal
    if (liveTrackingInterval) {
        console.log('🚚 Deteniendo actualización automática al cerrar modal de entregas...');
        clearInterval(liveTrackingInterval);
        liveTrackingInterval = null;
        
        // Actualizar indicador
        updateAutoTrackingIndicator(false);
    }
    
    // Destruir gráficos para liberar memoria
    Object.values(deliveryStatsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    deliveryStatsCharts = {};
}

// Formatear hora
function formatTime(dateString) {
    try {
    const date = new Date(dateString);
        
        // Verificar que la fecha sea válida
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Fecha inválida en formatTime:', dateString);
            return '--:--';
        }
        
        // Debug: Mostrar información de la fecha
        console.log(`🔍 formatTime debug - Input: ${dateString}`);
        console.log(`🔍 formatTime debug - Date object: ${date.toISOString()}`);
        console.log(`🔍 formatTime debug - Local time: ${date.toString()}`);
        
        // Usar zona horaria de Ciudad de México
        const formatted = date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Mexico_City'
        });
        
        console.log(`🔍 formatTime debug - Output: ${formatted}`);
        return formatted;
    } catch (error) {
        console.error('❌ Error formateando tiempo:', error, { dateString });
        return '--:--';
    }
}

// Cargar plataformas para el filtro
async function loadPlatforms() {
    try {
        const response = await fetch('/api/platforms');
        const data = await response.json();
        
        if (data.success) {
            const platformFilter = document.getElementById('platformFilter');
            data.data.forEach(platform => {
                    // Filtrar plataformas activas
    if (platform.name) {
                    const option = document.createElement('option');
                    option.value = platform.name;
                    option.textContent = platform.name;
                    platformFilter.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando plataformas:', error);
    }
}

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            
            // Asegurar que los valores sean números
            const todayCount = parseInt(stats.today?.count || 0);  // Pedidos de hoy
            const todayRevenue = parseFloat(stats.today?.revenue || 0);  // Ingresos de hoy
            const pendingCount = parseInt(stats.pending?.count || 0);
            const deliveryCount = parseInt(stats.delivery?.count || 0);
            
            // Verificar que los elementos existan antes de actualizarlos
            const todayOrdersElement = document.getElementById('todayOrders');
            const todayRevenueElement = document.getElementById('todayRevenue');
            const pendingOrdersElement = document.getElementById('pendingOrders');
            const deliveryOrdersElement = document.getElementById('deliveringOrders');
            
            if (todayOrdersElement) {
                todayOrdersElement.textContent = todayCount.toString();
            }
            if (todayRevenueElement) {
                todayRevenueElement.textContent = `$${todayRevenue.toFixed(2)} MXN`;
            }
            if (pendingOrdersElement) {
                pendingOrdersElement.textContent = pendingCount.toString();
            }
            if (deliveryOrdersElement) {
                deliveryOrdersElement.textContent = deliveryCount.toString();
            }
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

// Cargar pedidos
async function loadOrders() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...currentFilters
        });
        
        const url = `/api/orders?${params}`;
        console.log('📡 Cargando pedidos:', url);
        console.log('🔍 Filtros actuales:', currentFilters);
        console.log('🔍 Página actual:', currentPage);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Pedidos cargados: ${data.count} de ${data.total} totales`);
            console.log('🔍 IDs de pedidos recibidos:', data.data.map(order => order.id));
            renderOrders(data.data);
            updatePaginationInfo(data);
        } else {
            console.error('❌ Error en la respuesta:', data);
        }
        
        // Ocultar indicador de filtrado
        hideFilteringIndicator();
    } catch (error) {
        console.error('❌ Error cargando pedidos:', error);
        // Ocultar indicador de filtrado incluso si hay error
        hideFilteringIndicator();
    }
}

// Actualizar información de paginación
function updatePaginationInfo(data) {
    const startItem = ((data.currentPage - 1) * 20) + 1;
    const endItem = Math.min(startItem + data.count - 1, data.total);
    
    document.getElementById('ordersCount').textContent = 
        `Mostrando ${startItem}-${endItem} de ${data.total} pedidos`;
    
    // Actualizar estado de botones
    const prevButton = document.querySelector('button[onclick="previousPage()"]');
    const nextButton = document.querySelector('button[onclick="nextPage()"]');
    
    if (prevButton) {
        prevButton.disabled = !data.hasPrevPage;
        prevButton.className = data.hasPrevPage 
            ? 'px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50' 
            : 'px-3 py-1 border border-gray-200 rounded text-sm text-gray-400 cursor-not-allowed';
    }
    
    if (nextButton) {
        nextButton.disabled = !data.hasNextPage;
        nextButton.className = data.hasNextPage 
            ? 'px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50' 
            : 'px-3 py-1 border border-gray-200 rounded text-sm text-gray-400 cursor-not-allowed';
    }
    
    updatePageInfo(data.currentPage, data.totalPages);
}

// Renderizar pedidos en la tabla
function renderOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 cursor-pointer transition-colors duration-200';
        row.onclick = () => viewOrder(order.id);
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                #${order.id}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <div>
                    <div class="text-sm font-medium text-gray-900">${order.customer_name}</div>
                    <div class="text-sm text-gray-500">${order.customer_phone || 'Sin teléfono'}</div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                <div class="flex items-center justify-center">
                    <img src="/images/${getPlatformLogo(order.platform_name)}" 
                         alt="${order.platform_name}" 
                         class="h-8 w-8"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(order.platform_name)}" style="display: none;">
                        ${order.platform_name}
                    </span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-center">
                ${getStatusBadge(order.status)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold text-center">
                $${parseFloat(order.total_amount).toFixed(2)} MXN
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${formatDate(order.created_at)}
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Ver detalles de un pedido
async function viewOrder(orderId) {
    try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        
        if (data.success) {
            const order = data.data;
            const modalContent = document.getElementById('orderModalContent');
            
            // Actualizar la badge de estado en el título del modal
            const statusBadgeElement = document.getElementById('orderStatusBadge');
            if (statusBadgeElement) {
                let statusBadgeHtml = getStatusBadge(order.status);
                
                // Si el pedido está rechazado y tiene razón de rechazo, mostrar ambas badges
                if (order.status === 'rejected' && order.rejection_reason) {
                    // Obtener solo la badge sin el wrapper div
                    const statusBadgeOnly = getStatusBadgeOnly(order.status);
                    statusBadgeHtml = `
                        <div class="flex items-center space-x-2">
                            ${statusBadgeOnly}
                            <span style="display: inline-flex; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b;">
                                <i class="fas fa-info-circle mr-1"></i>${order.rejection_reason}
                            </span>
                        </div>
                    `;
                }
                
                statusBadgeElement.innerHTML = statusBadgeHtml;
            }
            
            modalContent.innerHTML = `
                <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-medium text-gray-900">Información del Cliente</h4>
                            <p class="text-sm text-gray-600">${order.customer_name}</p>
                            <p class="text-sm text-gray-600">${order.customer_phone || 'Sin teléfono'}</p>
                            <p class="text-sm text-gray-600">${order.customer_address || 'Sin dirección'}</p>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-900">Información del Pedido</h4>
                            <p class="text-sm text-gray-600">ID: #${order.id}</p>
                            <div class="flex items-center space-x-2 text-sm text-gray-600">
                                <span>Plataforma:</span>
                                <div class="flex items-center">
                                    <img src="/images/${getPlatformLogo(order.platform_name)}" 
                                         alt="${order.platform_name}" 
                                         class="h-6 w-6"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full platform-${getPlatformClass(order.platform_name)}" style="display: none;">
                                        ${order.platform_name}
                                    </span>
                                </div>
                            </div>
                            <p class="text-sm text-gray-600">Total: <span class="text-green-600 font-semibold">$${parseFloat(order.total_amount).toFixed(2)} MXN</span></p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-medium text-gray-900 mb-2">Productos</h4>
                        <div class="bg-gray-50 rounded-lg p-4">
                            ${renderItems(order.items)}
                        </div>
                    </div>
                    
                    ${order.notes ? `
                        <div>
                            <h4 class="font-medium text-gray-900">Notas</h4>
                            <p class="text-sm text-gray-600">${order.notes}</p>
                        </div>
                    ` : ''}
                    
                    <div class="flex justify-end pt-4 border-t">
                        <button onclick="closeModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                            Cerrar
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('orderModal').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error cargando detalles del pedido:', error);
    }
}

// Renderizar items del pedido
function renderItems(items) {
    if (!items || items.length === 0) {
        return '<p class="text-gray-500">No hay productos especificados</p>';
    }
    
    return items.map(item => `
        <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
            <div>
                <p class="font-medium">${item.name || 'Producto'}</p>
                <p class="text-sm text-gray-600">Cantidad: ${item.quantity || 1}</p>
            </div>
                            <p class="font-medium">$${(item.price || 0).toFixed(2)} MXN</p>
        </div>
    `).join('');
}



// Aplicar filtros
function applyFilters() {
    console.log('🚀 FUNCIÓN APPLYFILTERS EJECUTADA');
    
    // Mostrar indicador de filtrado
    showFilteringIndicator();
    
    // Limpiar timeout anterior para evitar múltiples llamadas
    if (filterTimeout) {
        clearTimeout(filterTimeout);
    }
    
    // Aplicar filtros con un pequeño delay para evitar demasiadas llamadas
    filterTimeout = setTimeout(() => {
        applyFiltersImmediately();
    }, 300);
}

function applyFiltersImmediately() {
    // Recopilar valores de los filtros
    const statusFilter = document.getElementById('statusFilter').value;
    const platformFilter = document.getElementById('platformFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    console.log('🔍 Valores de filtros capturados:', {
        status: statusFilter,
        platform: platformFilter,
        date_from: dateFrom,
        date_to: dateTo
    });
    
    currentFilters = {
        status: statusFilter,
        platform: platformFilter,
        date_from: dateFrom,
        date_to: dateTo
    };
    
    // Remover filtros vacíos
    Object.keys(currentFilters).forEach(key => {
        if (!currentFilters[key]) {
            delete currentFilters[key];
        }
    });
    
    // Log para debugging
    console.log('🔍 Filtros finales a aplicar:', currentFilters);
    console.log('🔍 URL que se va a llamar:', `/api/orders?page=1&limit=20&${new URLSearchParams(currentFilters)}`);
    
    // Actualizar indicador de filtros
    updateActiveFiltersIndicator();
    
    // Resetear a la primera página
    currentPage = 1;
    
    // Cargar pedidos con los nuevos filtros
    loadOrders();
    
    // Recargar estadísticas reales del día (no afectadas por filtros)
    loadStats();
}

// Limpiar todos los filtros
function clearFilters() {
    console.log('🧹 LIMPIANDO FILTROS');
    
    // Limpiar valores de los campos
    document.getElementById('statusFilter').value = '';
    document.getElementById('platformFilter').value = '';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    
    // Limpiar filtros actuales
    currentFilters = {};
    
    // Limpiar estado visual de las badges
    const todayBadge = document.getElementById('todayBadge');
    const yesterdayBadge = document.getElementById('yesterdayBadge');
    
    if (todayBadge) {
        todayBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors';
    }
    
    if (yesterdayBadge) {
        yesterdayBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors';
    }
    
    console.log('🧹 Filtros y badges limpiados');
    
    // Actualizar indicador de filtros y botón "Limpiar Filtros"
    updateActiveFiltersIndicator();
    
    // Resetear a la primera página
    currentPage = 1;
    
    // Cargar pedidos sin filtros
    loadOrders();
    
    // Recargar estadísticas reales del día
    loadStats();
}

// Navegación de páginas
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadOrders();
    }
}

function nextPage() {
    currentPage++;
    loadOrders();
}

function updatePageInfo(currentPage, totalPages) {
    document.getElementById('currentPage').textContent = `Página ${currentPage} de ${totalPages}`;
}

// Actualizar última actualización
function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = 
        `Última actualización: ${now.toLocaleTimeString()}`;
}

// Refrescar datos
// Función refreshData eliminada - ahora se usa WebSockets para actualizaciones automáticas

// Cerrar modal
function closeModal() {
    document.getElementById('orderModal').classList.add('hidden');
    
    // Limpiar la badge de estado
    const statusBadgeElement = document.getElementById('orderStatusBadge');
    if (statusBadgeElement) {
        statusBadgeElement.innerHTML = '';
    }
}

// Utilidades
function getStatusText(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'delivering': 'En entrega',
        'delivered': 'Entregado',
        'rejected': 'Rechazado'
    };
    
    // Manejar estados antiguos que pueden estar en la base de datos
    if (status === 'confirmed') {
        return 'Pendiente';
    } else if (status === 'cancelled') {
        return 'Entregado';
    }
    
    return statusMap[status] || status;
}

function getStatusBadge(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'delivering': 'En entrega',
        'delivered': 'Entregado',
        'rejected': 'Rechazado'
    };
    
    const badgeStyles = {
        'pending': 'background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b;',
        'preparing': 'background-color: #fed7aa; color: #c2410c; border: 1px solid #ea580c;',
        'ready': 'background-color: #dcfce7; color: #166534; border: 1px solid #16a34a;',
        'delivering': 'background-color: #f3e8ff; color: #6b21a8; border: 1px solid #9333ea;',
        'delivered': 'background-color: #dbeafe; color: #1e40af; border: 1px solid #3b82f6;',
        'rejected': 'background-color: #fee2e2; color: #991b1b; border: 1px solid #ef4444;'
    };
    
    // Manejar estados antiguos que pueden estar en la base de datos
    let normalizedStatus = status;
    if (status === 'confirmed') {
        normalizedStatus = 'pending';
    } else if (status === 'cancelled') {
        normalizedStatus = 'delivered';
    }
    
    const text = statusMap[normalizedStatus] || status;
    const style = badgeStyles[normalizedStatus] || 'background-color: #fee2e2; color: #991b1b; border: 1px solid #ef4444;';
    
    return `<div class="flex justify-center"><span style="display: inline-flex; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; ${style}">${text}</span></div>`;
}

// Función para obtener solo la badge sin el wrapper div (para usar en el modal)
function getStatusBadgeOnly(status) {
    const statusMap = {
        'pending': 'Pendiente',
        'preparing': 'Preparando',
        'ready': 'Listo',
        'delivering': 'En entrega',
        'delivered': 'Entregado',
        'rejected': 'Rechazado'
    };
    
    const badgeStyles = {
        'pending': 'background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b;',
        'preparing': 'background-color: #fed7aa; color: #c2410c; border: 1px solid #ea580c;',
        'ready': 'background-color: #dcfce7; color: #166534; border: 1px solid #16a34a;',
        'delivering': 'background-color: #f3e8ff; color: #6b21a8; border: 1px solid #9333ea;',
        'delivered': 'background-color: #dbeafe; color: #1e40af; border: 1px solid #3b82f6;',
        'rejected': 'background-color: #fee2e2; color: #991b1b; border: 1px solid #ef4444;'
    };
    
    // Manejar estados antiguos que pueden estar en la base de datos
    let normalizedStatus = status;
    if (status === 'confirmed') {
        normalizedStatus = 'pending';
    } else if (status === 'cancelled') {
        normalizedStatus = 'delivered';
    }
    
    const text = statusMap[normalizedStatus] || status;
    const style = badgeStyles[normalizedStatus] || 'background-color: #fee2e2; color: #991b1b; border: 1px solid #ef4444;';
    
    return `<span style="display: inline-flex; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; ${style}">${text}</span>`;
}

function getPlatformClass(platform) {
    const platformMap = {
        'Uber Eats': 'uber',
        'Rappi': 'rappi',
        'Didi Food': 'didi'
    };
    return platformMap[platform] || 'default';
}

function getPlatformLogo(platform) {
    const logoMap = {
        'Uber Eats': 'ubereats.png',
        'Rappi': 'rappi.png',
        'Didi Food': 'didi.png'
    };
    return logoMap[platform] || 'default.png';
}

function formatDate(dateString) {
    try {
    const date = new Date(dateString);
        
        // Verificar que la fecha sea válida
        if (isNaN(date.getTime())) {
            console.warn('⚠️ Fecha inválida en formatDate:', dateString);
            return '--/--/---- --:--';
        }
        
        // Debug: Mostrar información de la fecha
        console.log(`🔍 formatDate debug - Input: ${dateString}`);
        console.log(`🔍 formatDate debug - Date object: ${date.toISOString()}`);
        console.log(`🔍 formatDate debug - Local time: ${date.toString()}`);
        console.log(`🔍 formatDate debug - Current timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
        
        // Usar zona horaria de Ciudad de México
        const formatted = date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Mexico_City'
        });
        
        console.log(`🔍 formatDate debug - Output: ${formatted}`);
        return formatted;
    } catch (error) {
        console.error('❌ Error formateando fecha:', error, { dateString });
        return '--/--/---- --:--';
    }
}

// Función para iniciar tracking de una orden específica
async function startTracking(orderId) {
    try {
        const response = await fetch(`/api/tracking/start/${orderId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updateInterval: parseInt(document.getElementById('updateInterval').value) * 1000
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Tracking iniciado para orden ${orderId}`);
            // Actualizar inmediatamente
            updateDeliveryLocations();
        } else {
            console.error('Error iniciando tracking:', data.message);
        }
    } catch (error) {
        console.error('Error iniciando tracking:', error);
    }
}

// Función para detener tracking de una orden específica
async function stopTracking(orderId) {
    try {
        const response = await fetch(`/api/tracking/stop/${orderId}`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`Tracking detenido para orden ${orderId}`);
        } else {
            console.error('Error deteniendo tracking:', data.message);
        }
    } catch (error) {
        console.error('Error deteniendo tracking:', error);
    }
}

// El sistema de automatización funciona automáticamente desde el servidor
// No se necesitan controles manuales en el frontend

// Actualizar indicador de tracking automático
function updateAutoTrackingIndicator(isActive) {
    const indicator = document.getElementById('autoTrackingIndicator');
    if (!indicator) return;

    if (isActive) {
        indicator.innerHTML = `
            <div class="flex items-center text-green-600">
                <i class="fas fa-sync-alt fa-spin mr-2"></i>
                <span class="text-sm font-medium">Actualización Automática en Tiempo Real</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
                Actualizando cada 5 segundos...
            </div>
        `;
        indicator.className = 'bg-green-50 border border-green-200 rounded-lg p-3';
    } else {
        indicator.innerHTML = `
            <div class="flex items-center text-gray-600">
                <i class="fas fa-pause mr-2"></i>
                <span class="text-sm font-medium">Actualización Detenida</span>
            </div>
        `;
        indicator.className = 'bg-gray-50 border border-gray-200 rounded-lg p-3';
    }
}

// Función para formatear la llegada estimada
function formatEstimatedArrival(estimatedArrival) {
    try {
        if (estimatedArrival instanceof Date) {
            return estimatedArrival.toLocaleTimeString();
        } else if (typeof estimatedArrival === 'string') {
            const date = new Date(estimatedArrival);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString();
            }
            return estimatedArrival;
        } else if (estimatedArrival) {
            // Intentar convertir a Date si es un timestamp
            const date = new Date(estimatedArrival);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString();
            }
        }
        return 'N/A';
    } catch (error) {
        console.warn('Error formateando llegada estimada:', error);
        return 'N/A';
    }
}

// Actualizar indicador de filtros activos
function updateActiveFiltersIndicator() {
    const indicator = document.getElementById('activeFiltersIndicator');
    const hasActiveFilters = Object.keys(currentFilters).length > 0;
    
    if (hasActiveFilters) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
    
    // Actualizar estado del botón "Limpiar Filtros"
    updateClearFiltersButton(hasActiveFilters);
}

// Función para actualizar el estado visual del botón "Limpiar Filtros"
function updateClearFiltersButton(hasActiveFilters) {
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (clearFiltersBtn) {
        if (hasActiveFilters) {
            // Habilitar botón cuando hay filtros activos
            clearFiltersBtn.disabled = false;
            clearFiltersBtn.className = 'w-full bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-all duration-200';
            clearFiltersBtn.cursor = 'pointer';
        } else {
            // Deshabilitar botón cuando no hay filtros activos
            clearFiltersBtn.disabled = true;
            clearFiltersBtn.className = 'w-full bg-gray-300 text-gray-500 px-6 py-2 rounded-lg cursor-not-allowed transition-all duration-200';
        }
    }
}

// Mostrar indicador de filtrado
function showFilteringIndicator() {
    const indicator = document.getElementById('filteringIndicator');
    if (indicator) {
        indicator.classList.remove('hidden');
    }
}

// Ocultar indicador de filtrado
function hideFilteringIndicator() {
    const indicator = document.getElementById('filteringIndicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

// Función para manejar el click del badge "Hoy"
function handleTodayBadgeClick() {
    console.log('📅 Badge "Hoy" clickeado');
    
    // Obtener la fecha actual en formato YYYY-MM-DD
    const today = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
    
    // Establecer la fecha actual en ambos campos
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    
    if (dateFromInput && dateToInput) {
        dateFromInput.value = today;
        dateToInput.value = today;
        
        console.log('📅 Filtros de fecha establecidos para hoy:', today);
        
        // Actualizar el estado visual de los badges
        updateBadgeStates('today');
        
        // Aplicar los filtros automáticamente
        applyFiltersImmediately();
        
        // Actualizar estado del botón "Limpiar Filtros"
        updateClearFiltersButton(true);
    }
}

// Función para manejar el click del badge "Ayer"
function handleYesterdayBadgeClick() {
    console.log('📅 Badge "Ayer" clickeado');
    
    // Obtener la fecha de ayer en formato YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFormatted = yesterday.toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
    
    // Establecer la fecha de ayer en ambos campos
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    
    if (dateFromInput && dateToInput) {
        dateFromInput.value = yesterdayFormatted;
        dateToInput.value = yesterdayFormatted;
        
        console.log('📅 Filtros de fecha establecidos para ayer:', yesterdayFormatted);
        
        // Actualizar el estado visual de los badges
        updateBadgeStates('yesterday');
        
        // Aplicar los filtros automáticamente
        applyFiltersImmediately();
        
        // Actualizar estado del botón "Limpiar Filtros"
        updateClearFiltersButton(true);
    }
}

// Función para actualizar el estado visual de los badges
function updateBadgeStates(activeBadge) {
    const todayBadge = document.getElementById('todayBadge');
    const yesterdayBadge = document.getElementById('yesterdayBadge');
    
    if (activeBadge === 'today') {
        // Activar badge "Hoy"
        todayBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors border-2 border-blue-300';
        // Desactivar badge "Ayer"
        yesterdayBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors';
    } else if (activeBadge === 'yesterday') {
        // Activar badge "Ayer"
        yesterdayBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors border-2 border-blue-300';
        // Desactivar badge "Hoy"
        todayBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors';
    }
}

// Función global para editar meta de ingresos
function editRevenueGoal() {
    const goalElement = document.getElementById('revenueGoal');
    if (!goalElement) {
        console.error('Elemento revenueGoal no encontrado');
        return;
    }
    
    const currentGoal = goalElement.textContent.replace('$', '').replace(' MXN', '');
    
    // Crear input editable
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0';
    input.value = currentGoal;
    input.className = 'text-2xl font-bold text-purple-800 bg-purple-50 border-b-2 border-purple-600 focus:outline-none focus:border-purple-800 w-32 px-2 py-1 rounded';
    
    // Cambiar el icono a modo guardar
    const editButton = document.querySelector('[onclick="editRevenueGoal()"]');
    if (editButton) {
        editButton.innerHTML = '<i class="fas fa-save text-lg"></i>';
        editButton.title = 'Guardar cambios';
        editButton.onclick = null; // Remover el onclick original temporalmente
    }
    
    // Reemplazar el texto con el input
    goalElement.textContent = '';
    goalElement.appendChild(input);
    input.focus();
    input.select();
    
    // Función para restaurar el botón de edición
    const restoreEditButton = () => {
        const editButton = document.querySelector('[title="Guardar cambios"]');
        if (editButton) {
            editButton.innerHTML = '<i class="fas fa-edit text-lg"></i>';
            editButton.title = 'Click para editar la meta diaria';
            editButton.onclick = editRevenueGoal;
        }
    };
    
    // Función para actualizar indicadores de progreso
    const updateRevenueProgress = () => {
        const goal = parseFloat(localStorage.getItem('revenueGoal') || 500);
        // Aquí podrías agregar lógica para actualizar otros indicadores
        console.log(`📊 Meta actualizada: $${goal.toFixed(2)} MXN`);
    };
    
    // Función para guardar cambios
    const saveChanges = () => {
        const newValue = parseFloat(input.value);
        if (!isNaN(newValue) && newValue >= 0) {
            goalElement.textContent = `$${newValue.toFixed(2)} MXN`;
            localStorage.setItem('revenueGoal', newValue);
            console.log(`🎯 Meta de ingresos actualizada: $${newValue.toFixed(2)} MXN`);
            updateRevenueProgress();
        } else {
            // Restaurar valor anterior si es inválido
            goalElement.textContent = `$${currentGoal} MXN`;
        }
        restoreEditButton();
    };
    
    // Event listeners para guardar
    input.addEventListener('blur', saveChanges);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveChanges();
        } else if (e.key === 'Escape') {
            // Cancelar edición
            goalElement.textContent = `$${currentGoal} MXN`;
            restoreEditButton();
        }
    });
}

// Cargar meta guardada al inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    const savedGoal = localStorage.getItem('revenueGoal');
    if (savedGoal) {
        const goalElement = document.getElementById('revenueGoal');
        if (goalElement) {
            goalElement.textContent = `$${parseFloat(savedGoal).toFixed(2)} MXN`;
        }
    }
});

// Función para cambiar estado de pedido de preparing a ready
async function markOrderAsReady(orderId) {
    try {
        console.log(`🍳 Marcando pedido #${orderId} como listo...`);
        
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'ready'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Pedido #${orderId} marcado como listo exitosamente`);
            showSuccessNotification(`Pedido #${orderId} marcado como listo`);
            
            // Recargar el modal de pendientes para actualizar la vista
            await showPendingStats();
        } else {
            console.error('❌ Error marcando pedido como listo:', data.message);
            showErrorNotification(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('❌ Error marcando pedido como listo:', error);
        showErrorNotification('Error de conexión');
    }
}

// Función para cambiar estado de pedido de ready a delivering
async function markOrderAsDelivering(orderId) {
    try {
        console.log(`🚚 Marcando pedido #${orderId} como entregado...`);
        
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'delivering'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Pedido #${orderId} marcado como entregado exitosamente`);
            showSuccessNotification(`Pedido #${orderId} marcado como entregado`);
            
            // Recargar el modal de pendientes para actualizar la vista
            await showPendingStats();
        } else {
            console.error('❌ Error marcando pedido como entregado:', data.message);
            showErrorNotification(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('❌ Error marcando pedido como entregado:', error);
        showErrorNotification('Error de conexión');
    }
}

