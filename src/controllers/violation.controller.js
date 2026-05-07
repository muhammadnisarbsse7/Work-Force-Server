// violationController.js
// import Violation from '../models/Violation.js';
// import User from '../models/User.js';
// import Vehicle from '../models/Vehicle.js';
import Violation from '../models/violation.model.js';
import User from '../models/user.model.js';
import Vehicle from '../models/vehicle.model.js';

// Add new violation
export const addViolation = async (req, res) => {
  try {
    const {
      violationCategory,
      violationType,
      dateTime,
      severity,
      user,
      workforce,
      nationality,
      vehicle,
      contractor,
      plateNumber,
    } = req.body;

    // Validate required fields based on category
    if (violationCategory === 'user') {
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'User is required for user violation',
        });
      }

      // Check if user exists
      const existingUser = await User.findById(user);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
    } else if (violationCategory === 'vehicle') {
      if (!vehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle is required for vehicle violation',
        });
      }

      // Check if vehicle exists
      const existingVehicle = await Vehicle.findById(vehicle);
      if (!existingVehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid violation category. Must be "user" or "vehicle"',
      });
    }

    // Create violation
    const violation = new Violation({
      violationCategory,
      violationType,
      dateTime,
      severity,
      user: violationCategory === 'user' ? user : undefined,
      workforce: violationCategory === 'user' ? workforce : undefined,
      nationality: violationCategory === 'user' ? nationality : undefined,
      vehicle: violationCategory === 'vehicle' ? vehicle : undefined,
      contractor: violationCategory === 'vehicle' ? contractor : undefined,
      plateNumber: violationCategory === 'vehicle' ? plateNumber : undefined,
    });

    await violation.save();

    // Populate references for response
    let populatedViolation = violation._doc;
    if (violationCategory === 'user' && user) {
      const populated = await Violation.findById(violation._id).populate('user', 'fullName email');
      populatedViolation = populated;
    } else if (violationCategory === 'vehicle' && vehicle) {
      const populated = await Violation.findById(violation._id).populate(
        'vehicle',
        'vehicleName plateNumber'
      );
      populatedViolation = populated;
    }

    res.status(201).json({
      success: true,
      message: 'Violation added successfully',
      data: populatedViolation,
    });
  } catch (error) {
    console.error('Error adding violation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add violation',
      error: error.message,
    });
  }
};

// Get all violations with filters
export const getViolations = async (req, res) => {
  try {
    const {
      violationCategory,
      severity,
      resolved,
      startDate,
      endDate,
      user,
      vehicle,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter object
    const filter = {};

    if (violationCategory) filter.violationCategory = violationCategory;
    if (severity) filter.severity = severity;
    if (resolved !== undefined) filter.resolved = resolved === 'true';
    if (user) filter.user = user;
    if (vehicle) filter.vehicle = vehicle;

    // Date range filter
    if (startDate || endDate) {
      filter.dateTime = {};
      if (startDate) filter.dateTime.$gte = new Date(startDate);
      if (endDate) filter.dateTime.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const violations = await Violation.find(filter)
      .populate('user', 'fullName email')
      .populate('vehicle', 'vehicleName plateNumber')
      .populate('resolvedBy', 'fullName')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Violation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: violations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch violations',
      error: error.message,
    });
  }
};

// Get violation by ID
export const getViolationById = async (req, res) => {
  try {
    const { id } = req.params;

    const violation = await Violation.findById(id)
      .populate('user', 'fullName email')
      .populate('vehicle', 'vehicleName plateNumber')
      .populate('resolvedBy', 'fullName');

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: 'Violation not found',
      });
    }

    res.status(200).json({
      success: true,
      data: violation,
    });
  } catch (error) {
    console.error('Error fetching violation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch violation',
      error: error.message,
    });
  }
};

// Update violation
export const updateViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const violation = await Violation.findByIdAndUpdate(
      id,
      { ...updateData },
      { new: true, runValidators: true }
    )
      .populate('user', 'fullName email')
      .populate('vehicle', 'vehicleName plateNumber');

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: 'Violation not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Violation updated successfully',
      data: violation,
    });
  } catch (error) {
    console.error('Error updating violation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update violation',
      error: error.message,
    });
  }
};

// Resolve violation
export const resolveViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, notes } = req.body;

    const violation = await Violation.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        notes,
      },
      { new: true, runValidators: true }
    );

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: 'Violation not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Violation resolved successfully',
      data: violation,
    });
  } catch (error) {
    console.error('Error resolving violation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve violation',
      error: error.message,
    });
  }
};

// Delete violation
export const deleteViolation = async (req, res) => {
  try {
    const { id } = req.params;

    const violation = await Violation.findByIdAndDelete(id);

    if (!violation) {
      return res.status(404).json({
        success: false,
        message: 'Violation not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Violation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting violation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete violation',
      error: error.message,
    });
  }
};

// Get violation statistics
export const getViolationStats = async (req, res) => {
  try {
    const { violationCategory } = req.query;

    const filter = {};
    if (violationCategory) filter.violationCategory = violationCategory;

    const stats = await Violation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            severity: '$severity',
            violationCategory: '$violationCategory',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.violationCategory',
          severityStats: {
            $push: {
              severity: '$_id.severity',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
    ]);

    const resolvedStats = await Violation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$resolved',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        severityBreakdown: stats,
        resolvedBreakdown: resolvedStats,
      },
    });
  } catch (error) {
    console.error('Error fetching violation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};
