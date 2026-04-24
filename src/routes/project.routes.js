const express = require('express');
const router  = express.Router();

const { protect }             = require('../middleware/auth.middleware');
const {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  deleteManyProjects,
} = require('../controllers/project.controller');

// All routes protected
// router.use(protect);

// IMPORTANT — bulk-delete BEFORE /:id to avoid route conflict
router.delete('/bulk-delete', deleteManyProjects);

router.get('/',     getAllProjects);
router.get('/:id',  getProjectById);
router.post('/',    createProject);     // JSON body — no file upload
router.put('/:id',  updateProject);
router.delete('/:id', deleteProject);

module.exports = router;