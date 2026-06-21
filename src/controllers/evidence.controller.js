import Evidence from '../models/evidence.model.js';
import Mission from '../models/mission.model.js';
import Company from '../models/company.model.js';
import MissionAssignment from '../models/missionAssignment.model.js';
import Collaborator from '../models/collaborator.model.js';
import Notification from '../models/notification.model.js';

// Obtener evidencia de una misión
export const getEvidenceByMission = async (req, res) => {
    try {
        const { missionId } = req.params;
        
        const evidence = await Evidence.find({ missionId })
            .sort({ createdAt: -1 });

        res.json(evidence);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener evidencia pendiente de revisión (para empresas)
export const getPendingEvidence = async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.user.id });
        if (!company) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }

        // Obtener misiones de la empresa
        const missions = await Mission.find({ companyId: company._id });
        const missionIds = missions.map(m => m._id);

        const pendingEvidence = await Evidence.find({
            missionId: { $in: missionIds },
            status: 'PENDING'
        }).populate('missionId', 'title');

        res.json(pendingEvidence);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Revisar evidencia (aprobar/rechazar)
export const reviewEvidence = async (req, res) => {
    try {
        const { evidenceId, status } = req.body; // status: 'APPROVED' or 'REJECTED'
        
        const evidence = await Evidence.findById(evidenceId);
        if (!evidence) {
            return res.status(404).json({ message: 'Evidencia no encontrada' });
        }

        evidence.status = status;
        await evidence.save();

        // Notificar al colaborador
        const mission = await Mission.findById(evidence.missionId);
        const assignment = await MissionAssignment.findOne({ missionId: mission._id });
        const collaborator = await Collaborator.findById(assignment.collaboratorProfileId);
        
        const notification = new Notification({
            userId: collaborator.userId,
            missionId: mission._id,
            type: 'EVIDENCE_VERIFIED',
            title: status === 'APPROVED' ? 'Evidencia aprobada' : 'Evidencia rechazada',
            body: status === 'APPROVED' 
                ? `Tu evidencia para "${mission.title}" ha sido aprobada` 
                : `Tu evidencia para "${mission.title}" ha sido rechazada`
        });
        await notification.save();

        res.json({ message: `Evidencia ${status === 'APPROVED' ? 'aprobada' : 'rechazada'}`, evidence });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};