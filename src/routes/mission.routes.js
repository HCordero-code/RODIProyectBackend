import express from 'express';
import { validateToken } from '../../middlewares/validate.jwt.js';
import {
    getMissionById,
    getAvailableMissions
} from '../controllers/mission.controller.js';

const router = express.Router();

// Rutas públicas con autenticación (cualquier usuario autenticado puede ver)
router.use(validateToken);

// Obtener misiones disponibles (colaboradores)
router.get('/available', getAvailableMissions);

// Obtener detalles de una misión específica
router.get('/:id', getMissionById);

export default router;