const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deleteManyUsers,
} = require('../controllers/user.controller');

// ─── All routes protected ─────────────────────────────────────────────────────
// router.use(protect);

// ─── IMPORTANT: bulk-delete before /:id to avoid conflict ────────────────────
router.delete('/bulk-delete', deleteManyUsers);

router.get('/',     getAllUsers);
router.get('/:id',  getUserById);
router.post('/',    upload.single('profilePhoto'), createUser);
router.put('/:id',  upload.single('profilePhoto'), updateUser);
router.delete('/:id', deleteUser);

module.exports = router;