import User from '../models/user.model.js';
import Company from '../models/company.model.js';
import Collaborator from '../models/collaborator.model.js';
import Mission from '../models/mission.model.js';
import Transaction from '../models/transaction.model.js';

// Verificar que el usuario es admin
const isAdmin = (req) => {
    return req.user && req.user.role === 'ADMIN';
};

// Obtener todos los usuarios
export const getAllUsers = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const { role, status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (role) query.role = role;
        if (status) query.status = status;

        const users = await User.find(query)
            .select('-password')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener usuario por ID
export const getUserById = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const userId = req.params.id;
        let user;
        
        // ✅ Intentar buscar por UUID primero, luego por ObjectId
        if (userId.includes('-')) {
            // Es un UUID
            user = await User.findOne({ id: userId }).select('-password');
        } else {
            // Es un ObjectId
            user = await User.findById(userId).select('-password');
        }
        
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Obtener información adicional según rol
        let extraInfo = {};
        if (user.role === 'CLIENT') {
            extraInfo.company = await Company.findOne({ userId: user._id });
        } else if (user.role === 'COLLABORATOR') {
            extraInfo.collaborator = await Collaborator.findOne({ userId: user._id });
        }

        res.json({ user, ...extraInfo });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar estado de usuario
export const updateUserStatus = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const { status } = req.body;
        const userId = req.params.id;
        let user;
        
        // ✅ Intentar buscar por UUID primero, luego por ObjectId
        if (userId.includes('-')) {
            user = await User.findOneAndUpdate(
                { id: userId },
                { status },
                { new: true }
            ).select('-password');
        } else {
            user = await User.findByIdAndUpdate(
                userId,
                { status },
                { new: true }
            ).select('-password');
        }

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Verificar empresa
export const verifyCompany = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const company = await Company.findById(req.params.id);
        if (!company) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }

        company.isVerified = true;
        await company.save();

        // Actualizar rol del usuario si es necesario
        await User.findByIdAndUpdate(company.userId, { status: 'ACTIVE' });

        res.json({ message: 'Empresa verificada', company });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Verificar colaborador
export const verifyCollaborator = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const Collaborator = (await import('../models/collaborator.model.js')).default;
        
        // ✅ Buscar por el campo "id" (UUID) en lugar de "_id"
        const collaborator = await Collaborator.findOne({ id: req.params.id });
        
        if (!collaborator) {
            return res.status(404).json({ message: 'Colaborador no encontrado' });
        }

        collaborator.verificationStatus = 'VERIFIED';
        await collaborator.save();

        res.json({ 
            success: true,
            message: 'Colaborador verificado', 
            collaborator 
        });
    } catch (error) {
        console.error('❌ Error en verifyCollaborator:', error);
        res.status(500).json({ message: error.message });
    }
};

