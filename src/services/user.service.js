import User from '../models/user.model.js';
class UserService {

  // Get all users — sorted newest first
  async getAllUsers() {
    return await User.find().sort({ createdAt: -1 });
  }

  // Get single user by MongoDB _id
  async getUserById(id) {
    return await User.findById(id);
  }

  // Create new user
  async createUser(data) {
    return await User.create(data);
  }

  // Update user — returns updated doc
  async updateUser(id, data) {
    return await User.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  // Delete single user
  async deleteUser(id) {
    return await User.findByIdAndDelete(id);
  }

  // Bulk delete — from DataTable selected rows
  async deleteManyUsers(ids) {
    return await User.deleteMany({ _id: { $in: ids } });
  }
}

export default new UserService();