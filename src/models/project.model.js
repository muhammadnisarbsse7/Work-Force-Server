const mongoose = require('mongoose');

// Labour sub-document — stores user reference + photo snapshot
const labourSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',       // references your existing User model
  },
  label: {
    type: String,      // display name e.g. "Asif Zulfiqar"
    required: true,
  },
  value: {
    type: String,      // react-select value e.g. "asif"
    required: true,
  },
  image: {
    type: String,      // profile photo URL (optional snapshot)
    default: '',
  },
}, { _id: false });

// GeoFencing polygon coordinates from react-leaflet-draw
const geoFenceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Polygon'],
    default: 'Polygon',
  },
  coordinates: {
    type: [[[Number]]],   // GeoJSON Polygon format [[lng,lat], ...]
    default: [],
  },
}, { _id: false });

const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    startDate: {
      type: String,
      required: [true, 'Start date is required'],
    },
    dueDate: {
      type: String,
      required: [true, 'Due date is required'],
    },
    projectDescription: {
      type: String,
      required: [true, 'Project description is required'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    labours: {
      type: [labourSchema],
      default: [],
    },
    geoFence: {
      type: geoFenceSchema,
      default: null,
    },
    workforceCount: {
      type: Number,
      default: 0,     // CircularProgressBar percentage
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);