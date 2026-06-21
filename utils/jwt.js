import jwt from 'jsonwebtoken';

export const generateJWT = (payload) => {
    // Converter payload para o formato esperado
    const tokenPayload = {
        id: payload.id || payload._id,
        uid: payload.id || payload._id,  // Para compatibilidade
        email: payload.email,
        nickName: payload.nickName,
        role: payload.role
    }
    
    return jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET || process.env.SECRET_KEY || 'secretkey',
        { expiresIn: '7d' }
    );
};

export const verifyJWT = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || process.env.SECRET_KEY || 'secretkey');
    } catch (error) {
        return null;
    }
};