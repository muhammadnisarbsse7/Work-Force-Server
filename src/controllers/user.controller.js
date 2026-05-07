import userService from '../services/user.service.js';
import sensorService from '../services/sensor.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── GET /api/users ───────────────────────────────────────────────────────────
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: users,
  });
});

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
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
const createUser = asyncHandler(async (req, res) => {
  const { email, assignedSensor } = req.body;

  // Check if email already exists
  const existingUser = await userService.getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'User with this email already exists',
    });
  }

  const profilePhoto = req.file ? req.file.path : '';

  // Create the user
  const user = await userService.createUser({
    ...req.body,
    profilePhoto,
    sensorId: assignedSensor || null, // Store sensor ID in user
  });

  // If sensor is assigned, update the sensor
  if (assignedSensor && user) {
    // Update sensor: set isconnected to true and attach user id
    await sensorService.updateSensor(assignedSensor, {
      isconnected: true,
      attachedUser: user._id,
    });
  }

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
});

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
const updateUser = asyncHandler(async (req, res) => {
  const { email, assignedSensor } = req.body;
  const userId = req.params.id;

  // Check if email already exists (excluding current user)
  if (email) {
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser && existingUser._id.toString() !== userId) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }
  }

  // Get old user data to handle sensor changes
  const oldUser = await userService.getUserById(userId);

  const updateData = { ...req.body };
  if (req.file) {
    updateData.profilePhoto = req.file.path;
  }

  // Update sensor ID in user if assignedSensor is provided
  if (assignedSensor) {
    updateData.sensorId = assignedSensor;
  }

  const user = await userService.updateUser(userId, updateData);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Handle sensor assignment changes
  if (assignedSensor && assignedSensor !== oldUser?.sensorId?.toString()) {
    // Remove old sensor assignment if exists
    if (oldUser?.sensorId) {
      await sensorService.updateSensor(oldUser.sensorId, {
        isconnected: false,
        attachedUser: null,
      });
    }

    // Assign new sensor
    await sensorService.updateSensor(assignedSensor, {
      isconnected: true,
      attachedUser: user._id,
    });
  }

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
const deleteUser = asyncHandler(async (req, res) => {
  // Get user to find assigned sensor
  const user = await userService.getUserById(req.params.id);

  if (user && user.sensorId) {
    // Update sensor: set isconnected to false and remove attachedUser
    await sensorService.updateSensor(user.sensorId, {
      isconnected: false,
      attachedUser: null,
    });
  }

  const deletedUser = await userService.deleteUser(req.params.id);
  if (!deletedUser) {
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
const deleteManyUsers = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of user IDs',
    });
  }

  // Get all users to update their sensors
  const users = await userService.getUsersByIds(ids);

  // Update all assigned sensors
  for (const user of users) {
    if (user.sensorId) {
      await sensorService.updateSensor(user.sensorId, {
        isconnected: false,
        attachedUser: null,
      });
    }
  }

  await userService.deleteManyUsers(ids);

  res.status(200).json({
    success: true,
    message: `${ids.length} user(s) deleted successfully`,
    data: null,
  });
});

export { getAllUsers, getUserById, createUser, updateUser, deleteUser, deleteManyUsers };
