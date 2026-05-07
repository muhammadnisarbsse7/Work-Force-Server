import User from '../models/user.model.js';
import projectService from '../services/project.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── GET /api/projects ─────────────────────────────────────────────────────────
const getAllProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getAllProjects();
  res.status(200).json({
    success: true,
    message: 'Projects fetched successfully',
    data: projects,
  });
});

// ── GET /api/projects/:id ─────────────────────────────────────────────────────
const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Project fetched successfully',
    data: project,
  });
});

// ── POST /api/projects ────────────────────────────────────────────────────────
// AddProject page — JSON body (no file upload)
const createProject = asyncHandler(async (req, res) => {
  const { projectName, startDate, dueDate, projectDescription, location, labours, geoFence } =
    req.body;

  const userIds = labours?.map((u) => u.value) || [];
  const workforceCount = userIds.length;

  // 1. Create Project
  const project = await projectService.createProject({
    projectName,
    startDate,
    dueDate,
    projectDescription,
    location,
    labours: userIds,
    geoFence: geoFence || null,
    workforceCount,
  });

  // 2. Assign users
  if (userIds.length > 0) {
    await User.updateMany(
      { _id: { $in: userIds } },
      {
        assignedProject: project._id,
        isProjectAssigned: true,
      }
    );
  }

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: project,
  });
});

// ── PUT /api/projects/:id ─────────────────────────────────────────────────────
const updateProject = asyncHandler(async (req, res) => {
  const updateData = { ...req.body };

  // Recalculate workforceCount if labours changed
  if (req.body.labours) {
    const userIds = req.body.labours.map((l) => l.value);
    updateData.workforceCount = userIds.length;
  }

  const project = await projectService.updateProject(req.params.id, updateData);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    data: project,
  });
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
const deleteProject = asyncHandler(async (req, res) => {
  const project = await projectService.deleteProject(req.params.id);
  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
    data: null,
  });
});

// ── DELETE /api/projects/bulk-delete ─────────────────────────────────────────
const deleteManyProjects = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of project IDs',
    });
  }

  await projectService.deleteManyProjects(ids);
  res.status(200).json({
    success: true,
    message: `${ids.length} project(s) deleted successfully`,
    data: null,
  });
});

export {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  deleteManyProjects,
};
