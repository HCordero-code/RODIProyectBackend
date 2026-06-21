// services/geolocation.service.js

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud punto 1
 * @param {number} lon1 - Longitud punto 1
 * @param {number} lat2 - Latitud punto 2
 * @param {number} lon2 - Longitud punto 2
 * @returns {number} Distancia en kilómetros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (
        typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
        typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
    ) return Infinity;
    
    
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

/**
 * Calcula la distancia en metros
 */
export const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    return calculateDistance(lat1, lon1, lat2, lon2) * 1000;
};

/**
 * Verifica si un punto está dentro del radio de otro punto
 */
export const isWithinRadius = (lat1, lon1, lat2, lon2, radiusKm) => {
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radiusKm;
};

/**
 * Filtra misiones por proximidad geográfica (para colaboradores)
 * @param {Array} missions - Array de misiones
 * @param {number} userLat - Latitud del colaborador
 * @param {number} userLng - Longitud del colaborador
 * @param {number} maxRadius - Radio máximo en km
 * @returns {Array} Misiones filtradas con distancia agregada
 */
export const filterMissionsByProximity = (missions, userLat, userLng, maxRadius = 10) => {
    if (!userLat || !userLng) return missions;
    
    return missions
        .map(mission => {
            const missionObj = mission.toObject ? mission.toObject() : mission;
            return {
                ...missionObj,
                distance: calculateDistance(userLat, userLng, mission.lat, mission.lng),
                distanceMeters: calculateDistanceInMeters(userLat, userLng, mission.lat, mission.lng)
            };
        })
        .filter(mission => mission.distance <= maxRadius)
        .sort((a, b) => a.distance - b.distance);
};

/**
 * Calcula la distancia desde un colaborador a una misión
 */
export const getDistanceToMission = (collaboratorLat, collaboratorLng, missionLat, missionLng) => {
    return {
        distanceKm: calculateDistance(collaboratorLat, collaboratorLng, missionLat, missionLng),
        distanceMeters: calculateDistanceInMeters(collaboratorLat, collaboratorLng, missionLat, missionLng),
        isWithinRadius: isWithinRadius(collaboratorLat, collaboratorLng, missionLat, missionLng, 1)
    };
};

/**
 * Valida coordenadas geográficas
 */
export const isValidCoordinates = (lat, lng) => {
    return lat !== undefined && lng !== undefined &&
           typeof lat === 'number' && typeof lng === 'number' &&
           !isNaN(lat) && !isNaN(lng) &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180;
};