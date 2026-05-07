import Project from '../models/project.model.js';

class ProjectService {
  // All projects — DataTable
  async getAllProjects() {
    return await Project.find().sort({ createdAt: -1 });
  }

  // Single project — ProjectDetail page
  async getProjectById(id) {
    return await Project.findById(id);
  }

  // Add Project — AddProject page
  async createProject(data) {
    return await Project.create(data);
  }

  // Edit Project — EditProject modal
  async updateProject(id, data) {
    return await Project.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );
  }

  // Delete single — row DeleteIcon
  async deleteProject(id) {
    return await Project.findByIdAndDelete(id);
  }

  // Bulk delete — header DeleteIcon (selected rows)
  async deleteManyProjects(ids) {
    return await Project.deleteMany({ _id: { $in: ids } });
  }
}

export default new ProjectService();
