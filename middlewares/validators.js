import { validationResult, body, param, query } from 'express-validator';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Validaciones para Misión
export const validateMission = [
    body('title').notEmpty().withMessage('El título es requerido').isLength({ min: 3, max: 100 }),
    body('description').optional().isString(),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    body('searchRadiusKm').optional().isFloat({ min: 0.1, max: 50 }),
    body('priority').isIn(['STANDARD', 'EXPRESS', 'CRITICAL']),
    body('rewardAmount').isFloat({ min: 0 }),
    body('totalCost').isFloat({ min: 0 }),
    body('expiresAt').isISO8601().withMessage('Fecha de expiración inválida'),
    handleValidationErrors
];

// Validaciones para Evidencia
export const validateEvidence = [
    body('missionId').notEmpty().withMessage('missionId es requerido'),
    body('videoUrl').isURL().withMessage('URL de video inválida'),
    body('durationSec').optional().isInt({ min: 1 }),
    body('capturedLat').isFloat({ min: -90, max: 90 }),
    body('capturedLng').isFloat({ min: -180, max: 180 }),
    handleValidationErrors
];

// Validaciones para Rating
export const validateRating = [
    body('missionId').notEmpty().withMessage('missionId es requerido'),
    body('score').isInt({ min: 1, max: 5 }).withMessage('Puntuación debe ser 1-5'),
    body('quality').optional().isInt({ min: 1, max: 5 }),
    body('punctuality').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 500 }),
    handleValidationErrors
];

// Validaciones para Wallet
export const validateDeposit = [
    body('amount').isFloat({ min: 1 }).withMessage('Monto mínimo es 1'),
    body('paymentMethod').isIn(['CARD', 'TRANSFER', 'CASH']),
    body('paymentReference').optional().isString(),
    handleValidationErrors
];

export const validateWithdrawal = [
    body('amount').isFloat({ min: 10 }).withMessage('Monto mínimo para retiro es 10'),
    handleValidationErrors
];

// Validación para paginación
export const validatePagination = [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidationErrors
];

// Validación para ID en parámetros
export const validateIdParam = (paramName = 'id') => [
    param(paramName).isMongoId().withMessage(`${paramName} inválido`),
    handleValidationErrors
];