# 72-Hour Plan

## Schedule Breakdown

### Day 1: Foundation & Core Systems (0-24 Hours)
- **Goal**: Functional Multi-tenant Backend & Basic Frontend Setup.
- [ ] Initialize Setup: Monorepo, Docker Compose (Postgres, Redis).
- [ ] Database Schema: Define Users, Tenants, Courses, Bookings with RLS policy.
- [ ] Backend Core: Auth (JWT), RBAC Guards, Multi-tenant Middleware.
- [ ] Frontend Core: Next.js setup, shadcn/ui integration, Auth pages.

### Day 2: Features - Learning & Scheduling (24-48 Hours)
- **Goal**: "Maverick-lite" and "Skynet-lite" modules working end-to-end.
- [ ] Learning Module: Course/Lesson CRUD, Quiz taking & scoring logic.
- [ ] Scheduling Module: Booking requests, Admin approval workflow.
- [ ] Conflict Detection: Ensure no double-booking of instructors.
- [ ] Frontend: Student Dashboard, Instructor Content Creator, Admin Schedule View.

### Day 3: Polish, Operations & Submission (48-72 Hours)
- **Goal**: Level 2 Requirements (Audit Logs, Workflow Engine) & QA.
- [ ] Audit Logging: Interceptor for critical actions.
- [ ] Workflow Automation: Background jobs (BullMQ) for timeouts/escalation.
- [ ] QA: Write Unit/Integration tests.
- [ ] CI/CD: Finalize GitHub Actions pipeline.
- [ ] Documentation: Complete `README.md`, `CUTS.md`, `POSTMORTEM.md`.
- [ ] Demo: Record walkthrough video.

## Shipped Features
*(To be updated as features are completed)*

## Intentionally Cut
- (Placeholder for features we decide to skip to meet the deadline)

## Deprioritized Features (Reasoning)
- Advanced Analytics: Out of scope for "Core" system.
- Real-time Chat: High effort, low signal for this specific assessment.
