export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const ENDPOINTS = {
    AUTH: {
        LOGIN: `${API_BASE_URL}/auth/login`,
        REGISTER: `${API_BASE_URL}/auth/register`,
        LOGOUT: `${API_BASE_URL}/auth/logout`,
    },
    TENANTS: {
        BASE: `${API_BASE_URL}/tenants`,
    },
    LEARNING: {
        COURSES: `${API_BASE_URL}/learning/courses`,
        COURSE: (id: string) => `${API_BASE_URL}/learning/courses/${id}`,
        MODULES: (courseId: string) => `${API_BASE_URL}/learning/courses/${courseId}/modules`,
        MODULE: (courseId: string, moduleId: string) => `${API_BASE_URL}/learning/courses/${courseId}/modules/${moduleId}`,
        LESSONS: (courseId: string, moduleId: string) => `${API_BASE_URL}/learning/courses/${courseId}/modules/${moduleId}/lessons`,
        LESSON: (courseId: string, moduleId: string, lessonId: string) => `${API_BASE_URL}/learning/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
        QUIZ_QUESTIONS: (quizId: string) => `${API_BASE_URL}/learning/quizzes/${quizId}/questions`,
        QUIZ_QUESTION: (quizId: string, questionId: string) => `${API_BASE_URL}/learning/quizzes/${quizId}/questions/${questionId}`,
    },
};
