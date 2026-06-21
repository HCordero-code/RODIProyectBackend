import express from 'express';
import { validateToken } from '../../middlewares/validate.jwt.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import {
    getCompanyProfile,
    updateCompanyProfile,
    createMission,
    getCompanyMissions,
    cancelMission,
    approveEvidence
} from '../controllers/company.controller.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol CLIENT
router.use(validateToken);
router.use(requireRole('CLIENT'));

// Perfil
router.get('/profile', getCompanyProfile);
router.put('/profile', updateCompanyProfile);

// Misiones
router.post('/missions', createMission);
router.get('/missions', getCompanyMissions);
router.delete('/missions/:id', cancelMission);

// Evidencia
router.post('/evidence/approve', approveEvidence);

export default router;