// src/controllers/profile.controller.js
import profileService from '../services/profile.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── GET /api/profile/me ───────────────────────────────────────────────────────
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.user._id);

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Profile not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Profile fetched successfully',
    data: profile,
  });
});

// ── PUT /api/profile/update ───────────────────────────────────────────────────
// Updates: name, city, street, phoneNumber, profilePhoto
// Email is READ ONLY — not updated here
export const updateProfile = asyncHandler(async (req, res) => {
  // Cloudinary URL if photo uploaded
  const profilePhoto = req.file ? req.file.path : undefined;

  const updated = await profileService.updateProfile(req.user._id, {
    ...req.body,
    ...(profilePhoto && { profilePhoto }),
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updated,
  });
});

// ── PUT /api/profile/update-password ─────────────────────────────────────────
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'currentPassword, newPassword and confirmPassword are required',
    });
  }

  const result = await profileService.updatePassword(req.user._id, {
    currentPassword,
    newPassword,
    confirmPassword,
  });

  res.status(200).json({
    success: true,
    message: result.message,
    data: null,
  });
});