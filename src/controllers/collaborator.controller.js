// src/controllers/collaborator.controller.js
import Collaborator from '../models/collaborator.model.js';
import Mission from '../models/mission.model.js';
import MissionAssignment from '../models/missionAssignment.model.js';
import Evidence from '../models/evidence.model.js';
import Wallet from '../models/wallet.model.js';
import Notification from '../models/notification.model.js';
import { calculateDistance, filterMissionsByProximity, isValidCoordinates } from '../service/geolocation.service.js';
import { successResponse, errorResponse, notFoundResponse, badRequestResponse } from '../../utils/response.js';
import { uploadVideoToCloudinary } from '../service/cloudinary.service.js';

// Obtener perfil de colaborador
export const getCollaboratorProfile = async (req, res) => {
    try {
        const collaborator = await Collaborator.findOne({ userId: req.user.id });
        if (!collaborator) return notFoundResponse(res, 'Perfil de colaborador');
        return successResponse(res, collaborator);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Actualizar perfil de colaborador
export const updateCollaboratorProfile = async (req, res) => {
    try {
        const { isAvailable, currentLat, currentLng } = req.body;
        if (currentLat !== undefined && currentLng !== undefined) {
            if (!isValidCoordinates(currentLat, currentLng)) {
                return badRequestResponse(res, 'Coordenadas inválidas');
            }
        }
        const collaborator = await Collaborator.findOneAndUpdate(
            { userId: req.user.id },
            { 
                isAvailable: isAvailable !== undefined ? isAvailable : true,
                currentLat: currentLat || undefined,
                currentLng: currentLng || undefined
            },
            { new: true, upsert: true }
        );
        return successResponse(res, collaborator, 'Perfil actualizado');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Buscar misiones disponibles cerca
export const findNearbyMissions = async (req, res) => {
    try {
        const { lat, lng, radiusKm = 10 } = req.query;
        if (!lat || !lng) return badRequestResponse(res, 'Se requieren coordenadas (lat, lng)');
        if (!isValidCoordinates(parseFloat(lat), parseFloat(lng))) {
            return badRequestResponse(res, 'Coordenadas inválidas');
        }
        const missions = await Mission.find({
            status: 'PENDING',
            expiresAt: { $gt: new Date() }
        }).populate('companyId', 'legalName');
        const nearbyMissions = filterMissionsByProximity(missions, parseFloat(lat), parseFloat(lng), parseFloat(radiusKm));
        return successResponse(res, {
            total: nearbyMissions.length,
            missions: nearbyMissions,
            userLocation: { lat: parseFloat(lat), lng: parseFloat(lng) }
        });
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Aceptar misión
export const acceptMission = async (req, res) => {
    try {
        const { missionId, lat, lng } = req.body;
        if (!lat || !lng) return badRequestResponse(res, 'Se requieren coordenadas actuales (lat, lng)');
        const mission = await Mission.findOne({ id: missionId });
        if (!mission || mission.status !== 'PENDING') return badRequestResponse(res, 'Misión no disponible');
        if (mission.expiresAt < new Date()) return badRequestResponse(res, 'Misión expirada');
        const collaborator = await Collaborator.findOne({ userId: req.user.id });
        if (!collaborator || !collaborator.isAvailable) return badRequestResponse(res, 'No estás disponible');
        const distance = calculateDistance(lat, lng, mission.lat, mission.lng);
        const maxDistance = mission.searchRadiusKm || 10;
        if (distance > maxDistance) {
            return badRequestResponse(res, `Estás muy lejos de la misión. Distancia: ${distance.toFixed(2)}km. Máximo: ${maxDistance}km`);
        }
        const assignment = new MissionAssignment({
            missionId: mission._id,
            collaboratorProfileId: collaborator._id,
            acceptedLat: lat,
            acceptedLng: lng,
            status: 'ACCEPTED'
        });
        mission.status = 'ASSIGNED';
        await assignment.save();
        await mission.save();
        collaborator.currentLat = lat;
        collaborator.currentLng = lng;
        await collaborator.save();
        const notification = new Notification({
            userId: mission.companyId,
            missionId: mission._id,
            type: 'MISSION_ASSIGNED',
            title: 'Misión asignada',
            body: `Un colaborador ha aceptado tu misión: ${mission.title}`
        });
        await notification.save();
        return successResponse(res, { assignment, mission }, 'Misión aceptada', 201);
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Iniciar misión
export const startMission = async (req, res) => {
    try {
        const { missionId } = req.params;
        const collaborator = await Collaborator.findOne({ userId: req.user.id });
        if (!collaborator) return notFoundResponse(res, 'Perfil de colaborador');
        const mission = await Mission.findOne({ id: missionId });
        if (!mission) return notFoundResponse(res, 'Misión no encontrada');
        const assignment = await MissionAssignment.findOne({
            missionId: mission._id,
            collaboratorProfileId: collaborator._id,
            status: 'ACCEPTED'
        });
        if (!assignment) return badRequestResponse(res, 'No tienes una asignación aceptada para esta misión');
        assignment.status = 'IN_PROGRESS';
        await assignment.save();
        mission.status = 'IN_PROGRESS';
        await mission.save();
        return successResponse(res, { assignment, mission }, 'Misión iniciada');
    } catch (error) {
        return errorResponse(res, error.message);
    }
};

// Subir evidencia con Cloudinary
export const submitEvidence = async (req, res) => {
    try {
        console.log('📤 Recibiendo evidencia...');
        if (!req.file) return badRequestResponse(res, 'No se recibió ningún archivo de video');

        const { missionId, capturedLat, capturedLng, durationSec } = req.body;

        if (!missionId || !capturedLat || !capturedLng || !durationSec) {
            return badRequestResponse(res, 'Faltan campos requeridos: missionId, capturedLat, capturedLng, durationSec');
        }
        if (!isValidCoordinates(parseFloat(capturedLat), parseFloat(capturedLng))) {
            return badRequestResponse(res, 'Coordenadas de captura inválidas');
        }
        const duration = parseInt(durationSec);
        if (duration < 15 || duration > 60) {
            return badRequestResponse(res, 'El video debe durar entre 15 y 60 segundos');
        }

        const collaborator = await Collaborator.findOne({ userId: req.user.id });
        if (!collaborator) return notFoundResponse(res, 'Colaborador no encontrado');

        const mission = await Mission.findOne({ id: missionId });
        if (!mission) return notFoundResponse(res, 'Misión no encontrada');

        const assignment = await MissionAssignment.findOne({
            missionId: mission._id,
            collaboratorProfileId: collaborator._id,
            status: 'IN_PROGRESS'
        });
        if (!assignment) return badRequestResponse(res, 'No tienes una misión activa con este ID');

        const distance = calculateDistance(parseFloat(capturedLat), parseFloat(capturedLng), mission.lat, mission.lng);
        const isWithinRadius = distance <= mission.searchRadiusKm;

        // ✅ 1. CREAR EVIDENCIA
        const evidence = new Evidence({
            missionId: mission._id,
            videoUrl: '',
            videoExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            videoDownloadCount: 0,
            durationSec: duration,
            capturedLat: parseFloat(capturedLat),
            capturedLng: parseFloat(capturedLng),
            status: 'PENDING',
            isWithinRadius,
            distanceFromTargetM: distance * 1000
        });
        await evidence.save();

        // ✅ 2. SUBIR A CLOUDINARY (desde buffer, sin tocar el disco)
        console.log('☁️ Subiendo video a Cloudinary...');
        const cloudinaryResult = await uploadVideoToCloudinary(req.file.buffer, 'evidence');
        console.log('✅ Video subido:', cloudinaryResult.secure_url);

        // ✅ 3. CREAR TEMPVIDEO con datos de Cloudinary
        const TempVideo = (await import('../models/TempVideo.model.js')).default;
        const tempVideo = new TempVideo({
            missionId: mission._id,
            evidenceId: evidence._id,
            filename: cloudinaryResult.public_id,
            originalName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            cloudinaryPublicId: cloudinaryResult.public_id,
            cloudinaryUrl: cloudinaryResult.secure_url,
            duration: cloudinaryResult.duration || duration,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        await tempVideo.save();

        // ✅ 4. ACTUALIZAR EVIDENCIA CON URL DE CLOUDINARY
        evidence.videoUrl = cloudinaryResult.secure_url;
        await evidence.save();

        // ✅ 5. ACTUALIZAR ASIGNACIÓN
        assignment.status = 'COMPLETED';
        assignment.completedAt = new Date();
        await assignment.save();

        // ✅ 6. ACTUALIZAR ESTADÍSTICAS
        collaborator.totalMissionsCompleted += 1;
        collaborator.totalEarned += mission.rewardAmount;
        await collaborator.save();

        // ✅ 7. NOTIFICACIÓN
        const notification = new Notification({
            userId: mission.companyId,
            missionId: mission._id,
            type: 'MISSION_COMPLETED',
            title: 'Misión completada',
            body: `Se ha recibido evidencia para: ${mission.title}`
        });
        await notification.save();

        return successResponse(res, {
            evidence,
            assignment,
            tempVideo: { id: tempVideo.id, videoUrl: cloudinaryResult.secure_url },
            validation: {
                isWithinRadius,
                distanceFromTargetM: (distance * 1000).toFixed(2),
                requiredRadiusKm: mission.searchRadiusKm
            }
        }, 'Evidencia enviada exitosamente', 201);

    } catch (error) {
        console.error('❌ Error en submitEvidence:', error);
        return errorResponse(res, error.message);
    }
};

// Obtener misión actual
export const getCurrentMission = async (req, res) => {
    try {
        const collaborator = await Collaborator.findOne({ userId: req.user.id });
        const assignment = await MissionAssignment.findOne({
            collaboratorProfileId: collaborator._id,
            status: { $in: ['ACCEPTED', 'IN_PROGRESS'] }
        }).populate('missionId');
        if (!assignment) return res.json({ message: 'No tienes misión activa' });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Historial de misiones
export const getMissionHistory = async (req, res) => {
    try {
        const collaborator = await Collaborator.findOne({ userId: req.user.id });
        const assignments = await MissionAssignment.find({
            collaboratorProfileId: collaborator._id,
            status: 'COMPLETED'
        }).populate('missionId').sort({ completedAt: -1 });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};