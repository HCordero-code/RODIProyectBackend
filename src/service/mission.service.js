// services/mission.service.js
import Mission from '../models/mission.model.js';
import MissionAssignment from '../models/missionAssignment.model.js';
import { isWithinRadius, calculateDistance } from './geolocation.service.js';

/**
 * Verifica si una misión está disponible para ser aceptada
 */
export const isMissionAvailable = (mission) => {
    if (!mission) return false;
    if (mission.status !== 'PENDING') return false;
    if (mission.expiresAt && new Date(mission.expiresAt) < new Date()) return false;
    return true;
};

/**
 * Verifica si un colaborador puede aceptar una misión
 */
export const canAcceptMission = async (collaboratorId) => {
    const activeMission = await MissionAssignment.findOne({
        collaboratorProfileId: collaboratorId,
        status: { $in: ['ACCEPTED', 'IN_PROGRESS'] }
    });
    return !activeMission;
};

/**
 * Obtiene el estado actual de una misión con toda su información
 */
export const getMissionFullDetails = async (missionId) => {
    const mission = await Mission.findById(missionId)
        .populate('companyId', 'legalName isVerified');
    
    if (!mission) return null;

    const assignment = await MissionAssignment.findOne({ missionId: mission._id });
    const evidence = await Evidence.find({ missionId: mission._id });
    const rating = await Rating.findOne({ missionId: mission._id });

    return {
        mission,
        assignment,
        evidence,
        rating
    };
};

/**
 * Valida que la evidencia esté dentro del radio de la misión
 */
export const validateEvidenceLocation = (mission, capturedLat, capturedLng) => {
    const distance = calculateDistance(
        capturedLat, capturedLng,
        mission.lat, mission.lng
    );
    
    return {
        isWithinRadius: distance <= mission.searchRadiusKm,
        distanceFromTargetM: distance * 1000,
        distanceKm: distance
    };
};

/**
 * Genera query para misiones cercanas (para uso con MongoDB $geoNear)
 * @returns {Object} Pipeline de agregación
 */
export const getNearbyMissionsPipeline = (lat, lng, radiusKm = 10, status = 'PENDING') => {
    return [
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [lng, lat] },
                distanceField: 'distance',
                maxDistance: radiusKm * 1000, // convertir a metros
                spherical: true
            }
        },
        { $match: { status, expiresAt: { $gt: new Date() } } },
        { $sort: { distance: 1, priority: 1 } }
    ];
};

/**
 * Actualiza estadísticas del colaborador después de completar misión
 */
export const updateCollaboratorStats = async (collaborator, earnedAmount) => {
    collaborator.totalMissionsCompleted += 1;
    collaborator.totalEarned += earnedAmount;
    await collaborator.save();
    return collaborator;
};