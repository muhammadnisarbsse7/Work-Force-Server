import mongoose from 'mongoose';

const sensorSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auth',
      required: true,
    },
    attachedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attachedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    sensorName: {
      type: String,
      required: [true, 'Sensor name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: ['Temperature', 'Humidity', 'geolocation'],
    },
    uniqueId: {
      type: String,
      required: [true, 'Unique ID is required'],
      trim: true,
    },
    isconnected: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: false, // ToggleButton status in DataTable
    },
  },
  { timestamps: true }
);

export default mongoose.model('Sensor', sensorSchema);
