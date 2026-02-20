# Execution Plan & Timeline (72-Hour Assessment)

This document outlines the structured approach taken to fulfill the Airman Technical Assessment requirements within the allocated 72-hour window.

## Phase 1: Planning & Architecture (Hours 0-10)
**Focus:** Understanding requirements, defining the database schema, and setting up the monorepo foundation.
- **Milestones Achieved:**
  - Initialized Turborepo structure (`apps/web`, `apps/api`, `packages/db`).
  - Drafted comprehensive PostgreSQL Prisma schema accommodating multi-tenancy (Tenants, Users, Roles) and feature domains (Courses, Quizzes, Bookings).
  - Drafted initial `README.md` and project roadmap.
  - Established Aviation-themed UI Design System (colors, components, typography).

## Phase 2: Core Infrastructure & Authentication (Hours 10-25)
**Focus:** Unlocking the application architecture by enabling secure user access, identity verification, and multi-tenancy.
- **Milestones Achieved:**
  - Configured Express API with TypeScript, Prisma, and Zod validation.
  - Implemented secure JWT-based authentication (Register, Login, strict password hashing).
  - Developed custom Frontend/Backend encryption utility to meet the "Secure Payload" sub-requirement.
  - Created initial Next.js layouts, role-based dashboards, and the Tenant administration UI.

## Phase 3: The "Maverick-lite" Learning Module (Hours 25-45)
**Focus:** Building out the educational content pipeline to support Instructor creation and Student consumption.
- **Milestones Achieved:**
  - Designed the Course -> Module -> Lesson -> Quiz database hierarchy.
  - Implemented Backend CRUD operations with `lastModifiedById` tracking.
  - Built the Frontend Learning Center interface, including Course catalog, detailed content viewer, and Instructor editing tools.
  - Integrated Tiptap Rich Text Editor for dynamic lesson creation.
  - Developed the Quiz Engine (taking quizzes, grading, duplicate option frontend validation).

## Phase 4: The "Skynet-lite" Scheduling Module (Hours 45-60)
**Focus:** Implementing the conflict-aware booking system.
- **Milestones Achieved:**
  - Created the robust `/bookings` API enforcing the strict **72-hour advance booking rule**.
  - Implemented server-side **overlap conflict detection** preventing students from double-booking or booking unavailable instructors.
  - Built the interactive Frontend Weekly Calendar view.
  - Developed the Tenant Booking Management dashboard (Approve, Assign Instructor, Cancel with automated tooltip reasoning).

## Phase 5: QA, DevOps & Finalization (Hours 60-72)
**Focus:** Satisfying the Level 1 testing and infrastructure requirements.
- **Milestones Achieved:**
  - Engineered the multi-stage Docker orchestration (`docker-compose.yml`, optimized API/Web Dockerfiles).
  - Implemented global structured error handling in Express natively mapping Prisma (`P2002`) and Zod errors to standardized HTTP formats.
  - Set up Jest & Supertest testing environments.
  - Authored comprehensive backend unit tests (`auth`, `booking`) and live-DB integration tests.
  - Defined the `.github/workflows/ci.yml` pipeline.
  - Finalized documentation (`CUTS.md`, `POSTMORTEM.md`).

## Conclusion
The strategic chunking of domains allowed for parallel frontend/backend development while ensuring that blocking requirements (Authentication, Multi-tenancy) were resolved early. The final hours were explicitly preserved for DevOps, ensuring the project is cleanly deployable and thoroughly tested.
