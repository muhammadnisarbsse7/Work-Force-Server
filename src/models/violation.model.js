import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema(
  {
    // Category to differentiate between user and vehicle violations
    violationCategory: {
      type: String,
      enum: ['user', 'vehicle'],
      required: true,
    },

    // Common fields for both user and vehicle violations
    violationType: {
      type: String,
      required: true,
    },

    dateTime: {
      type: Date,
      required: true,
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },

    // User-specific fields
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return this.violationCategory === 'user';
      },
    },

    workforce: {
      type: String,
    },

    nationality: {
      type: String,
    },

    // Vehicle-specific fields
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: function () {
        return this.violationCategory === 'vehicle';
      },
    },

    contractor: {
      type: String,
    },

    plateNumber: {
      type: String,
    },

    // Status tracking
    resolved: {
      type: Boolean,
      default: false,
    },

    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: String,
  },
  { timestamps: true }
);

// Indexes for faster queries
violationSchema.index({ violationCategory: 1, dateTime: -1 });
violationSchema.index({ user: 1, dateTime: -1 });
violationSchema.index({ vehicle: 1, dateTime: -1 });
violationSchema.index({ severity: 1 });
violationSchema.index({ resolved: 1 });

export default mongoose.model('Violation', violationSchema);
