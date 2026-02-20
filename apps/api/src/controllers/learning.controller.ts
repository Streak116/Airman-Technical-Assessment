import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { AuditService } from '../services/audit.service';

// ─── COURSES ────────────────────────────────────────────────────────────────

export const getCourses = catchAsync(async (req: Request, res: Response) => {
    const tenantId = req.user.tenantId;
    const { search, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { tenantId };
    if (search) {
        where.title = { contains: search as string, mode: 'insensitive' };
    }

    const [courses, total] = await Promise.all([
        prisma.course.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
            include: {
                instructor: { select: { id: true, username: true } },
                lastModified: { select: { id: true, username: true } },
                _count: { select: { modules: true } }
            }
        }),
        prisma.course.count({ where })
    ]);

    res.status(200).json({
        status: 'success',
        results: courses.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: { courses }
    });
});

export const getCourse = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;

    const course = await prisma.course.findFirst({
        where: { id: req.params.id, tenantId },
        include: {
            instructor: { select: { id: true, username: true } },
            lastModified: { select: { id: true, username: true } },
            modules: {
                orderBy: { createdAt: 'asc' },
                include: {
                    lastModified: { select: { id: true, username: true } },
                    lessons: {
                        orderBy: { createdAt: 'asc' },
                        include: {
                            lastModified: { select: { id: true, username: true } },
                            quiz: {
                                include: { questions: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!course) return next(new AppError('Course not found', 404));

    res.status(200).json({ status: 'success', data: { course } });
});

export const createCourse = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { title, description } = req.body;
    const tenantId = req.user.tenantId;
    const instructorId = req.user.id;

    if (!title) return next(new AppError('Course title is required', 400));

    // Prevent duplicate course names in the same academy (case-insensitive)
    const duplicate = await prisma.course.findFirst({
        where: {
            tenantId,
            title: { equals: title, mode: 'insensitive' }
        }
    });
    if (duplicate) return next(new AppError('An academy course with this title already exists', 409));

    const course = await prisma.course.create({
        data: { title, description, tenantId, instructorId, lastModifiedById: instructorId },
        include: { instructor: { select: { id: true, username: true } } }
    });

    AuditService.log({
        action: 'Course Created',
        entity: 'Course',
        userId: req.user.id,
        tenantId,
        afterState: course,
        correlationId: req.correlationId
    });

    res.status(201).json({ status: 'success', data: { course } });
});

export const updateCourse = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;
    const instructorId = req.user.id;

    const existing = await prisma.course.findFirst({
        where: { id: req.params.id, tenantId }
    });
    if (!existing) return next(new AppError('Course not found or unauthorized', 404));

    const course = await prisma.course.update({
        where: { id: req.params.id },
        data: {
            title: req.body.title,
            description: req.body.description,
            lastModifiedById: instructorId
        }
    });

    AuditService.log({
        action: 'Course Updated',
        entity: 'Course',
        userId: req.user.id,
        tenantId,
        beforeState: existing,
        afterState: course,
        correlationId: req.correlationId
    });

    res.status(200).json({ status: 'success', data: { course } });
});

export const deleteCourse = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user.tenantId;
    const instructorId = req.user.id;

    const existing = await prisma.course.findFirst({
        where: { id: req.params.id, tenantId, instructorId }
    });
    if (!existing) return next(new AppError('Course not found or unauthorized', 404));

    await prisma.course.delete({ where: { id: req.params.id } });

    res.status(204).json({ status: 'success', data: null });
});

// ─── MODULES ────────────────────────────────────────────────────────────────

export const createModule = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { title } = req.body;
    const { courseId } = req.params;
    const tenantId = req.user.tenantId;

    if (!title) return next(new AppError('Module title is required', 400));

    // Verify course belongs to this tenant
    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) return next(new AppError('Course not found', 404));

    const module = await prisma.module.create({
        data: { title, courseId, lastModifiedById: req.user.id }
    });

    res.status(201).json({ status: 'success', data: { module } });
});

export const updateModule = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { courseId, moduleId } = req.params;
    const tenantId = req.user.tenantId;

    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) return next(new AppError('Course not found', 404));

    const module = await prisma.module.update({
        where: { id: moduleId },
        data: {
            title: req.body.title,
            lastModifiedById: req.user.id
        }
    });

    res.status(200).json({ status: 'success', data: { module } });
});

export const deleteModule = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { courseId, moduleId } = req.params;
    const tenantId = req.user.tenantId;

    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) return next(new AppError('Course not found', 404));

    await prisma.module.delete({ where: { id: moduleId } });

    res.status(204).json({ status: 'success', data: null });
});

// ─── LESSONS ────────────────────────────────────────────────────────────────

