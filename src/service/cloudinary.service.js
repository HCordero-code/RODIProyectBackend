// src/service/cloudinary.service.js
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

export const uploadVideoToCloudinary = (buffer, folder = 'evidence') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: folder,
        public_id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  } catch (error) {
    console.error('Error eliminando video de Cloudinary:', error);
    return null;
  }
};

export default cloudinary;