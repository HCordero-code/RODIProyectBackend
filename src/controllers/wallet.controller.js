import Wallet from '../models/wallet.model.js';
import Transaction from '../models/transaction.model.js';
import User from '../models/user.model.js';
import Notification from '../models/notification.model.js';

// Obtener wallet del usuario
export const getMyWallet = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ userId: req.user.id });
        
        if (!wallet) {
            // Crear wallet si no existe
            wallet = new Wallet({ userId: req.user.id });
            await wallet.save();
        }

        // Obtener transacciones recientes
        const recentTransactions = await Transaction.find({ walletId: wallet._id })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            wallet,
            recentTransactions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener historial de transacciones
export const getTransactionHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20, type, status } = req.query;
        
        const wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet no encontrada' });
        }

        const query = { walletId: wallet._id };
        if (type) query.type = type;
        if (status) query.status = status;

        const transactions = await Transaction.find(query)
            .populate('missionId', 'title')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            transactions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Solicitar retiro (solo para colaboradores)
export const requestWithdrawal = async (req, res) => {
    try {
        const { amount } = req.body;
        
        const user = await User.findById(req.user.id);
        if (user.role !== 'COLLABORATOR') {
            return res.status(403).json({ message: 'Solo colaboradores pueden retirar fondos' });
        }

        const wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet no encontrada' });
        }
        
        if (wallet.approvedBalance < amount) {
            return res.status(400).json({ message: 'Saldo insuficiente' });
        }

        if (amount < 10) {
            return res.status(400).json({ message: 'El monto mínimo de retiro es $10' });
        }

        // ✅ SIEMPRE PENDING - El admin debe aprobar
        const status = 'PENDING';

        // Crear transacción de retiro
        const transaction = new Transaction({
            walletId: wallet._id,
            userId: user._id,
            type: 'WITHDRAWAL',
            amount,
            status: status,
            description: `Solicitud de retiro - ${user.firstName} ${user.lastName}`,
            metadata: {
                userEmail: user.email,
                userPhone: user.phone || 'No registrado',
                requestedAt: new Date().toISOString()
            }
        });

        await transaction.save();

        // ✅ NO restar el saldo hasta que el admin apruebe
        // Solo registramos la solicitud

        // ✅ Crear notificación para el admin
        const Notification = (await import('../models/notification.model.js')).default;
        const adminNotification = new Notification({
            userId: null, // Para admins
            type: 'WITHDRAWAL_REQUEST',
            title: 'Nueva solicitud de retiro',
            body: `${user.firstName} ${user.lastName} solicita retirar $${amount}`,
            metadata: {
                transactionId: transaction._id,
                userId: user._id,
                amount: amount
            },
            isAdmin: true
        });
        await adminNotification.save();

        res.status(201).json({ 
            success: true,
            message: 'Solicitud de retiro creada. Espera la aprobación del administrador.',
            transaction,
            note: 'El retiro será procesado en 24-48 horas hábiles después de la aprobación'
        });
    } catch (error) {
        console.error('❌ Error en requestWithdrawal:', error);
        res.status(500).json({ message: error.message });
    }
};

// Depositar fondos (solo para empresas)
export const depositFunds = async (req, res) => {
    try {
        const { amount, paymentMethod, paymentReference } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Monto inválido' });
        }

        const user = await User.findById(req.user.id);
        if (user.role !== 'CLIENT') {
            return res.status(403).json({ message: 'Solo empresas pueden depositar fondos' });
        }

        let wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) {
            // Crear wallet si no existe
            wallet = new Wallet({ 
                userId: req.user.id,
                pendingBalance: 0,
                approvedBalance: 0,
                withdrawnTotal: 0
            });
            await wallet.save();
        }

        // Crear transacción de depósito
        const transaction = new Transaction({
            walletId: wallet._id,
            type: 'DEPOSIT',
            amount,
            status: 'COMPLETED',
            description: `Depósito vía ${paymentMethod}`,
            metadata: { paymentMethod, paymentReference }
        });

        // ✅ Actualizar balance disponible
        wallet.approvedBalance += amount;
        
        await transaction.save();
        await wallet.save();

        res.status(201).json({ 
            message: `Depósito de $${amount} realizado con éxito`,
            transaction,
            newBalance: wallet.approvedBalance
        });
    } catch (error) {
        console.error('❌ Error en depositFunds:', error);
        res.status(500).json({ message: error.message });
    }
};