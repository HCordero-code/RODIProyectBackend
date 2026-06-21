import Rating from '../models/rating.model.js';
import Mission from '../models/mission.model.js';
import MissionAssignment from '../models/missionAssignment.model.js';  // <-- AGREGADO
import Collaborator from '../models/collaborator.model.js';
import Company from '../models/company.model.js';
import Notification from '../models/notification.model.js';

// Calificar a un colaborador (empresa califica)
export const rateCollaborator = async (req, res) => {
    try {
        const { missionId, score, quality, punctuality, comment } = req.body;
        
        const company = await Company.findOne({ userId: req.user.id });
        const mission = await Mission.findOne({ _id: missionId, companyId: company._id });
        
        if (!mission || mission.status !== 'COMPLETED') {
            return res.status(400).json({ message: 'Misión no completada' });
        }

        const assignment = await MissionAssignment.findOne({ missionId });
        if (!assignment) {
            return res.status(404).json({ message: 'Asignación no encontrada' });
        }
        
        const collaborator = await Collaborator.findById(assignment.collaboratorProfileId);
        
        const existingRating = await Rating.findOne({
            missionId,
            giverId: req.user.id,
            receiverId: collaborator.userId
        });

        if (existingRating) {
            return res.status(400).json({ message: 'Ya calificaste esta misión' });
        }

        const rating = new Rating({
            missionId,
            giverId: req.user.id,
            receiverId: collaborator.userId,
            score,
            quality,
            punctuality,
            comment
        });

        await rating.save();

        const allRatings = await Rating.find({ receiverId: collaborator.userId });
        const avgScore = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
        
        collaborator.reputationScore = avgScore;
        await collaborator.save();

        const notification = new Notification({
            userId: collaborator.userId,
            missionId,
            type: 'RATING_RECEIVED',
            title: 'Nueva calificación',
            body: `Has recibido ${score} estrellas por: ${mission.title}`
        });
        await notification.save();

        res.status(201).json(rating);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Calificar a una empresa (colaborador califica)
export const rateCompany = async (req, res) => {
    try {
        const { missionId, score, quality, punctuality, comment } = req.body;
        
        const collaborator = await Collaborator.findOne({ userId: req.user.id });
        const assignment = await MissionAssignment.findOne({
            missionId,
            collaboratorProfileId: collaborator._id,
            status: 'COMPLETED'
        });

        if (!assignment) {
            return res.status(400).json({ message: 'No completaste esta misión' });
        }

        const mission = await Mission.findById(missionId);
        
        const existingRating = await Rating.findOne({
            missionId,
            giverId: req.user.id,
            receiverId: mission.companyId
        });

        if (existingRating) {
            return res.status(400).json({ message: 'Ya calificaste esta misión' });
        }

        const rating = new Rating({
            missionId,
            giverId: req.user.id,
            receiverId: mission.companyId,
            score,
            quality,
            punctuality,
            comment
        });

        await rating.save();

        res.status(201).json(rating);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener calificaciones de un usuario
export const getUserRatings = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const ratings = await Rating.find({ receiverId: userId })
            .populate('giverId', 'firstName lastName nickName')
            .populate('missionId', 'title')
            .sort({ createdAt: -1 });

        const avgScore = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
            : 0;

        res.json({
            averageScore: avgScore,
            totalRatings: ratings.length,
            ratings
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};