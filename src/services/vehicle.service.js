import Vehicle from '../models/vehicle.model.js';
import Sensor from '../models/sensor.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

class VehicleService {
  // All vehicles — DataTable with populated sensor and user data
  async getAllVehicles() {
    return await Vehicle.find()
      .populate('attachedSensor')
      .populate('attachedUser')
      .sort({ createdAt: -1 });
  }

  // Single vehicle — VehicleDetail with populated sensor and user data
  async getVehicleById(id) {
    return await Vehicle.findById(id).populate('attachedSensor').populate('attachedUser');
  }

  // Add Vehicle with sensor and user linking
  async createVehicle(data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if vehicle with same licensePlateNumber and brand already exists
      const existingVehicle = await Vehicle.findOne({
        licensePlateNumber: data.licensePlateNumber,
        brand: data.brand,
      }).session(session);

      if (existingVehicle) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('A vehicle with this license plate number and brand already exists');
      }

      // Prepare vehicle data
      const vehicleData = {
        vehicleName: data.vehicleName,
        brand: data.brand,
        identificationNumber: data.identificationNumber,
        licensePlateNumber: data.licensePlateNumber,
        color: data.color,
        assignTo: data.assignTo,
        vehicleImage: data.vehicleImage || '',
        sensor: '',
        sensorActive: false,
        attachedSensor: null,
        attachedUser: null,
      };

      // Create the vehicle
      const vehicle = await Vehicle.create([vehicleData], { session });
      const newVehicle = vehicle[0];

      // Handle user assignment if assignTo is provided (user ID)
      if (
        data.assignTo &&
        data.assignTo !== '' &&
        data.assignTo !== 'null' &&
        data.assignTo !== 'undefined'
      ) {
        const user = await User.findById(data.assignTo).session(session);

        if (!user) {
          await session.abortTransaction();
          session.endSession();
          throw new Error('User not found');
        }

        // Check if user already has a vehicle assigned
        if (user.attachedVehicle) {
          await session.abortTransaction();
          session.endSession();
          throw new Error('User already has a vehicle assigned');
        }

        // Update user with vehicle ID
        user.attachedVehicle = newVehicle._id;
        user.isVehicleAssigned = true;
        await user.save({ session });

        // Update vehicle with user ID
        newVehicle.attachedUser = user._id;
        await newVehicle.save({ session });
      }