// Obtener estadísticas del sistema
export const getSystemStats = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const [
            totalUsers,
            totalCompanies,
            totalCollaborators,
            totalMissions,
            completedMissions,
            totalTransactions
        ] = await Promise.all([
            User.countDocuments(),
            Company.countDocuments(),
            Collaborator.countDocuments(),
            Mission.countDocuments(),
            Mission.countDocuments({ status: 'COMPLETED' }),
            Transaction.countDocuments()
        ]);

        // Ventas totales (suma de todas las transacciones completadas)
        const salesResult = await Transaction.aggregate([
            { $match: { status: 'COMPLETED', type: 'RELEASE' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            users: {
                total: totalUsers,
                companies: totalCompanies,
                collaborators: totalCollaborators
            },
            missions: {
                total: totalMissions,
                completed: completedMissions,
                completionRate: totalMissions ? (completedMissions / totalMissions * 100).toFixed(2) : 0
            },
            transactions: {
                total: totalTransactions,
                totalVolume: salesResult[0]?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener todas las transacciones
export const getAllTransactions = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const { page = 1, limit = 20 } = req.query;
        
        const transactions = await Transaction.find()
            .populate('walletId')
            .populate('missionId')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments();

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

export const getPendingEvidence = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const Evidence = (await import('../models/evidence.model.js')).default;
        const Mission = (await import('../models/mission.model.js')).default;
        const MissionAssignment = (await import('../models/missionAssignment.model.js')).default;
        const Collaborator = (await import('../models/collaborator.model.js')).default;
        const User = (await import('../models/user.model.js')).default;

        // Obtener todas las evidencias pendientes
        const pendingEvidence = await Evidence.find({ status: 'PENDING' })
            .populate('missionId', 'title companyId')
            .sort({ createdAt: -1 });

        // Enriquecer con datos del colaborador
        const enrichedEvidence = [];
        
        for (const ev of pendingEvidence) {
            // Buscar la asignación para obtener el colaborador
            const assignment = await MissionAssignment.findOne({ 
                missionId: ev.missionId._id 
            });
            
            let collaboratorName = 'Desconocido';
            if (assignment) {
                const collaborator = await Collaborator.findById(assignment.collaboratorProfileId);
                if (collaborator) {
                    const user = await User.findById(collaborator.userId);
                    if (user) {
                        collaboratorName = `${user.firstName} ${user.lastName}`;
                    }
                }
            }

            enrichedEvidence.push({
                ...ev.toObject(),
                collaboratorName,
                missionTitle: ev.missionId?.title || 'Sin título',
            });
        }

        res.json({
            success: true,
            data: enrichedEvidence
        });
    } catch (error) {
        console.error('❌ Error en getPendingEvidence:', error);
        res.status(500).json({ message: error.message });
    }
};

// Aprobar evidencia (admin)
export const approveEvidence = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const { evidenceId } = req.body;
        const Evidence = (await import('../models/evidence.model.js')).default;
        const Mission = (await import('../models/mission.model.js')).default;
        const MissionAssignment = (await import('../models/missionAssignment.model.js')).default;
        const Collaborator = (await import('../models/collaborator.model.js')).default;
        const Wallet = (await import('../models/wallet.model.js')).default;
        const Transaction = (await import('../models/transaction.model.js')).default;
        const Notification = (await import('../models/notification.model.js')).default;

        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) {
            return res.status(404).json({ message: 'Evidencia no encontrada' });
        }

        if (evidence.status !== 'PENDING') {
            return res.status(400).json({ message: 'Esta evidencia ya fue revisada' });
        }

        const mission = await Mission.findById(evidence.missionId);
        if (!mission) {
            return res.status(404).json({ message: 'Misión no encontrada' });
        }

        // Actualizar evidencia
        evidence.status = 'APPROVED';
        await evidence.save();

        // Actualizar misión
        mission.status = 'COMPLETED';
        await mission.save();

        // Buscar asignación y colaborador
        const assignment = await MissionAssignment.findOne({ missionId: mission._id });
        if (assignment) {
            const collaborator = await Collaborator.findById(assignment.collaboratorProfileId);
            if (collaborator) {
                // Buscar wallet del colaborador
                const collaboratorWallet = await Wallet.findOne({ userId: collaborator.userId });
                if (collaboratorWallet) {
                    // Crear transacción de liberación
                    const transaction = new Transaction({
                        walletId: collaboratorWallet._id,
                        missionId: mission._id,
                        type: 'RELEASE',
                        amount: mission.rewardAmount,
                        status: 'COMPLETED',
                        description: `Pago por misión completada: ${mission.title}`
                    });
                    await transaction.save();

                    // Añadir al balance aprobado
                    collaboratorWallet.approvedBalance += mission.rewardAmount;
                    await collaboratorWallet.save();

                    // Actualizar estadísticas
                    collaborator.totalMissionsCompleted += 1;
                    collaborator.totalEarned += mission.rewardAmount;
                    await collaborator.save();

                    // Notificar al colaborador
                    const notification = new Notification({
                        userId: collaborator.userId,
                        missionId: mission._id,
                        type: 'PAYMENT_RECEIVED',
                        title: 'Pago recibido',
                        body: `Has recibido $${mission.rewardAmount} por la misión: ${mission.title}`
                    });
                    await notification.save();
                }
            }
        }

        res.json({
            success: true,
            message: 'Evidencia aprobada y pago liberado',
            evidence
        });
    } catch (error) {
        console.error('❌ Error en approveEvidence:', error);
        res.status(500).json({ message: error.message });
    }
};

