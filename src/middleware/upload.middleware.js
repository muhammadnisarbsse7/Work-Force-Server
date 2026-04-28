import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';



const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'work-force',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});


const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP files are allowed'), false);
  }
};


const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});


// Fallback for 'file' field
export const singleUpload = upload.single('file');


// Specific for vehicle image
export const vehicleUpload = upload.single('vehicleImage');


// Specific for user profile photo
export const userUpload = upload.single('profilePhoto');


export const multiUpload = upload.array('files', 5);

export default upload;