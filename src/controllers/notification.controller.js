import Notification from '../models/notification.model.js';

// Obtener notificaciones del usuario
export const getMyNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        
        const query = { userId: req.user.id };
        if (unreadOnly === 'true') query.isRead = false;

        const notifications = await Notification.find(query)
            .populate('missionId', 'title')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({ 
            userId: req.user.id, 
            isRead: false 
        });

        res.json({
            notifications,
            unreadCount,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Marcar notificación como leída
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Marcar todas como leídas
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true }
        );

        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar notificación
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        
        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId: req.user.id
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        res.json({ message: 'Notificación eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};