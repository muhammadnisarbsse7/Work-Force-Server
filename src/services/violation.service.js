import Violation from '../models/violation.model.js';

class ViolationService {

  // All user violations — UsersViolations DataTable
  async getUserViolations() {
    return await Violation.find({ violationCategory: 'user' })
      .sort({ createdAt: -1 });
  }

  // All vehicle violations — VehiclesViolations DataTable
  async getVehicleViolations() {
    return await Violation.find({ violationCategory: 'vehicle' })
      .sort({ createdAt: -1 });
  }

  // All violations — dashboard/reports summary
  async getAllViolations() {
    return await Violation.find().sort({ createdAt: -1 });
  }

  // Single violation — EditReport pre-fill
  async getViolationById(id) {
    return await Violation.findById(id);
  }

  // Create violation (manual Add OR auto geofence trigger)
  async createViolation(data) {
    return await Violation.create(data);
  }

  // Update report status + comment from EditReport
  async updateViolation(id, data) {
    return await Violation.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  // Delete single
  async deleteViolation(id) {
    return await Violation.findByIdAndDelete(id);
  }

  // Bulk delete — header DeleteIcon
  async deleteManyViolations(ids) {
    return await Violation.deleteMany({ _id: { $in: ids } });
  }

  // Update report status — Yes / False Report buttons
  async updateReportStatus(id, status, comment) {
    return await Violation.findByIdAndUpdate(
      id,
      { $set: { reportStatus: status, reportComment: comment || '' } },
      { new: true }
    );
  }
}

export default new ViolationService();