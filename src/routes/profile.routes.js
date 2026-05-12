// src/routes/profile.routes.js
import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import { getProfile, updateProfile, updatePassword } from '../controllers/profile.controller.js';

const router = express.Router();

router.use(protect);

router.get('/me', getProfile);
router.put('/update', upload.single('profilePhoto'), updateProfile);
router.put('/update-password', updatePassword);

export default router;
