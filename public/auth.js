// Auth utilities para el dashboard
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    init() {
        // Verificar autenticación al cargar
        this.checkAuth();
        
        // Configurar interceptores para requests
        this.setupRequestInterceptors();
        
        // Configurar logout automático
        this.setupAutoLogout();
    }

    async checkAuth() {
        if (!this.token) {
            this.redirectToLogin();
            return false;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                this.logout();
                return false;
            }

            const data = await response.json();
            this.user = data.user;
            localStorage.setItem('user', JSON.stringify(this.user));
            
            // Mostrar información del usuario en la UI
            this.updateUserInfo();
            
            return true;
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            this.logout();
            return false;
        }
    }

    setupRequestInterceptors() {
        // Interceptar fetch requests para agregar token
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            if (this.token && url.startsWith('/api/')) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`
                };
            }
            return originalFetch(url, options);
        };
    }

    setupAutoLogout() {
        // Logout automático después de 24 horas (tiempo de expiración del token)
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        if (tokenExpiry) {
            const expiryTime = parseInt(tokenExpiry);
            const now = Date.now();
            const timeUntilExpiry = expiryTime - now;
            
            if (timeUntilExpiry > 0) {
                setTimeout(() => {
                    this.logout('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
                }, timeUntilExpiry);
            } else {
                this.logout('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            }
        }
    }

    updateUserInfo() {
        // Actualizar información del usuario en la UI
        const userInfoElements = document.querySelectorAll('.user-info');
        userInfoElements.forEach(element => {
            if (this.user) {
                element.textContent = `${this.user.username} (${this.user.role})`;
            }
        });

        // Mostrar/ocultar elementos basados en el rol
        this.updateRoleBasedElements();
    }

    updateRoleBasedElements() {
        if (!this.user) return;

        // Elementos que solo pueden ver administradores
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = this.user.role === 'admin' ? 'block' : 'none';
        });

        // Elementos que pueden ver administradores y gerentes
        const managerElements = document.querySelectorAll('.manager-only');
        managerElements.forEach(element => {
            element.style.display = ['admin', 'manager'].includes(this.user.role) ? 'block' : 'none';
        });
    }

    async logout(message = 'Sesión cerrada exitosamente') {
        try {
            // Llamar al endpoint de logout (opcional)
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('Error en logout:', error);
        }

        // Limpiar localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiry');

        // Mostrar mensaje y redirigir
        if (message) {
            alert(message);
        }
        
        this.redirectToLogin();
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }

    // Método para cambiar contraseña
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // Método para verificar permisos
    hasPermission(requiredRole) {
        if (!this.user) return false;
        
        const roleHierarchy = {
            'staff': 1,
            'manager': 2,
            'admin': 3
        };

        const userLevel = roleHierarchy[this.user.role] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;

        return userLevel >= requiredLevel;
    }

    // Método para obtener información del usuario actual
    getCurrentUser() {
        return this.user;
    }

    // Método para obtener el token
    getToken() {
        return this.token;
    }
}

// Crear instancia global
window.authManager = new AuthManager();

// Función helper para mostrar modal de cambio de contraseña
function showChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4">Cambiar Contraseña</h3>
            <form id="changePasswordForm">
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Contraseña Actual
                    </label>
                    <input 
                        type="password" 
                        id="currentPassword" 
                        required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Nueva Contraseña
                    </label>
                    <input 
                        type="password" 
                        id="newPassword" 
                        required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        minlength="6"
                    >
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Nueva Contraseña
                    </label>
                    <input 
                        type="password" 
                        id="confirmPassword" 
                        required 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        minlength="6"
                    >
                </div>
                <div class="flex justify-end space-x-3">
                    <button 
                        type="button" 
                        id="cancelChangePassword" 
                        class="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Cambiar Contraseña
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('cancelChangePassword').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('Las contraseñas nuevas no coinciden');
            return;
        }

        const result = await window.authManager.changePassword(currentPassword, newPassword);
        
        if (result.success) {
            alert('Contraseña cambiada exitosamente');
            document.body.removeChild(modal);
        } else {
            alert('Error: ' + result.message);
        }
    });
}

// Función helper para mostrar información del usuario
function showUserInfo() {
    const user = window.authManager.getCurrentUser();
    if (user) {
        alert(`Usuario: ${user.username}\nEmail: ${user.email}\nRol: ${user.role}`);
    }
}
