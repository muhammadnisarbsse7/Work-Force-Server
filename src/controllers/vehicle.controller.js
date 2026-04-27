import vehicleService from '../services/vehicle.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
const getAllVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleService.getAllVehicles();
  res.status(200).json({
    success: true,
    message: 'Vehicles fetched successfully',
    data: vehicles,
  });
});

// ── GET /api/vehicles/:id ─────────────────────────────────────────────────────
const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Vehicle fetched successfully',
    data: vehicle,
  });
});

// ── POST /api/vehicles ────────────────────────────────────────────────────────
const createVehicle = asyncHandler(async (req, res) => {
  try {
    const vehicleImage = req.file
      ? `/uploads/${req.file.filename}`
      : '';

    const vehicle = await vehicleService.createVehicle({
      ...req.body,
      vehicleImage,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle,
    });
  } catch (error) {
    // Handle E11000 duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      // Convert camelCase to Title Case (e.g. identificationNumber -> Identification number)
      const fieldName = field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists. Please use a different value.`,
        field,
      });
    }
    throw error;
  }
});

// ── PUT /api/vehicles/:id ─────────────────────────────────────────────────────
const updateVehicle = asyncHandler(async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.vehicleImage = `/uploads/${req.file.filename}`;
    }

    const vehicle = await vehicleService.updateVehicle(req.params.id, updateData);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle,
    });
  } catch (error) {
    // Handle E11000 duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      // Convert camelCase to Title Case (e.g. identificationNumber -> Identification number)
      const fieldName = field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists. Please use a different value.`,
        field,
      });
    }
    throw error;
  }
});

// ── DELETE /api/vehicles/:id ──────────────────────────────────────────────────
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.deleteVehicle(req.params.id);
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Vehicle deleted successfully',
    data: null,
  });
});

// ── DELETE /api/vehicles/bulk-delete ─────────────────────────────────────────
const deleteManyVehicles = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of vehicle IDs',
    });
  }

  await vehicleService.deleteManyVehicles(ids);
  res.status(200).json({
    success: true,
    message: `${ids.length} vehicle(s) deleted successfully`,
    data: null,
  });
});

// ── PATCH /api/vehicles/:id/toggle-sensor ────────────────────────────────────
// For the ToggleButton in VehicleDetail
const toggleSensor = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  const updated = await vehicleService.updateVehicle(req.params.id, {
    sensorActive: !vehicle.sensorActive,
  });

  res.status(200).json({
    success: true,
    message: 'Sensor toggled successfully',
    data: updated,
  });
});

export {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  deleteManyVehicles,
  toggleSensor,
};