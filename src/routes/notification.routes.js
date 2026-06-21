import express from 'express';
import { validateToken } from '../../middlewares/validate.jwt.js';
import {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../controllers/notification.controller.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(validateToken);

// Notificaciones
router.get('/', getMyNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;