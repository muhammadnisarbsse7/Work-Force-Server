import express from 'express';
const router  = express.Router();
import { protect } from '../middleware/auth.middleware.js';
import {
    getAllProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    deleteManyProjects,
} from '../controllers/project.controller.js';

// All routes protected
// router.use(protect);

// IMPORTANT — bulk-delete BEFORE /:id to avoid route conflict
router.delete('/bulk-delete', deleteManyProjects);

router.get('/',     getAllProjects);
router.get('/:id',  getProjectById);
router.post('/',    createProject);     // JSON body — no file upload
router.put('/:id',  updateProject);
router.delete('/:id', deleteProject);

export default router;