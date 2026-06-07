import express from 'express';
import * as authCtrl from '../controllers/authController.js';
import * as quizCtrl from '../controllers/quizController.js';
import * as adminCtrl from '../controllers/adminController.js';
import { uploadImage, uploadMiddleware } from '../controllers/uploadController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Auth
router.post('/auth/login', authCtrl.login);
router.post('/auth/register', authCtrl.register);
router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// User Quiz & Attempts
router.get('/quizzes', requireAuth, quizCtrl.getQuizzes);
router.post('/quizzes/:quizId/start', requireAuth, quizCtrl.startAttempt);
router.post('/attempts/:attemptId/submit', requireAuth, quizCtrl.submitAnswer);
router.post('/attempts/:attemptId/complete', requireAuth, quizCtrl.completeAttempt);

// History Routes
router.get('/attempts', requireAuth, quizCtrl.getUserAttempts); 
router.get('/attempts/:attemptId', requireAuth, quizCtrl.getAttemptById);
router.delete('/attempts/:attemptId', requireAuth, quizCtrl.deleteAttempt); // <-- NEW DELETE ROUTE

// Admin Uploads
router.post('/uploads/image', requireAuth, requireAdmin, uploadMiddleware, uploadImage);

// Admin Management
router.get('/admin/quizzes', requireAuth, requireAdmin, adminCtrl.getAllQuizzes);
router.post('/admin/quizzes', requireAuth, requireAdmin, adminCtrl.createQuiz);
router.put('/admin/quizzes/:id', requireAuth, requireAdmin, adminCtrl.updateQuiz);
router.delete('/admin/quizzes/:id', requireAuth, requireAdmin, adminCtrl.deleteQuiz);
router.get('/admin/reviews', requireAuth, requireAdmin, adminCtrl.getPendingReviews);
router.patch('/admin/attempts/:attemptId/answers/:answerId/evaluate', requireAuth, requireAdmin, adminCtrl.evaluateAnswer);

export default router;