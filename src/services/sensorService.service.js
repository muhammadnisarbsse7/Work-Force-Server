// In your sensorservice.js file (make sure this file exists and exports these functions)

import Sensor from '../models/sensor.model.js'; // Adjust path as needed

const getSensorByUniqueId = async (uniqueId) => {
  try {
    const sensor = await Sensor.findOne({ uniqueId });
    return sensor;
  } catch (error) {
    throw new Error(`Error checking unique ID: ${error.message}`);
  }
};

const getSensorByNameAndOwner = async (sensorName, owner) => {
  try {
    const sensor = await Sensor.findOne({ sensorName, owner });
    return sensor;
  } catch (error) {
    throw new Error(`Error checking sensor name: ${error.message}`);
  }
};

// Export these functions
export {
  getSensorByUniqueId,
  getSensorByNameAndOwner,
  // ... other exports
};
