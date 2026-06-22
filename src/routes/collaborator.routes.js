// src/routes/collaborator.routes.js
import express from 'express';
import multer from 'multer';
import { validateToken } from '../../middlewares/validate.jwt.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import {
    getCollaboratorProfile,
    updateCollaboratorProfile,
    findNearbyMissions,
    acceptMission,
    startMission,
    submitEvidence,
    getCurrentMission,
    getMissionHistory
} from '../controllers/collaborator.controller.js';

const router = express.Router();

// ✅ Multer con memory storage (sin guardar en disco, compatible con Vercel)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 50 * 1024 * 1024, // 50MB
        fieldSize: 50 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de video no soportado. Usa MP4, WebM o MOV'), false);
        }
    }
});

router.use(validateToken);
router.use(requireRole('COLLABORATOR'));

// Perfil
router.get('/profile', getCollaboratorProfile);
router.put('/profile', updateCollaboratorProfile);

// Misiones
router.get('/missions/nearby', findNearbyMissions);
router.post('/missions/accept', acceptMission);
router.post('/missions/:missionId/start', startMission);
router.get('/missions/current', getCurrentMission);
router.get('/missions/history', getMissionHistory);

// ✅ Evidencia - con multer memory storage
router.post('/evidence', validateToken, upload.single('video'), submitEvidence);

export default router;