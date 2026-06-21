// src/controllers/company.controller.js
import Company from '../models/company.model.js';
import Mission from '../models/mission.model.js';
import Transaction from '../models/transaction.model.js';
import Wallet from '../models/wallet.model.js';
import MissionAssignment from '../models/missionAssignment.model.js';
import Collaborator from '../models/collaborator.model.js';
import Evidence from '../models/evidence.model.js';
import Notification from '../models/notification.model.js';
import { isValidCoordinates } from '../../src/service/geolocation.service.js';
import { successResponse, errorResponse, notFoundResponse, badRequestResponse } from '../../utils/response.js';

// Obtener perfil de empresa
export const getCompanyProfile = async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }
        res.json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear/actualizar perfil de empresa
export const updateCompanyProfile = async (req, res) => {
    try {
        const { legalName, taxId, address } = req.body;
        const company = await Company.findOneAndUpdate(
            { userId: req.user.id },
            { legalName, taxId, address },
            { new: true, upsert: true }
        );
        res.json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Crear nueva misión - SOLO UNA VEZ
export const createMission = async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return notFoundResponse(res, 'Empresa');
        }

        // Validar coordenadas de la misión
        const { lat, lng, totalCost, title } = req.body;
        if (!isValidCoordinates(lat, lng)) {
            return badRequestResponse(res, 'Coordenadas de misión inválidas');
        }

        // ✅ Verificar saldo
        const wallet = await Wallet.findOne({ userId: req.user.id });
        if (!wallet) {
            return badRequestResponse(res, 'No tienes una wallet. Contacta al soporte.');
        }
        
        if (wallet.approvedBalance < totalCost) {
            return badRequestResponse(res, `Saldo insuficiente. Disponible: $${wallet.approvedBalance}. Necesitas: $${totalCost}`);
        }

        // ✅ Crear la misión
        const mission = new Mission({
            ...req.body,
            companyId: company._id
        });

        // ✅ Retener fondos (HOLD)
        const transaction = new Transaction({
            walletId: wallet._id,
            missionId: mission._id,
            type: 'HOLD',
            amount: totalCost,
            status: 'COMPLETED',
            description: `Retención por misión: ${title}`
        });
        await transaction.save();
        
        // ✅ Mover fondos de approved a pending
        wallet.approvedBalance -= totalCost;
        wallet.pendingBalance += totalCost;
        await wallet.save();

        await mission.save();
        
        return successResponse(res, {
            mission,
            transaction,
            wallet: {
                approvedBalance: wallet.approvedBalance,
                pendingBalance: wallet.pendingBalance
            }
        }, 'Misión creada', 201);
        
    } catch (error) {
        console.error('❌ Error en createMission:', error);
        return errorResponse(res, error.message);
    }
};

