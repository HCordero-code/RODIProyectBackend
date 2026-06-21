import cron from 'node-cron';
import { cleanExpiredVideos } from '../controllers/upload.controller.js';

// Ejecutar cada hora
cron.schedule('0 * * * *', async () => {
    console.log('🔄 Ejecutando limpieza de videos expirados...');
    const count = await cleanExpiredVideos();
    console.log(`📊 ${count} videos eliminados en esta limpieza`);
});

// También ejecutar al iniciar el servidor
export const initCleanupJob = () => {
    console.log('🗑️ Limpieza de videos programada (cada hora)');
    // Ejecutar limpieza inicial
    setTimeout(() => cleanExpiredVideos(), 5000);
};