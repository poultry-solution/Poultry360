import { Request, Response } from 'express';
import { getVaccinationService } from '../services/vaccinationService';
import { VaccinationStatus } from '@prisma/client';

const vaccinationService = getVaccinationService();

/**
 * Create a new vaccination
 */
export const createVaccination = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const {
      vaccineName,
      scheduledDate,
      notes,
      batchId,
      farmId,
      doseNumber,
      totalDoses,
      daysBetweenDoses
    } = req.body;

    // Validate required fields
    if (!vaccineName || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Vaccine name and scheduled date are required'
      });
    }

    const vaccination = await vaccinationService.createVaccination({
      vaccineName,
      scheduledDate: new Date(scheduledDate),
      notes,
      batchId,
      farmId,
      userId,
      doseNumber,
      totalDoses,
      daysBetweenDoses
    });

    res.status(201).json({
      success: true,
      data: vaccination
    });
  } catch (error: any) {
    console.error('Error creating vaccination:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create vaccination'
    });
  }
};

/**
 * Create multi-dose vaccination schedule
 */
export const createMultiDoseVaccination = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const {
      vaccineName,
      firstDoseDate,
      totalDoses,
      daysBetweenDoses,
      notes,
      batchId,
      farmId
    } = req.body;

    // Validate required fields
    if (!vaccineName || !firstDoseDate || !totalDoses || !daysBetweenDoses) {
      return res.status(400).json({
        success: false,
        error: 'Vaccine name, first dose date, total doses, and days between doses are required'
      });
    }

    if (totalDoses < 2) {
      return res.status(400).json({
        success: false,
        error: 'Total doses must be at least 2 for multi-dose vaccination'
      });
    }

    const vaccinations = await vaccinationService.createMultiDoseVaccination({
      vaccineName,
      firstDoseDate: new Date(firstDoseDate),
      totalDoses,
      daysBetweenDoses,
      notes,
      batchId,
      farmId,
      userId
    });

    res.status(201).json({
      success: true,
      data: vaccinations,
      message: `Created ${vaccinations.length} vaccination doses`
    });
  } catch (error: any) {
    console.error('Error creating multi-dose vaccination:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create multi-dose vaccination'
    });
  }
};

/**
 * Get vaccinations for a specific batch
 */
export const getBatchVaccinations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { batchId } = req.params;

    const vaccinations = await vaccinationService.getBatchVaccinations(batchId, userId);

    res.json({
      success: true,
      data: vaccinations
    });
  } catch (error: any) {
    console.error('Error getting batch vaccinations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get batch vaccinations'
    });
  }
};

/**
 * Get upcoming vaccinations for the user
 */
export const getUpcomingVaccinations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { days = '7' } = req.query;

    const vaccinations = await vaccinationService.getUpcomingVaccinations(userId, parseInt(days as string));

    res.json({
      success: true,
      data: vaccinations
    });
  } catch (error: any) {
    console.error('Error getting upcoming vaccinations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upcoming vaccinations'
    });
  }
};

/**
 * Get overdue vaccinations
 */
export const getOverdueVaccinations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const vaccinations = await vaccinationService.getOverdueVaccinations(userId);

    res.json({
      success: true,
      data: vaccinations
    });
  } catch (error: any) {
    console.error('Error getting overdue vaccinations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get overdue vaccinations'
    });
  }
};

/**
 * Mark vaccination as completed
 */
export const markVaccinationCompleted = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    const vaccination = await vaccinationService.markVaccinationCompleted(id, userId);

    res.json({
      success: true,
      data: vaccination,
      message: 'Vaccination marked as completed'
    });
  } catch (error: any) {
    console.error('Error marking vaccination as completed:', error);
    
    if (error.message === 'Vaccination not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark vaccination as completed'
    });
  }
};

/**
 * Update vaccination
 */
export const updateVaccination = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Convert dates to Date objects if provided
    if (updateData.scheduledDate) {
      updateData.scheduledDate = new Date(updateData.scheduledDate);
    }
    if (updateData.completedDate) {
      updateData.completedDate = new Date(updateData.completedDate);
    }

    const vaccination = await vaccinationService.updateVaccination(id, userId, updateData);

    res.json({
      success: true,
      data: vaccination
    });
  } catch (error: any) {
    console.error('Error updating vaccination:', error);
    
    if (error.message === 'Vaccination not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update vaccination'
    });
  }
};

/**
 * Delete vaccination
 */
export const deleteVaccination = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    await vaccinationService.deleteVaccination(id, userId);

    res.json({
      success: true,
      message: 'Vaccination deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting vaccination:', error);
    
    if (error.message === 'Vaccination not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete vaccination'
    });
  }
};

/**
 * Delete entire vaccination schedule
 */
export const deleteVaccinationSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    await vaccinationService.deleteVaccinationSchedule(id, userId);

    res.json({
      success: true,
      message: 'Vaccination schedule deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting vaccination schedule:', error);
    
    if (error.message === 'Vaccination schedule not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete vaccination schedule'
    });
  }
};

/**
 * Get all vaccination schedules (grouped by vaccine name and context)
 */
export const getAllVaccinationSchedules = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const schedules = await vaccinationService.getAllVaccinationSchedules(userId);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error: any) {
    console.error('Error getting vaccination schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vaccination schedules'
    });
  }
};

/**
 * Get vaccination statistics
 */
export const getVaccinationStats = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const stats = await vaccinationService.getVaccinationStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting vaccination stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vaccination statistics'
    });
  }
};

/**
 * Sync vaccination reminders (admin endpoint)
 */
export const syncVaccinationReminders = async (req: Request, res: Response) => {
  try {
    await vaccinationService.syncVaccinationReminders();

    res.json({
      success: true,
      message: 'Vaccination reminders synced successfully'
    });
  } catch (error: any) {
    console.error('Error syncing vaccination reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync vaccination reminders'
    });
  }
};
