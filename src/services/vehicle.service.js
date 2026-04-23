const Vehicle = require('../models/vehicle.model');

class VehicleService {

  // All vehicles — DataTable
  async getAllVehicles() {
    return await Vehicle.find().sort({ createdAt: -1 });
  }

  // Single vehicle — VehicleDetail
  async getVehicleById(id) {
    return await Vehicle.findById(id);
  }

  // Add Vehicle
  async createVehicle(data) {
    return await Vehicle.create(data);
  }

  // Edit Vehicle
  async updateVehicle(id, data) {
    return await Vehicle.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  // Delete single
  async deleteVehicle(id) {
    return await Vehicle.findByIdAndDelete(id);
  }

  // Bulk delete — header DeleteIcon (selected rows)
  async deleteManyVehicles(ids) {
    return await Vehicle.deleteMany({ _id: { $in: ids } });
  }
}

module.exports = new VehicleService();