// Rechazar evidencia (admin)
export const rejectEvidence = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const { evidenceId } = req.body;
        const Evidence = (await import('../models/evidence.model.js')).default;
        const Notification = (await import('../models/notification.model.js')).default;
        const Mission = (await import('../models/mission.model.js')).default;
        const MissionAssignment = (await import('../models/missionAssignment.model.js')).default;
        const Collaborator = (await import('../models/collaborator.model.js')).default;

        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) {
            return res.status(404).json({ message: 'Evidencia no encontrada' });
        }

        if (evidence.status !== 'PENDING') {
            return res.status(400).json({ message: 'Esta evidencia ya fue revisada' });
        }

        evidence.status = 'REJECTED';
        await evidence.save();

        // Notificar al colaborador
        const mission = await Mission.findById(evidence.missionId);
        if (mission) {
            const assignment = await MissionAssignment.findOne({ missionId: mission._id });
            if (assignment) {
                const collaborator = await Collaborator.findById(assignment.collaboratorProfileId);
                if (collaborator) {
                    const notification = new Notification({
                        userId: collaborator.userId,
                        missionId: mission._id,
                        type: 'EVIDENCE_VERIFIED',
                        title: 'Evidencia rechazada',
                        body: `Tu evidencia para "${mission.title}" ha sido rechazada`
                    });
                    await notification.save();
                }
            }
        }

        res.json({
            success: true,
            message: 'Evidencia rechazada',
            evidence
        });
    } catch (error) {
        console.error('❌ Error en rejectEvidence:', error);
        res.status(500).json({ message: error.message });
    }
};

