import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    attachedSensor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sensor',
      required: false,
      default: null,
    },
    attachedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
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
      default: false,
    },
    vehicleImage: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ licensePlateNumber: 1, brand: 1 }, { unique: true });

export default mongoose.model('Vehicle', vehicleSchema);
