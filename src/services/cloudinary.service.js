import { v2 as cloudinary } from 'cloudinary';


export const connectCloudinary = async () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    console.log('✅ Cloudinary connected');
  } catch (error) {
    console.error('❌ Cloudinary connection error:', error.message);
    throw error;
  }
};


export const uploadFile = async (file, fileType = 'general') => {
  try {
    if (!file) throw new Error('No file provided');

    const result = await cloudinary.uploader.upload(file, {
      folder: `mern_uploads/${fileType}`,
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    throw error;
  }
};


export const deleteFile = async (public_id) => {
  try {
    if (!public_id) throw new Error('public_id is required');

    const result = await cloudinary.uploader.destroy(public_id);

    return result;
  } catch (error) {
    console.error('❌ Delete error:', error.message);
    throw error;
  }
};