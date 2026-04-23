const mongoose = require('mongoose');

const sensorSchema = new mongoose.Schema(
  {
    sensorName: {
      type: String,
      required: [true, 'Sensor name is required'],
      trim: true,
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      enum: ['Temperature', 'Humidity'],
    },
    ip: {
      type: String,
      required: [true, 'IP address is required'],
      trim: true,
    },
    port: {
      type: String,
      required: [true, 'Port is required'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,   // ToggleButton status in DataTable
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sensor', sensorSchema);