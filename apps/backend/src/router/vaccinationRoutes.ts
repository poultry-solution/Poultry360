import { Router } from 'express';
import {
  createVaccination,
  createMultiDoseVaccination,
  getBatchVaccinations,
  getUpcomingVaccinations,
  getOverdueVaccinations,
  getAllVaccinationSchedules,
  markVaccinationCompleted,
  updateVaccination,
  deleteVaccination,
  deleteVaccinationSchedule,
  getVaccinationStats,
  syncVaccinationReminders
} from '../controller/vaccinationController';
import { authMiddleware } from '../middelware/middelware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Vaccination CRUD routes
router.post('/', createVaccination);
router.post('/multi-dose', createMultiDoseVaccination);
router.get('/batch/:batchId', getBatchVaccinations);
router.get('/upcoming', getUpcomingVaccinations);
router.get('/overdue', getOverdueVaccinations);
router.get('/schedules', getAllVaccinationSchedules);
router.get('/stats', getVaccinationStats);
router.put('/:id', updateVaccination);
router.post('/:id/complete', markVaccinationCompleted);
router.delete('/:id', deleteVaccination);
router.delete('/schedule/:id', deleteVaccinationSchedule);

// Admin/utility routes
router.post('/sync-reminders', syncVaccinationReminders);

export default router;
