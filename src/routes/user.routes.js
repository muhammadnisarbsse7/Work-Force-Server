import express from 'express';
const router = express.Router();

import upload from '../middleware/upload.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deleteManyUsers,
} from '../controllers/user.controller.js';

// ─── All routes protected ─────────────────────────────────────────────────────
// router.use(protect);

// ─── IMPORTANT: bulk-delete before /:id to avoid conflict ────────────────────
router.delete('/bulk-delete', deleteManyUsers);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', upload.single('profilePhoto'), createUser);
router.put('/:id', upload.single('profilePhoto'), updateUser);
router.delete('/:id', deleteUser);

export default router;
