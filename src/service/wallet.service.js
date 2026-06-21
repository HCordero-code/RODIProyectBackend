// services/wallet.service.js
import Wallet from '../models/wallet.model.js';
import Transaction from '../models/transaction.model.js';

/**
 * Obtiene o crea wallet para un usuario
 */
export const getOrCreateWallet = async (userId) => {
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
        wallet = new Wallet({
            userId,
            pendingBalance: 0,
            approvedBalance: 0,
            withdrawnTotal: 0
        });
        await wallet.save();
    }
    
    return wallet;
};

/**
 * Retiene fondos para una misión (HOLD)
 */
export const holdFunds = async (userId, missionId, amount, description) => {
    const wallet = await getOrCreateWallet(userId);
    
    if (wallet.approvedBalance < amount) {
        throw new Error('Saldo insuficiente');
    }
    
    const transaction = new Transaction({
        walletId: wallet._id,
        missionId,
        type: 'HOLD',
        amount,
        status: 'COMPLETED',
        description
    });
    
    wallet.approvedBalance -= amount;
    wallet.pendingBalance += amount;
    
    await transaction.save();
    await wallet.save();
    
    return { wallet, transaction };
};

/**
 * Libera fondos retenidos (RELEASE)
 */
export const releaseFunds = async (userId, missionId, amount, description, isApproved = true) => {
    const wallet = await getOrCreateWallet(userId);
    
    const transaction = new Transaction({
        walletId: wallet._id,
        missionId,
        type: isApproved ? 'RELEASE' : 'REFUND',
        amount,
        status: 'COMPLETED',
        description
    });
    
    if (isApproved) {
        // Pago aprobado - va a balance aprobado
        wallet.approvedBalance += amount;
    } else {
        // Reembolso - vuelve a balance aprobado desde pending
        wallet.pendingBalance -= amount;
        wallet.approvedBalance += amount;
    }
    
    await transaction.save();
    await wallet.save();
    
    return { wallet, transaction };
};

/**
 * Deposita fondos en la wallet
 */
export const depositFunds = async (userId, amount, paymentMethod, reference = null) => {
    const wallet = await getOrCreateWallet(userId);
    
    const transaction = new Transaction({
        walletId: wallet._id,
        type: 'DEPOSIT',
        amount,
        status: 'COMPLETED',
        description: `Depósito vía ${paymentMethod}`,
        metadata: { paymentMethod, reference }
    });
    
    wallet.approvedBalance += amount;
    
    await transaction.save();
    await wallet.save();
    
    return { wallet, transaction };
};

/**
 * Procesa retiro de fondos
 */
export const processWithdrawal = async (userId, amount) => {
    const wallet = await getOrCreateWallet(userId);
    
    if (wallet.approvedBalance < amount) {
        throw new Error('Saldo insuficiente para retiro');
    }
    
    const transaction = new Transaction({
        walletId: wallet._id,
        type: 'WITHDRAWAL',
        amount,
        status: 'PENDING',
        description: `Solicitud de retiro - ${new Date().toISOString()}`
    });
    
    wallet.withdrawnTotal += amount;
    // NOTA: approvedBalance NO se resta hasta que el retiro sea aprobado por admin
    
    await transaction.save();
    await wallet.save();
    
    return { wallet, transaction };
};

/**
 * Obtiene resumen financiero del usuario
 */
export const getFinancialSummary = async (userId) => {
    const wallet = await getOrCreateWallet(userId);
    
    const recentTransactions = await Transaction.find({ walletId: wallet._id })
        .sort({ createdAt: -1 })
        .limit(10);
    
    const stats = await Transaction.aggregate([
        { $match: { walletId: wallet._id, status: 'COMPLETED' } },
        { $group: {
            _id: '$type',
            total: { $sum: '$amount' }
        }}
    ]);
    
    return {
        wallet,
        recentTransactions,
        stats: stats.reduce((acc, curr) => {
            acc[curr._id.toLowerCase()] = curr.total;
            return acc;
        }, {})
    };
};