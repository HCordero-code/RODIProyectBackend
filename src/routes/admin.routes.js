// src/routes/admin.routes.js
import express from 'express';
import { validateToken } from '../../middlewares/validate.jwt.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import {
    getAllUsers,
    getUserById,
    updateUserStatus,
    verifyCompany,
    verifyCollaborator,
    getSystemStats,
    getAllTransactions,
    getPendingEvidence,
    approveEvidence,
    rejectEvidence,
    getAllCollaborators,
    getAllMissions,        
    getDashboardStats,   
    getWithdrawalRequests, 
    approveWithdrawal,       
    rejectWithdrawal 
} from '../controllers/admin.controller.js';

const router = express.Router();

// Todas las rutas de admin requieren autenticación y rol ADMIN
router.use(validateToken);
router.use(requireRole('ADMIN'));

// Usuarios
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/status', updateUserStatus);

// Verificaciones
router.post('/companies/:id/verify', verifyCompany);
router.post('/collaborators/:id/verify', verifyCollaborator);

// ✅ Ruta para obtener colaboradores
router.get('/collaborators', getAllCollaborators);

// Estadísticas y transacciones
router.get('/stats', getSystemStats);
router.get('/transactions', getAllTransactions);

// Evidencia (admin)
router.get('/evidence/pending', getPendingEvidence);
router.post('/evidence/approve', approveEvidence);
router.post('/evidence/reject', rejectEvidence);

router.get('/missions', getAllMissions);
router.get('/dashboard-stats', getDashboardStats);
router.get('/withdrawals', getWithdrawalRequests);
router.post('/withdrawals/approve', approveWithdrawal);
router.post('/withdrawals/reject', rejectWithdrawal);

export default router;