export const getAllCollaborators = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const Collaborator = (await import('../models/collaborator.model.js')).default;
        const User = (await import('../models/user.model.js')).default;

        console.log('🔍 Buscando colaboradores...');

        // 1. Obtener todos los perfiles de colaborador
        const collaboratorProfiles = await Collaborator.find({})
            .sort({ createdAt: -1 });

        console.log(`📦 Perfiles de colaborador encontrados: ${collaboratorProfiles.length}`);

        // 2. Obtener datos de usuario para cada perfil
        const collaboratorsWithUser = await Promise.all(
            collaboratorProfiles.map(async (collab) => {
                const user = await User.findById(collab.userId).select('-password');
                return {
                    ...collab.toObject(),
                    user: user || null
                };
            })
        );

        // 3. Obtener todos los usuarios con rol COLLABORATOR
        const usersWithRoleCollaborator = await User.find({ 
            role: 'COLLABORATOR' 
        }).select('-password');

        console.log(`👥 Usuarios con rol COLLABORATOR: ${usersWithRoleCollaborator.length}`);

        // 4. Identificar qué usuarios NO tienen perfil de colaborador
        const collabUserIds = new Set(collaboratorProfiles.map(c => c.userId.toString()));
        const usersWithoutProfile = usersWithRoleCollaborator.filter(
            u => !collabUserIds.has(u._id.toString())
        );

        console.log(`📝 Usuarios sin perfil de colaborador: ${usersWithoutProfile.length}`);

        // 5. Crear perfiles temporales para usuarios sin perfil
        const tempCollaborators = usersWithoutProfile.map(user => ({
            _id: user._id,
            id: user.id || user._id.toString(),
            userId: user._id,
            reputationScore: 0,
            isAvailable: true,
            verificationStatus: 'PENDING',
            currentLat: null,
            currentLng: null,
            totalMissionsCompleted: 0,
            totalEarned: 0,
            createdAt: user.createdAt,
            user: user,
            isTemporary: true
        }));

        // 6. Combinar ambas listas
        const allCollaborators = [...collaboratorsWithUser, ...tempCollaborators];

        console.log(`✅ Total colaboradores: ${allCollaborators.length}`);

        res.json({
            success: true,
            data: allCollaborators,
            total: allCollaborators.length
        });
    } catch (error) {
        console.error('❌ Error en getAllCollaborators:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getAllMissions = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const Mission = (await import('../models/mission.model.js')).default;
        const Company = (await import('../models/company.model.js')).default;
        const User = (await import('../models/user.model.js')).default;

        const { status, page = 1, limit = 20 } = req.query;
        
        // Construir query
        const query = {};
        if (status) query.status = status;

        // Obtener misiones con paginación
        const missions = await Mission.find(query)
            .populate('companyId', 'legalName isVerified')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Mission.countDocuments(query);

        // Enriquecer con datos de la empresa
        const enrichedMissions = await Promise.all(
            missions.map(async (mission) => {
                const missionObj = mission.toObject();
                
                // Obtener usuario de la empresa
                let companyUser = null;
                if (mission.companyId) {
                    const company = await Company.findById(mission.companyId._id);
                    if (company) {
                        companyUser = await User.findById(company.userId).select('-password');
                    }
                }

                return {
                    ...missionObj,
                    companyName: mission.companyId?.legalName || 'Empresa sin nombre',
                    companyEmail: companyUser?.email || 'sin email',
                    companyVerified: mission.companyId?.isVerified || false
                };
            })
        );

        res.json({
            success: true,
            data: enrichedMissions,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit: limit
        });
    } catch (error) {
        console.error('❌ Error en getAllMissions:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Obtener estadísticas detalladas para el dashboard
export const getDashboardStats = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const User = (await import('../models/user.model.js')).default;
        const Company = (await import('../models/company.model.js')).default;
        const Collaborator = (await import('../models/collaborator.model.js')).default;
        const Mission = (await import('../models/mission.model.js')).default;
        const Transaction = (await import('../models/transaction.model.js')).default;

        // Estadísticas de usuarios
        const totalUsers = await User.countDocuments();
        const totalCompanies = await Company.countDocuments();
        const totalCollaborators = await Collaborator.countDocuments();
        const activeCollaborators = await Collaborator.countDocuments({ isAvailable: true });
        const verifiedCollaborators = await Collaborator.countDocuments({ verificationStatus: 'VERIFIED' });

        // Estadísticas de misiones
        const totalMissions = await Mission.countDocuments();
        const completedMissions = await Mission.countDocuments({ status: 'COMPLETED' });
        const inProgressMissions = await Mission.countDocuments({ status: 'IN_PROGRESS' });
        const pendingMissions = await Mission.countDocuments({ status: 'PENDING' });
        const assignedMissions = await Mission.countDocuments({ status: 'ASSIGNED' });
        const cancelledMissions = await Mission.countDocuments({ status: 'CANCELLED' });

        // Estadísticas de transacciones
        const totalTransactions = await Transaction.countDocuments();
        
        const salesResult = await Transaction.aggregate([
            { $match: { status: 'COMPLETED', type: 'RELEASE' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalVolume = salesResult[0]?.total || 0;

        // Misiones del mes actual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const missionsThisMonth = await Mission.countDocuments({
            createdAt: { $gte: startOfMonth }
        });
        
        const completedThisMonth = await Mission.countDocuments({
            status: 'COMPLETED',
            createdAt: { $gte: startOfMonth }
        });

        res.json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    companies: totalCompanies,
                    collaborators: totalCollaborators,
                    activeCollaborators,
                    verifiedCollaborators
                },
                missions: {
                    total: totalMissions,
                    completed: completedMissions,
                    inProgress: inProgressMissions,
                    pending: pendingMissions,
                    assigned: assignedMissions,
                    cancelled: cancelledMissions,
                    thisMonth: missionsThisMonth,
                    completedThisMonth,
                    completionRate: totalMissions > 0 ? (completedMissions / totalMissions * 100).toFixed(2) : 0
                },
                transactions: {
                    total: totalTransactions,
                    totalVolume: totalVolume
                }
            }
        });
    } catch (error) {
        console.error('❌ Error en getDashboardStats:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

export const getWithdrawalRequests = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const Transaction = (await import('../models/transaction.model.js')).default;
        const User = (await import('../models/user.model.js')).default;

        const { status = 'PENDING', page = 1, limit = 20 } = req.query;

        const query = { 
            type: 'WITHDRAWAL',
            status: status
        };

        // ✅ Usar find() en lugar de findById()
        const withdrawals = await Transaction.find(query)
            .populate({
                path: 'userId',
                select: 'firstName lastName email phone'
            })
            .populate('walletId')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            success: true,
            data: withdrawals,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        console.error('❌ Error en getWithdrawalRequests:', error);
        res.status(500).json({ message: error.message });
    }
};