export const createLesson = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { title, content, type } = req.body; // type: 'TEXT' | 'QUIZ'
    const { courseId, moduleId } = req.params;
    const tenantId = req.user.tenantId;

    if (!title) return next(new AppError('Lesson title is required', 400));

    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) return next(new AppError('Course not found', 404));

    let lesson;

    if (type === 'QUIZ') {
        const quiz = await prisma.quiz.create({
            data: { title: `Quiz: ${title}` }
        });
        lesson = await prisma.lesson.create({
            data: { title, content, moduleId, quizId: quiz.id, lastModifiedById: req.user.id },
            include: { quiz: { include: { questions: true } } }
        });
    } else {
        lesson = await prisma.lesson.create({
            data: { title, content, moduleId, lastModifiedById: req.user.id },
            include: { quiz: true }
        });
    }

    res.status(201).json({ status: 'success', data: { lesson } });
});

export const updateLesson = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { courseId, moduleId, lessonId } = req.params;
    const tenantId = req.user.tenantId;

    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) return next(new AppError('Course not found', 404));

    const lesson = await prisma.lesson.update({
        where: { id: lessonId },
        data: {
            title: req.body.title,
            content: req.body.content,
            lastModifiedById: req.user.id
        }
    });

    res.status(200).json({ status: 'success', data: { lesson } });
});

export const deleteLesson = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { courseId, lessonId } = req.params;
    const tenantId = req.user.tenantId;

    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) return next(new AppError('Course not found', 404));

    await prisma.lesson.delete({ where: { id: lessonId } });

    res.status(204).json({ status: 'success', data: null });
});

// ─── QUIZ QUESTIONS ─────────────────────────────────────────────────────────

export const addQuestion = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { quizId } = req.params;
    const { text, options, correctOption } = req.body;

    if (!text || !options || correctOption === undefined) {
        return next(new AppError('Question text, options, and correctOption are required', 400));
    }

    if (!Array.isArray(options) || options.length < 2) {
        return next(new AppError('At least 2 options are required', 400));
    }

    // Validation for duplicate options
    const uniqueOptions = new Set(options.map(o => o.trim().toLowerCase()));
    if (uniqueOptions.size !== options.length) {
        return next(new AppError('Options must be unique (case-insensitive)', 400));
    }

    const question = await prisma.question.create({
        data: { text, options, correctOption, quizId, lastModifiedById: req.user.id }
    });

    res.status(201).json({ status: 'success', data: { question } });
});

export const updateQuestion = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { quizId, questionId } = req.params;
    const { text, options, correctOption } = req.body;

    // Verify question exists and belongs to quiz
    const existingQuestion = await prisma.question.findFirst({
        where: { id: questionId, quizId }
    });

    if (!existingQuestion) {
        return next(new AppError('Question not found in this quiz', 404));
    }

    if (options) {
        if (!Array.isArray(options) || options.length < 2) {
            return next(new AppError('At least 2 options are required', 400));
        }
        // Validation for duplicate options
        const uniqueOptions = new Set(options.map(o => o.trim().toLowerCase()));
        if (uniqueOptions.size !== options.length) {
            return next(new AppError('Options must be unique (case-insensitive)', 400));
        }
    }

    const question = await prisma.question.update({
        where: { id: questionId },
        data: {
            text,
            options,
            correctOption,
            lastModifiedById: req.user.id
        }
    });

    // Also update the quiz's last modified
    await prisma.quiz.update({
        where: { id: quizId },
        data: { lastModifiedById: req.user.id }
    });

    res.status(200).json({ status: 'success', data: { question } });
});

export const deleteQuestion = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { questionId } = req.params;

    await prisma.question.delete({ where: { id: questionId } });

    res.status(204).json({ status: 'success', data: null });
});

// ─── Quiz Attempts ───────────────────────────────────────────────────────────

export const submitQuizAttempt = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { quizId } = req.params;
    const { answers } = req.body; // { questionId: selectedOptionIndex }
    const userId = req.user.id;

    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: { questions: true }
    });

    if (!quiz) return next(new AppError('Quiz not found', 404));

    let score = 0;
    const totalQuestions = quiz.questions.length;

    // Calculate score
    quiz.questions.forEach(question => {
        const userAnswer = answers[question.id];
        if (userAnswer !== undefined && userAnswer === question.correctOption) {
            score++;
        }
    });

    const attempt = await prisma.quizAttempt.create({
        data: {
            userId,
            quizId,
            score,
            answers,
        }
    });

    res.status(201).json({
        status: 'success',
        data: {
            attempt,
            totalQuestions,
            passed: score === totalQuestions, // Strict 100% pass for aviation? Or make it configurable later.
        }
    });
});