      // Handle sensor assignment if sensor is provided
      if (
        data.sensor &&
        data.sensor !== '' &&
        data.sensor !== 'null' &&
        data.sensor !== 'undefined'
      ) {
        const sensor = await Sensor.findById(data.sensor).session(session);

        if (!sensor) {
          await session.abortTransaction();
          session.endSession();
          throw new Error('Sensor not found');
        }

        // Check if sensor is already attached to another vehicle
        if (sensor.attachedVehicle) {
          await session.abortTransaction();
          session.endSession();
          throw new Error('Sensor is already attached to another vehicle');
        }

        // Update sensor with vehicle ID and set connection status
        sensor.attachedVehicle = newVehicle._id;
        sensor.isconnected = true;
        sensor.isActive = true;
        await sensor.save({ session });

        // Update vehicle with sensor ID
        newVehicle.attachedSensor = sensor._id;
        newVehicle.sensor = sensor.uniqueId;
        newVehicle.sensorActive = true;
        await newVehicle.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      return await Vehicle.findById(newVehicle._id)
        .populate('attachedSensor')
        .populate('attachedUser');
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw error;
    }
  }

  // Edit Vehicle with sensor and user linking
  async updateVehicle(id, data) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const vehicle = await Vehicle.findById(id).session(session);
      if (!vehicle) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('Vehicle not found');
      }

      // Check for duplicate if licensePlateNumber or brand is being updated
      if (data.licensePlateNumber || data.brand) {
        const existingVehicle = await Vehicle.findOne({
          licensePlateNumber: data.licensePlateNumber || vehicle.licensePlateNumber,
          brand: data.brand || vehicle.brand,
          _id: { $ne: id },
        }).session(session);

        if (existingVehicle) {
          await session.abortTransaction();
          session.endSession();
          throw new Error('A vehicle with this license plate number and brand already exists');
        }
      }

      // Handle user assignment updates
      if (data.assignTo !== undefined) {
        const currentUserId = vehicle.attachedUser?.toString();
        const newUserId = data.assignTo;

        // If removing user assignment
        if ((newUserId === '' || newUserId === 'null' || newUserId === null) && currentUserId) {
          const oldUser = await User.findById(currentUserId).session(session);
          if (oldUser) {
            oldUser.attachedVehicle = null;
            oldUser.isVehicleAssigned = false;
            await oldUser.save({ session });
          }
          data.attachedUser = null;
        }
        // If changing to a different user
        else if (newUserId && newUserId !== 'null' && newUserId !== currentUserId) {
          // Remove old user association if exists
          if (currentUserId) {
            const oldUser = await User.findById(currentUserId).session(session);
            if (oldUser) {
              oldUser.attachedVehicle = null;
              oldUser.isVehicleAssigned = false;
              await oldUser.save({ session });
            }
          }

          // Add new user association
          const newUser = await User.findById(newUserId).session(session);
          if (!newUser) {
            await session.abortTransaction();
            session.endSession();
            throw new Error('New user not found');
          }

          if (newUser.attachedVehicle && newUser.attachedVehicle.toString() !== id) {
            await session.abortTransaction();
            session.endSession();
            throw new Error('User already has a vehicle assigned');
          }

          newUser.attachedVehicle = vehicle._id;
          newUser.isVehicleAssigned = true;
          await newUser.save({ session });

          data.attachedUser = newUser._id;
        }
      }

      // Handle sensor updates
      if (data.sensor !== undefined) {
        const currentSensorId = vehicle.attachedSensor?.toString();
        const newSensorId = data.sensor;

        // If removing sensor
        if (
          (newSensorId === '' || newSensorId === 'null' || newSensorId === null) &&
          currentSensorId
        ) {
          const oldSensor = await Sensor.findById(currentSensorId).session(session);
          if (oldSensor) {
            oldSensor.attachedVehicle = null;
            oldSensor.isconnected = false;
            oldSensor.isActive = false;
            await oldSensor.save({ session });
          }
          data.attachedSensor = null;
          data.sensor = '';
          data.sensorActive = false;
        }
        // If changing to a different sensor
        else if (newSensorId && newSensorId !== 'null' && newSensorId !== currentSensorId) {
          // Remove old sensor association if exists
          if (currentSensorId) {
            const oldSensor = await Sensor.findById(currentSensorId).session(session);
            if (oldSensor) {
              oldSensor.attachedVehicle = null;
              oldSensor.isconnected = false;
              oldSensor.isActive = false;
              await oldSensor.save({ session });
            }
          }

          // Add new sensor association
          const newSensor = await Sensor.findById(newSensorId).session(session);
          if (!newSensor) {
            await session.abortTransaction();
            session.endSession();
            throw new Error('New sensor not found');
          }

          if (newSensor.attachedVehicle && newSensor.attachedVehicle.toString() !== id) {
            await session.abortTransaction();
            session.endSession();
            throw new Error('Sensor is already attached to another vehicle');
          }

          newSensor.attachedVehicle = vehicle._id;
          newSensor.isconnected = true;
          newSensor.isActive = true;
          await newSensor.save({ session });

          data.attachedSensor = newSensor._id;
          data.sensor = newSensor.uniqueId;
          data.sensorActive = true;
        }
      }

      // Remove project field if it exists in update data
      delete data.project;

      // Update vehicle
      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true, session }
      )
        .populate('attachedSensor')
        .populate('attachedUser');

      await session.commitTransaction();
      session.endSession();

      return updatedVehicle;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw error;
    }
  }

  // Delete single vehicle and detach sensor and user
  async deleteVehicle(id) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const vehicle = await Vehicle.findById(id).session(session);
      if (!vehicle) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('Vehicle not found');
      }

      // Detach user if attached
      if (vehicle.attachedUser) {
        const user = await User.findById(vehicle.attachedUser).session(session);
        if (user) {
          user.attachedVehicle = null;
          user.isVehicleAssigned = false;
          await user.save({ session });
        }
      }

      // Detach sensor if attached
      if (vehicle.attachedSensor) {
        const sensor = await Sensor.findById(vehicle.attachedSensor).session(session);
        if (sensor) {
          sensor.attachedVehicle = null;
          sensor.isconnected = false;
          sensor.isActive = false;
          await sensor.save({ session });
        }
      }

      const deletedVehicle = await Vehicle.findByIdAndDelete(id).session(session);
      await session.commitTransaction();
      session.endSession();

      return deletedVehicle;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw error;
    }
  }

  // Bulk delete
  async deleteManyVehicles(ids) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const vehicles = await Vehicle.find({ _id: { $in: ids } }).session(session);

      for (const vehicle of vehicles) {
        // Detach user if attached
        if (vehicle.attachedUser) {
          const user = await User.findById(vehicle.attachedUser).session(session);
          if (user) {
            user.attachedVehicle = null;
            user.isVehicleAssigned = false;
            await user.save({ session });
          }
        }

        // Detach sensor if attached
        if (vehicle.attachedSensor) {
          const sensor = await Sensor.findById(vehicle.attachedSensor).session(session);
          if (sensor) {
            sensor.attachedVehicle = null;
            sensor.isconnected = false;
            sensor.isActive = false;
            await sensor.save({ session });
          }
        }
      }

      const result = await Vehicle.deleteMany({ _id: { $in: ids } }).session(session);
      await session.commitTransaction();
      session.endSession();

      return result;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw error;
    }
  }
}

export default new VehicleService();
