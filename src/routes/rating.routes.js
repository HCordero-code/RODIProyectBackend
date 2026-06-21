import express from 'express';
import { validateToken } from '../../middlewares/validate.jwt.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import {
    rateCollaborator,
    rateCompany,
    getUserRatings
} from '../controllers/rating.controller.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(validateToken);

// Calificaciones (roles específicos)
router.post('/collaborator', requireRole('CLIENT'), rateCollaborator);
router.post('/company', requireRole('COLLABORATOR'), rateCompany);

// Obtener calificaciones de un usuario (público dentro de la app)
router.get('/user/:userId', getUserRatings);

export default router;