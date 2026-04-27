import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    passportNumber: {
      type: String,
      required: [true, 'Passport/ID number is required'],
      unique: true,
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
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);