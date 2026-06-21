'use strict'
import User from "../src/models/user.model.js"
import jwt from 'jsonwebtoken'

export const validateToken = async (req, res, next) => {
    try {
        // Buscar token en cookies OU no header
        let token = req.cookies.access_token
        
        if (!token && req.headers.authorization) {
            token = req.headers.authorization.replace('Bearer ', '')
        }
        
        if (!token) {
            return res.status(401).send({
                success: false,
                message: 'Unauthorized - No token provided'
            })
        }
        
        const decoded = jwt.verify(token, process.env.SECRET_KEY || process.env.JWT_SECRET || 'secretkey')
        
        // O token pode ter 'id' ou 'uid'
        const userId = decoded.id || decoded.uid
        const user = await User.findById(userId)
        
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'User not found - unauthorized'
            })
        }
        
        if (user.status !== 'ACTIVE') {
            return res.status(401).send({
                success: false,
                message: 'User account is not active'
            })
        }

        req.user = {
            id: user._id,
            uid: user._id,
            _id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            nickName: user.nickName,
            phone: user.phone,
            // También incluir datos del token por si acaso
            ...decoded
        }
        
        req.userId = user._id
        req.token = token
        
        next()
    } catch (error) {
        console.error(error)
        return res.status(401).send({
            success: false,
            message: 'Unauthorized - Invalid token'
        })
    }
}

export const isAdmin = (req, res, next) => {
    try {
        const { user } = req
        if (!user || user.role !== 'ADMIN') {
            return res.status(403).send({
                success: false,
                message: `Access denied. User is not an ADMIN`
            })
        }
        next()
    } catch (e) {
        console.error(e);
        return res.status(403).send({
            success: false,
            message: 'Error with authorization'
        })
    }
}