// config/init.configs.js
import mongoose from 'mongoose';  // ✅ IMPORTAR MONGOOSE
import User from '../src/models/user.model.js';
import { encrypt } from '../utils/encrypt.js';

export const initAdmin = async () => {
    try {
        // Esperar a que mongoose esté conectado
        if (mongoose.connection.readyState !== 1) {
            console.log('⏳ Esperando conexión a MongoDB...');
            await new Promise(resolve => {
                mongoose.connection.once('open', resolve);
            });
        }

        const adminExists = await User.findOne({ role: 'ADMIN' });
        if (!adminExists) {
            console.log('📝 Creating user with ADMIN role default');

            const password = process.env.PASSWORD;
            const encryptPassword = await encrypt(password);

            const adminUserDefault = new User({
                firstName: process.env.NOMBRE || 'Admin',
                lastName: process.env.APPELLIDOS || 'System',
                nickName: process.env.NICKNAME || 'admin',
                email: process.env.CORREO || 'admin@ehnet.com',
                phone: process.env.CELULAR || '+50212345678',
                password: encryptPassword,
                role: 'ADMIN',
                status: 'ACTIVE'
            });
            
            await adminUserDefault.save();
            console.log('✅ Admin user successfully created');
            console.log(`   Name: ${adminUserDefault.firstName} ${adminUserDefault.lastName}`);
            console.log(`   Email: ${adminUserDefault.email}`);
            console.log(`   Nickname: ${adminUserDefault.nickName}`);
        } else {
            console.log('⚠️ Default ADMIN already created');
        }
    } catch (e) {
        console.error('❌ Error when register ADMIN:', e.message);
        if (e.errors) {
            console.error('   Detalles:', e.errors);
        }
    }
};