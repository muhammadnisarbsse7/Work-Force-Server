// src/services/profile.service.js
import Auth from '../models/auth.model.js';
import bcrypt from 'bcryptjs';

class ProfileService {
  // ── Get profile by ID ─────────────────────────────────────────────
  async getProfile(userId) {
    return await Auth.findById(userId).select(
      'name email city street phoneNumber profilePhoto role createdAt'
    );
  }

  // ── Update profile ────────────────────────────────────────────────
  async updateProfile(userId, data) {
    const { name, city, street, phoneNumber, profilePhoto } = data;

    const updateFields = {};

    if (name) updateFields.name = name.trim();
    if (city) updateFields.city = city.trim();
    if (street) updateFields.street = street.trim();
    if (phoneNumber) updateFields.phoneNumber = phoneNumber.trim();
    if (profilePhoto) updateFields.profilePhoto = profilePhoto;

    const updated = await Auth.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).select('name email city street phoneNumber profilePhoto role');

    if (!updated) throw new Error('User not found');
    return updated;
  }

  // ── Update password ───────────────────────────────────────────────
  async updatePassword(userId, { currentPassword, newPassword, confirmPassword }) {
    if (newPassword !== confirmPassword) {
      throw new Error('Passwords do not match');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Get user with password field
    const user = await Auth.findById(userId).select('+password');
    if (!user) throw new Error('User not found');

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error('Current password is incorrect');

    // Hash and save new password
    user.password = newPassword;
    await user.save();

    return { message: 'Password updated successfully' };
  }
}

export default new ProfileService();
