const axios = require('axios');

class RouteService {
    constructor() {
        // OpenRouteService API (gratis, sin API key requerida)
        this.baseUrl = 'https://api.openrouteservice.org/v2/directions';
        this.apiKey = process.env.OPENROUTE_API_KEY || ''; // Opcional para más requests
    }

    // Obtener ruta entre dos puntos
    async getRoute(startLat, startLng, endLat, endLng, profile = 'driving-car') {
        try {
            // Si no hay API key, usar ruta simulada
            if (!this.apiKey) {
                console.log('🔑 No hay API key de OpenRouteService, usando ruta simulada');
                return this.getSimulatedRoute(startLat, startLng, endLat, endLng);
            }

            const coordinates = [
                [startLng, startLat], // OpenRouteService usa [lng, lat]
                [endLng, endLat]
            ];

            const requestBody = {
                coordinates: coordinates,
                profile: profile, // driving-car, cycling-regular, foot-walking
                format: 'geojson',
                preference: 'fastest', // fastest, shortest, recommended
                units: 'km'
            };

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            // Agregar API key si está disponible
            if (this.apiKey) {
                headers['Authorization'] = this.apiKey;
            }

            const response = await axios.post(
                `${this.baseUrl}/${profile}/geojson`,
                requestBody,
                { headers }
            );

            if (response.data && response.data.features && response.data.features.length > 0) {
                const route = response.data.features[0];
                return {
                    coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]), // Convertir a [lat, lng]
                    distance: route.properties.summary.distance / 1000, // km
                    duration: route.properties.summary.duration / 60, // minutos
                    geometry: route.geometry
                };
            }

            return null;
        } catch (error) {
            console.error('Error obteniendo ruta:', error.message);
            
            // Fallback: ruta simulada si falla la API
            return this.getSimulatedRoute(startLat, startLng, endLat, endLng);
        }
    }

    // Ruta simulada más realista
    getSimulatedRoute(startLat, startLng, endLat, endLng) {
        const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
        const duration = distance * 2.5; // Estimación más realista: 2.5 min por km
        
        // Crear puntos intermedios para simular una ruta más realista
        const numPoints = Math.max(3, Math.floor(distance * 10)); // Más puntos para distancias mayores
        const coordinates = [];
        
        for (let i = 0; i <= numPoints; i++) {
            const ratio = i / numPoints;
            const lat = startLat + (endLat - startLat) * ratio + (Math.random() - 0.5) * 0.001; // Pequeña variación
            const lng = startLng + (endLng - startLng) * ratio + (Math.random() - 0.5) * 0.001; // Pequeña variación
            coordinates.push([lat, lng]);
        }
        
        return {
            coordinates: coordinates,
            distance: distance,
            duration: duration,
            geometry: {
                type: 'LineString',
                coordinates: coordinates.map(coord => [coord[1], coord[0]]) // Convertir a [lng, lat] para GeoJSON
            }
        };
    }

    // Ruta recta como fallback
    getStraightRoute(startLat, startLng, endLat, endLng) {
        const distance = this.calculateDistance(startLat, startLng, endLat, endLng);
        const duration = distance * 2; // Estimación: 2 min por km
        
        return {
            coordinates: [
                [startLat, startLng],
                [endLat, endLng]
            ],
            distance: distance,
            duration: duration,
            geometry: {
                type: 'LineString',
                coordinates: [[startLng, startLat], [endLng, endLat]]
            }
        };
    }

    // Calcular distancia entre dos puntos (fórmula de Haversine)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // Obtener ruta con múltiples waypoints (para repartidor → cliente)
    async getDeliveryRoute(restaurantLat, restaurantLng, driverLat, driverLng, customerLat, customerLng) {
        try {
            // Primero: ruta del repartidor al restaurante
            const driverToRestaurant = await this.getRoute(driverLat, driverLng, restaurantLat, restaurantLng);
            
            // Segundo: ruta del restaurante al cliente
            const restaurantToCustomer = await this.getRoute(restaurantLat, restaurantLng, customerLat, customerLng);
            
            return {
                driverToRestaurant,
                restaurantToCustomer,
                totalDistance: (driverToRestaurant.distance + restaurantToCustomer.distance),
                totalDuration: (driverToRestaurant.duration + restaurantToCustomer.duration)
            };
        } catch (error) {
            console.error('Error obteniendo ruta de entrega:', error);
            return null;
        }
    }

    // Obtener ruta optimizada para múltiples entregas
    async getOptimizedRoute(restaurantLat, restaurantLng, deliveries) {
        try {
            const routes = [];
            let totalDistance = 0;
            let totalDuration = 0;

            for (const delivery of deliveries) {
                const route = await this.getRoute(restaurantLat, restaurantLng, delivery.lat, delivery.lng);
                if (route) {
                    routes.push({
                        delivery: delivery,
                        route: route
                    });
                    totalDistance += route.distance;
                    totalDuration += route.duration;
                }
            }

            return {
                routes,
                totalDistance,
                totalDuration
            };
        } catch (error) {
            console.error('Error obteniendo rutas optimizadas:', error);
            return null;
        }
    }
}

module.exports = new RouteService();