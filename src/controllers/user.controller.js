import userService from '../services/user.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── GET /api/users ───────────────────────────────────────────────────────────
// Users DataTable - get all users
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: users,
  });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
// UserDetail page
const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    data: user,
  });
});

// ─── POST /api/users ──────────────────────────────────────────────────────────
// AddUser modal submit
const createUser = asyncHandler(async (req, res) => {
  const profilePhoto = req.file
    ? `/uploads/${req.file.filename}`
    : '';

  const user = await userService.createUser({
    ...req.body,
    profilePhoto,
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
// EditUser modal submit
const updateUser = asyncHandler(async (req, res) => {
  // Only override photo if a new file was uploaded
  const updateData = { ...req.body };
  if (req.file) {
    updateData.profilePhoto = `/uploads/${req.file.filename}`;
  }

  const user = await userService.updateUser(req.params.id, updateData);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
// Single row delete (DeleteIcon in Actions column)
const deleteUser = asyncHandler(async (req, res) => {
  const user = await userService.deleteUser(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
    data: null,
  });
});

// ─── DELETE /api/users/bulk-delete ───────────────────────────────────────────
// Bulk delete from DataTable header DeleteIcon (selected rows)
const deleteManyUsers = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of user IDs',
    });
  }

  await userService.deleteManyUsers(ids);

  res.status(200).json({
    success: true,
    message: `${ids.length} user(s) deleted successfully`,
    data: null,
  });
});

export {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  deleteManyUsers,
};