import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auth',
      required: true,
    },
    sensorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sensor',
    },
    assignedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    attachedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    dateOfBirth: {
      type: String,
      required: [true, 'Date of birth is required'],
    },
    nationality: {
      type: String,
      required: [true, 'Nationality is required'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      required: [true, 'Gender is required'],
    },
    profession: {
      type: String,
      enum: ['Supervisor', 'Labour'],
      required: [true, 'Profession is required'],
    },
    workingStatus: {
      type: String,
      enum: ['Working', 'On leave'],
      default: 'Working',
    },
    workingHoursStartTime: {
      type: String,
      required: [true, 'Working start time is required'],
    },
    workingHoursEndTime: {
      type: String,
      required: [true, 'Working end time is required'],
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isProjectAssigned: {
      type: Boolean,
      default: false,
    },
    isVehicleAssigned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
