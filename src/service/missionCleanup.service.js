// services/missionCleanup.service.js
import Mission from '../models/mission.model.js';
import Wallet from '../models/wallet.model.js';
import Transaction from '../models/transaction.model.js';
import Notification from '../models/notification.model.js';

/**
 * Procesar misiones expiradas (para clientes)
 * - Libera fondos retenidos
 * - Notifica al cliente
 * - Marca como EXPIRED
 */
export const processExpiredClientMissions = async () => {
    try {
        const now = new Date();
        
        // Buscar misiones PENDING o ASSIGNED que hayan expirado
        const expiredMissions = await Mission.find({
            status: { $in: ['PENDING', 'ASSIGNED'] },
            expiresAt: { $lt: now }
        });

        console.log(`⏰ Encontradas ${expiredMissions.length} misiones de clientes expiradas`);

        let processedCount = 0;
        let refundedAmount = 0;

        for (const mission of expiredMissions) {
            try {
                // 1. Cambiar estado a EXPIRED
                mission.status = 'EXPIRED';
                await mission.save();

                // 2. Liberar fondos retenidos (reembolso a la empresa)
                if (mission.companyId) {
                    const wallet = await Wallet.findOne({ userId: mission.companyId });
                    if (wallet) {
                        // Buscar transacciones HOLD asociadas
                        const holdTransactions = await Transaction.find({
                            missionId: mission._id,
                            type: 'HOLD',
                            status: 'COMPLETED'
                        });

                        for (const holdTx of holdTransactions) {
                            // Crear transacción de reembolso
                            const refundTx = new Transaction({
                                walletId: wallet._id,
                                missionId: mission._id,
                                type: 'REFUND',
                                amount: holdTx.amount,
                                status: 'COMPLETED',
                                description: `Reembolso automático por misión expirada: ${mission.title}`
                            });
                            await refundTx.save();

                            // Devolver fondos a approvedBalance
                            wallet.pendingBalance = Math.max(0, wallet.pendingBalance - holdTx.amount);
                            wallet.approvedBalance += holdTx.amount;
                            await wallet.save();

                            refundedAmount += holdTx.amount;
                            processedCount++;
                        }
                    }
                }

                // 3. Notificar al cliente (empresa)
                if (mission.companyId) {
                    const notification = new Notification({
                        userId: mission.companyId,
                        missionId: mission._id,
                        type: 'MISSION_EXPIRED',
                        title: '❌ Misión expirada',
                        body: `Tu misión "${mission.title}" ha expirado. Los fondos han sido reembolsados a tu wallet.`,
                        metadata: {
                            missionId: mission.id,
                            title: mission.title,
                            refundedAmount: mission.totalCost
                        }
                    });
                    await notification.save();
                }

                console.log(`✅ Misión ${mission.id} (${mission.title}) expirada - Reembolsado $${mission.totalCost}`);

            } catch (missionError) {
                console.error(`❌ Error procesando misión ${mission.id}:`, missionError);
            }
        }

        console.log(`✅ Procesamiento completado: ${processedCount} misiones, $${refundedAmount} reembolsados`);
        
        return {
            processed: processedCount,
            refundedAmount
        };

    } catch (error) {
        console.error('❌ Error en processExpiredClientMissions:', error);
        throw error;
    }
};

/**
 * Eliminar permanentemente misiones EXPIRED (después de 7 días)
 */
export const deleteOldExpiredMissions = async () => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);

        const oldExpiredMissions = await Mission.find({
            status: 'EXPIRED',
            updatedAt: { $lt: cutoffDate }
        });

        console.log(`🗑️ Encontradas ${oldExpiredMissions.length} misiones expiradas para eliminar permanentemente`);

        let deletedCount = 0;

        for (const mission of oldExpiredMissions) {
            try {
                // Eliminar la misión permanentemente
                await Mission.deleteOne({ _id: mission._id });
                deletedCount++;
                console.log(`🗑️ Misión ${mission.id} (${mission.title}) eliminada permanentemente`);
            } catch (deleteError) {
                console.error(`❌ Error eliminando misión ${mission.id}:`, deleteError);
            }
        }

        return deletedCount;

    } catch (error) {
        console.error('❌ Error en deleteOldExpiredMissions:', error);
        throw error;
    }
};