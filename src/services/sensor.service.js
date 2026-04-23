const Sensor = require('../models/sensor.model');

class SensorService {

  // All sensors — DataTable
  async getAllSensors() {
    return await Sensor.find().sort({ createdAt: -1 });
  }

  // Single sensor — EditSensor pre-fill
  async getSensorById(id) {
    return await Sensor.findById(id);
  }

  // Add Sensor
  async createSensor(data) {
    return await Sensor.create(data);
  }

  // Edit Sensor
  async updateSensor(id, data) {
    return await Sensor.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  // Delete single
  async deleteSensor(id) {
    return await Sensor.findByIdAndDelete(id);
  }

  // Bulk delete — header DeleteIcon
  async deleteManySensors(ids) {
    return await Sensor.deleteMany({ _id: { $in: ids } });
  }

  // Toggle isActive — ToggleButton in DataTable row
  async toggleStatus(id) {
    const sensor = await Sensor.findById(id);
    if (!sensor) return null;
    sensor.isActive = !sensor.isActive;
    return await sensor.save();
  }
}

module.exports = new SensorService();