import violationService from '../services/violation.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── GET /api/violations/users ─────────────────────────────────────────────────
const getUserViolations = asyncHandler(async (req, res) => {
  const violations = await violationService.getUserViolations();
  res.status(200).json({
    success: true,
    message: 'User violations fetched successfully',
    data: violations,
  });
});

// ── GET /api/violations/vehicles ──────────────────────────────────────────────
const getVehicleViolations = asyncHandler(async (req, res) => {
  const violations = await violationService.getVehicleViolations();
  res.status(200).json({
    success: true,
    message: 'Vehicle violations fetched successfully',
    data: violations,
  });
});

// ── GET /api/violations ───────────────────────────────────────────────────────
const getAllViolations = asyncHandler(async (req, res) => {
  const violations = await violationService.getAllViolations();
  res.status(200).json({
    success: true,
    message: 'All violations fetched successfully',
    data: violations,
  });
});

// ── GET /api/violations/:id ───────────────────────────────────────────────────
const getViolationById = asyncHandler(async (req, res) => {
  const violation = await violationService.getViolationById(req.params.id);
  if (!violation) {
    return res.status(404).json({ success: false, message: 'Violation not found' });
  }
  res.status(200).json({
    success: true,
    message: 'Violation fetched successfully',
    data: violation,
  });
});

// ── POST /api/violations ──────────────────────────────────────────────────────
// Used by AddViolatedUser + AddViolatedVehicle modals
// Also called internally when geofence breach detected
const createViolation = asyncHandler(async (req, res) => {
  const {
    violationCategory,   // 'user' | 'vehicle'
    violationType,
    dateTime,
    workforce,
    contractor,
    nationality,
    plateNumber,
    triggeredByGeoFence,
    geoFenceCoordinates,
    userId,
    vehicleId,
  } = req.body;

  const violation = await violationService.createViolation({
    violationCategory,
    violationType,
    dateTime,
    workforce,
    contractor,
    nationality,
    plateNumber,
    triggeredByGeoFence: triggeredByGeoFence || false,
    geoFenceCoordinates: geoFenceCoordinates || null,
    userId:    userId    || null,
    vehicleId: vehicleId || null,
    reportStatus: 'pending',
  });

  res.status(201).json({
    success: true,
    message: 'Violation created successfully',
    data: violation,
  });
});

// ── PUT /api/violations/:id ───────────────────────────────────────────────────
const updateViolation = asyncHandler(async (req, res) => {
  const violation = await violationService.updateViolation(req.params.id, req.body);
  if (!violation) {
    return res.status(404).json({ success: false, message: 'Violation not found' });
  }
  res.status(200).json({
    success: true,
    message: 'Violation updated successfully',
    data: violation,
  });
});

// ── PATCH /api/violations/:id/report ─────────────────────────────────────────
// EditReport — "Yes" = confirmed | "False Report" = false
const updateReportStatus = asyncHandler(async (req, res) => {
  const { status, comment } = req.body;

  if (!['pending', 'confirmed', 'false'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be pending | confirmed | false',
    });
  }

  const violation = await violationService.updateReportStatus(
    req.params.id,
    status,
    comment
  );

  if (!violation) {
    return res.status(404).json({ success: false, message: 'Violation not found' });
  }

  res.status(200).json({
    success: true,
    message: `Report marked as ${status}`,
    data: violation,
  });
});

// ── DELETE /api/violations/:id ────────────────────────────────────────────────
const deleteViolation = asyncHandler(async (req, res) => {
  const violation = await violationService.deleteViolation(req.params.id);
  if (!violation) {
    return res.status(404).json({ success: false, message: 'Violation not found' });
  }
  res.status(200).json({
    success: true,
    message: 'Violation deleted successfully',
    data: null,
  });
});

// ── DELETE /api/violations/bulk-delete ───────────────────────────────────────
const deleteManyViolations = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of violation IDs',
    });
  }

  await violationService.deleteManyViolations(ids);
  res.status(200).json({
    success: true,
    message: `${ids.length} violation(s) deleted successfully`,
    data: null,
  });
});

export {
  getUserViolations,
  getVehicleViolations,
  getAllViolations,
  getViolationById,
  createViolation,
  updateViolation,
  updateReportStatus,
  deleteViolation,
  deleteManyViolations,
};