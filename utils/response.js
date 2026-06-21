// utils/response.js

/**
 * Respuesta exitosa
 * @param {Object} res - Express response object
 * @param {any} data - Datos a enviar
 * @param {string} message - Mensaje opcional
 * @param {number} statusCode - Código HTTP (default: 200)
 */
export const successResponse = (res, data = null, message = 'Operación exitosa', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Respuesta de error
 * @param {Object} res - Express response object
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código HTTP (default: 500)
 * @param {any} errors - Detalles adicionales del error
 */
export const errorResponse = (res, message = 'Error interno del servidor', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
    });
};

/**
 * Respuesta 404 - No encontrado
 */
export const notFoundResponse = (res, entity = 'Recurso') => {
    return errorResponse(res, `${entity} no encontrado`, 404);
};

/**
 * Respuesta 403 - No autorizado
 */
export const forbiddenResponse = (res, message = 'Acceso denegado') => {
    return errorResponse(res, message, 403);
};

/**
 * Respuesta 400 - Bad request
 */
export const badRequestResponse = (res, message = 'Solicitud inválida') => {
    return errorResponse(res, message, 400);
};