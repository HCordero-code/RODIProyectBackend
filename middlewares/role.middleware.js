/**
 * Middleware para verificar roles de usuario
 * @param {...string} roles - Roles permitidos
 * @returns {Function} Middleware de Express
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'No autenticado' 
            });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}` 
            });
        }
        
        next();
    };
};

/**
 * Middleware para verificar que el usuario es ADMIN
 */
export const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            message: 'No autenticado' 
        });
    }
    
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ 
            success: false,
            message: 'Acceso denegado. Se requiere rol ADMIN' 
        });
    }
    
    next();
};