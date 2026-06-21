import express from 'express';
import { validateToken } from '../../middlewares/validate.jwt.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import {
    getMyWallet,
    getTransactionHistory,
    requestWithdrawal,
    depositFunds
} from '../controllers/wallet.controller.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(validateToken);

// Wallet base (todos los roles)
router.get('/', getMyWallet);
router.get('/transactions', getTransactionHistory);

// Colaborador: solicitar retiro
router.post('/withdraw', requireRole('COLLABORATOR'), requestWithdrawal);

// Empresa: depositar fondos
router.post('/deposit', requireRole('CLIENT'), depositFunds);

export default router;