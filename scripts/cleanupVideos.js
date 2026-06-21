import { cleanExpiredVideos } from '../controllers/upload.controller.js';

(async () => {
    console.log('🧹 Iniciando limpieza manual de videos...');
    const count = await cleanExpiredVideos();
    console.log(`✅ Limpieza completada. ${count} videos eliminados.`);
    process.exit(0);
})();