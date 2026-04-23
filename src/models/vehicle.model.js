const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
    },
    identificationNumber: {
      type: String,
      required: [true, 'Identification number is required'],
      unique: true,
      trim: true,
    },
    licensePlateNumber: {
      type: String,
      required: [true, 'License plate number is required'],
      unique: true,
      trim: true,
    },
    project: {
      type: String,
      required: [true, 'Project is required'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
    },
    assignTo: {
      type: String,
      required: [true, 'Assign to is required'],
    },
    sensor: {
      type: String,
      default: '',
    },
    sensorActive: {
      type: Boolean,
      default: false,       // ToggleButton state in VehicleDetail
    },
    vehicleImage: {
      type: String,
      default: '',          // stored as /uploads/filename.jpg
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);