import mongoose from 'mongoose'

const violationSchema = new mongoose.Schema(
  {
    // ── Who/What violated ──────────────────────────────────────────────
    violationCategory: {
      type: String,
      enum: ['user', 'vehicle'],   // drives which DataTable shows it
      required: [true, 'Violation category is required'],
    },

    violationType: {
      type: String,
      required: [true, 'Violation type is required'],
      // User types:    Speeding | Illegal Parking | No Helmet
      // Vehicle types: Out of Assigned Area | Speeding | Illegal Parking
    },

    dateTime: {
      type: String,
      required: [true, 'Date and time is required'],
    },

    workforce: {
      type: String,
      required: [true, 'Workforce is required'],
      trim: true,
    },

    contractor: {
      type: String,
      required: [true, 'Contractor is required'],
      trim: true,
    },

    nationality: {
      type: String,
      required: [true, 'Nationality is required'],
    },

    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      trim: true,
    },

    // ── GeoFence violation details ─────────────────────────────────────
    // Triggered automatically when user/vehicle exits assigned geofence
    triggeredByGeoFence: {
      type: Boolean,
      default: false,   // true = auto-detected | false = manually added
    },

    geoFenceCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],   // [longitude, latitude] — GeoJSON format
        default: [],
      },
    },

    // ── Report review ──────────────────────────────────────────────────
    reportStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'false'],
      default: 'pending',
    },

    reportComment: {
      type: String,
      default: '',        // admin comment from EditReport textarea
    },

    // ── Linked refs (optional but useful for filtering) ────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Violation', violationSchema);