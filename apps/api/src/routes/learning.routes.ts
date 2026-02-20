import { Router } from 'express';
import * as lc from '../controllers/learning.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect);

// ─── Courses ─────────────────────────────────────────────────────────────────
// Both INSTRUCTOR and TENANT can view courses; only INSTRUCTOR can create/edit/delete
router.route('/courses')
    .get(restrictTo('INSTRUCTOR', 'TENANT', 'STUDENT'), cacheMiddleware(300), lc.getCourses)
    .post(restrictTo('INSTRUCTOR'), lc.createCourse);

router.route('/courses/:id')
    .get(restrictTo('INSTRUCTOR', 'TENANT', 'STUDENT'), cacheMiddleware(300), lc.getCourse)
    .patch(restrictTo('INSTRUCTOR'), lc.updateCourse)
    .delete(restrictTo('INSTRUCTOR'), lc.deleteCourse);

// ─── Modules ─────────────────────────────────────────────────────────────────
router.route('/courses/:courseId/modules')
    .post(restrictTo('INSTRUCTOR'), lc.createModule);

router.route('/courses/:courseId/modules/:moduleId')
    .patch(restrictTo('INSTRUCTOR'), lc.updateModule)
    .delete(restrictTo('INSTRUCTOR'), lc.deleteModule);

// ─── Lessons ─────────────────────────────────────────────────────────────────
router.route('/courses/:courseId/modules/:moduleId/lessons')
    .post(restrictTo('INSTRUCTOR'), lc.createLesson);

router.route('/courses/:courseId/modules/:moduleId/lessons/:lessonId')
    .patch(restrictTo('INSTRUCTOR'), lc.updateLesson)
    .delete(restrictTo('INSTRUCTOR'), lc.deleteLesson);

// ─── Quiz Questions ───────────────────────────────────────────────────────────
router.route('/quizzes/:quizId/questions')
    .post(restrictTo('INSTRUCTOR'), lc.addQuestion);

router.route('/quizzes/:quizId/questions/:questionId')
    .patch(restrictTo('INSTRUCTOR'), lc.updateQuestion)
    .delete(restrictTo('INSTRUCTOR'), lc.deleteQuestion);

router.route('/quizzes/:quizId/attempt')
    .post(lc.submitQuizAttempt);

export default router;
