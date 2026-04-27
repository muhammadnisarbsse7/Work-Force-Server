import asyncHandler from '../utils/asyncHandler.js';

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  res.status(200).json({
    success: true,
    imageUrl: req.file.path,      // Cloudinary URL
    public_id: req.file.filename, // Save this for delete
  });
});