import express from 'express';
import { validateToken } from '../../middlewares/validate.jwt.js';
import {
    getEvidenceByMission,
    getPendingEvidence,
    reviewEvidence
} from '../controllers/evidence.controller.js';
import { requireRole } from '../../middlewares/role.middleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(validateToken);

// Rutas públicas (con autenticación)
router.get('/mission/:missionId', getEvidenceByMission);

// Rutas para empresas (ver evidencia pendiente)
router.get('/pending', requireRole('CLIENT'), getPendingEvidence);

// Revisar evidencia (empresas)
router.post('/review', requireRole('CLIENT'), reviewEvidence);

export default router;