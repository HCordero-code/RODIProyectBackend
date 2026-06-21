// mission.controller.js
import Mission from '../models/mission.model.js';
import MissionAssignment from '../models/missionAssignment.model.js';
import Evidence from '../models/evidence.model.js';
import Rating from '../models/rating.model.js';
import { calculateDistance } from '../../src/service/geolocation.service.js'; 

// Obtener detalles de una misión
export const getMissionById = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🔍 Buscando misión con UUID:', id);
        
        const mission = await Mission.findOne({ id: id })
            .populate('companyId', 'legalName isVerified');

        if (!mission) {
            console.log('❌ Misión no encontrada');
            return res.status(404).json({ message: 'Misión no encontrada' });
        }

        console.log('✅ Misión encontrada:');
        console.log('  - _id:', mission._id);
        console.log('  - id (UUID):', mission.id);
        console.log('  - title:', mission.title);

        const assignment = await MissionAssignment.findOne({ missionId: mission._id });
        const evidence = await Evidence.find({ missionId: mission._id }).sort({ createdAt: -1 });
        const rating = await Rating.findOne({ missionId: mission._id });

        // ✅ Asegurar que el ID se envía correctamente
        res.json({
            mission: {
                ...mission.toObject(),
                id: mission.id // Asegurar que el UUID esté presente
            },
            assignment,
            evidence,
            rating
        });
    } catch (error) {
        console.error('❌ Error en getMissionById:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'ID de misión inválido' });
        }
        res.status(500).json({ message: error.message });
    }
};

// Obtener misiones disponibles (públicas)
export const getAvailableMissions = async (req, res) => {
    try {
        const { lat, lng, radius = 10, page = 1, limit = 100, all = false } = req.query;
        
        const query = {
            status: 'PENDING',
            expiresAt: { $gt: new Date() }
        };

        let missionsQuery = Mission.find(query)
            .populate('companyId', 'legalName')
            .sort({ priority: 1, createdAt: 1 });
            
        if (!all) {
            missionsQuery = missionsQuery
                .limit(limit * 1)
                .skip((page - 1) * limit);
        }
        
        let missions = await missionsQuery;

        if (lat && lng && radius < 100) {
            missions = missions.filter(mission => {
                const distance = calculateDistance(
                    parseFloat(lat), parseFloat(lng),
                    mission.lat, mission.lng
                );
                return distance <= parseFloat(radius);
            });
        }

        const total = await Mission.countDocuments(query);

        res.json({
            missions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};