// Aprobar solicitud de retiro (admin)
export const approveWithdrawal = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const { transactionId } = req.body;
        const Transaction = (await import('../models/transaction.model.js')).default;
        const Wallet = (await import('../models/wallet.model.js')).default;
        const Notification = (await import('../models/notification.model.js')).default;

        const transaction = await Transaction.findOne({ id: transactionId });
        if (!transaction) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }

        if (transaction.type !== 'WITHDRAWAL') {
            return res.status(400).json({ message: 'Esta transacción no es un retiro' });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({ message: 'Esta solicitud ya fue procesada' });
        }

        // ✅ Verificar que el usuario existe
        if (!transaction.userId) {
            return res.status(400).json({ message: 'La transacción no tiene un usuario asociado' });
        }

        // Actualizar transacción
        transaction.status = 'COMPLETED';
        transaction.approvedBy = req.user.id;
        transaction.approvedAt = new Date();
        await transaction.save();

        // Restar el saldo de la wallet
        const wallet = await Wallet.findById(transaction.walletId);
        if (wallet) {
            wallet.approvedBalance -= transaction.amount;
            wallet.withdrawnTotal += transaction.amount;
            await wallet.save();
        }

        // ✅ Crear notificación para el colaborador
        const notification = new Notification({
            userId: transaction.userId,
            type: 'WITHDRAWAL_APPROVED',
            title: '✅ Retiro aprobado',
            body: `Tu retiro de $${transaction.amount} ha sido aprobado y procesado`,
            metadata: {
                transactionId: transaction._id,
                amount: transaction.amount
            }
        });
        await notification.save();

        res.json({
            success: true,
            message: 'Retiro aprobado y procesado',
            transaction
        });
    } catch (error) {
        console.error('❌ Error en approveWithdrawal:', error);
        res.status(500).json({ message: error.message });
    }
};

// Rechazar solicitud de retiro (admin)
export const rejectWithdrawal = async (req, res) => {
    try {
        if (!isAdmin(req)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }

        const { transactionId, reason } = req.body;
        const Transaction = (await import('../models/transaction.model.js')).default;
        const Notification = (await import('../models/notification.model.js')).default;

        const transaction = await Transaction.findOne({ id: transactionId });
        if (!transaction) {
            return res.status(404).json({ message: 'Transacción no encontrada' });
        }

        if (transaction.type !== 'WITHDRAWAL') {
            return res.status(400).json({ message: 'Esta transacción no es un retiro' });
        }

        if (transaction.status !== 'PENDING') {
            return res.status(400).json({ message: 'Esta solicitud ya fue procesada' });
        }

        // ✅ Verificar que el usuario existe
        if (!transaction.userId) {
            return res.status(400).json({ message: 'La transacción no tiene un usuario asociado' });
        }

        // Actualizar transacción
        transaction.status = 'CANCELLED';
        transaction.approvedBy = req.user.id;
        transaction.approvedAt = new Date();
        transaction.metadata = {
            ...transaction.metadata,
            rejectionReason: reason || 'Sin motivo especificado'
        };
        await transaction.save();

        // ✅ Crear notificación para el colaborador
        const notification = new Notification({
            userId: transaction.userId,
            type: 'WITHDRAWAL_REJECTED',
            title: '❌ Retiro rechazado',
            body: `Tu retiro de $${transaction.amount} ha sido rechazado${reason ? `: ${reason}` : ''}`,
            metadata: {
                transactionId: transaction._id,
                amount: transaction.amount,
                reason: reason
            }
        });
        await notification.save();

        res.json({
            success: true,
            message: 'Retiro rechazado',
            transaction
        });
    } catch (error) {
        console.error('❌ Error en rejectWithdrawal:', error);
        res.status(500).json({ message: error.message });
    }
};

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

        const status = 'PENDING';

        // ✅ Crear transacción con userId
        const transaction = new Transaction({
            walletId: wallet._id,
            userId: user._id,  // ✅ AÑADIR userId
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

        // ✅ NOTIFICACIÓN AL ADMIN
        const Notification = (await import('../models/notification.model.js')).default;
        const adminNotification = new Notification({
            userId: null,
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