// Obtener misiones de la empresa
export const getCompanyMissions = async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }

        // ✅ Obtener los parámetros de la query
        const { status, page = 1, limit = 10 } = req.query;
        
        // ✅ Declarar query UNA SOLA VEZ
        const query = { companyId: company._id };
        
        // ✅ Si se especifica status, filtrar por él
        if (status) {
            query.status = status;
        } else {
            // Si no se especifica status, excluir EXPIRED
            query.status = { $ne: 'EXPIRED' };
        }

        const missions = await Mission.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('companyId', 'legalName');

        const total = await Mission.countDocuments(query);

        // ✅ Asegurar que el ID que se devuelve es el UUID, no el _id
        const formattedMissions = missions.map(m => ({
            ...m.toObject(),
            id: m.id // ← Esto asegura que el UUID esté disponible
        }));

        res.json({
            missions: formattedMissions,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Cancelar misión
export const cancelMission = async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findOne({ userId: req.user.id });
        
        // ✅ Buscar por UUID (id)
        const mission = await Mission.findOne({ id: id, companyId: company._id });
        if (!mission) {
            return res.status(404).json({ message: 'Misión no encontrada' });
        }

        if (mission.status !== 'PENDING') {
            return res.status(400).json({ message: 'No se puede cancelar una misión ya asignada' });
        }

        mission.status = 'CANCELLED';
        await mission.save();

        // Liberar fondos retenidos
        const wallet = await Wallet.findOne({ userId: req.user.id });
        if (wallet) {
            const transaction = new Transaction({
                walletId: wallet._id,
                missionId: mission._id,
                type: 'REFUND',
                amount: mission.totalCost,
                status: 'COMPLETED',
                description: `Reembolso por cancelación de misión: ${mission.title}`
            });
            await transaction.save();
            
            wallet.pendingBalance -= mission.totalCost;
            wallet.approvedBalance += mission.totalCost;
            await wallet.save();
        }

        res.json({ message: 'Misión cancelada', mission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✅ Aprobar evidencia y liberar pago - CORREGIDO
export const approveEvidence = async (req, res) => {
    try {
        const { missionId } = req.body;
        const company = await Company.findOne({ userId: req.user.id });
        
        if (!company) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }
        
        // ✅ Buscar por UUID (id)
        const mission = await Mission.findOne({ id: missionId, companyId: company._id });
        if (!mission) {
            return res.status(404).json({ message: 'Misión no encontrada' });
        }

        // ✅ Verificar que la misión esté en estado completado o en progreso
        if (mission.status !== 'COMPLETED' && mission.status !== 'IN_PROGRESS') {
            return res.status(400).json({ message: 'La misión no está en estado completado' });
        }

        // ✅ Verificar que exista evidencia pendiente
        const evidence = await Evidence.findOne({ missionId: mission._id, status: 'PENDING' });
        if (!evidence) {
            return res.status(404).json({ message: 'No hay evidencia pendiente para esta misión' });
        }

        // ✅ Actualizar estado de la misión
        mission.status = 'COMPLETED';
        await mission.save();

        // ✅ Actualizar estado de la evidencia
        evidence.status = 'APPROVED';
        await evidence.save();

        // ✅ Buscar la asignación
        const assignment = await MissionAssignment.findOne({ missionId: mission._id });
        if (!assignment) {
            return res.status(404).json({ message: 'Asignación no encontrada' });
        }
        
        // ✅ Buscar el colaborador
        const collaborator = await Collaborator.findById(assignment.collaboratorProfileId);
        if (!collaborator) {
            return res.status(404).json({ message: 'Colaborador no encontrado' });
        }
        
        // ✅ Buscar la wallet del colaborador
        const collaboratorWallet = await Wallet.findOne({ userId: collaborator.userId });
        if (!collaboratorWallet) {
            return res.status(404).json({ message: 'Wallet del colaborador no encontrada' });
        }
        
        // ✅ Crear transacción de liberación de pago
        const transaction = new Transaction({
            walletId: collaboratorWallet._id,
            missionId: mission._id,
            type: 'RELEASE',
            amount: mission.rewardAmount,
            status: 'COMPLETED',
            description: `Pago por misión completada: ${mission.title}`
        });
        await transaction.save();

        // ✅ Añadir al balance aprobado del colaborador
        collaboratorWallet.approvedBalance += mission.rewardAmount;
        await collaboratorWallet.save();

        // ✅ Actualizar estadísticas del colaborador
        collaborator.totalMissionsCompleted += 1;
        collaborator.totalEarned += mission.rewardAmount;
        await collaborator.save();

        // ✅ Actualizar wallet de la empresa (quitar de pending)
        const companyWallet = await Wallet.findOne({ userId: req.user.id });
        if (companyWallet) {
            companyWallet.pendingBalance -= mission.totalCost;
            await companyWallet.save();
        }

        // ✅ Crear notificación para el colaborador
        const notification = new Notification({
            userId: collaborator.userId,
            missionId: mission._id,
            type: 'PAYMENT_RECEIVED',
            title: 'Pago recibido',
            body: `Has recibido $${mission.rewardAmount} por la misión: ${mission.title}`
        });
        await notification.save();

        return res.json({ 
            message: 'Evidencia aprobada y pago liberado',
            mission,
            evidence,
            transaction
        });
        
    } catch (error) {
        console.error('❌ Error en approveEvidence:', error);
        res.status(500).json({ message: error.message });
    }
};