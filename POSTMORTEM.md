# Project Postmortem

## 1. What Went Well
- **Prisma & TypeScript Synergy:** Utilizing Prisma as the ORM drastically accelerated backend development. Type-safe relationships (e.g., nesting Modules inside Courses) and rapid database migrations made iterating on the complex Learning and Scheduling schemas extremely fluid.
- **Level 2 Implementations:** Integrating BullMQ with Redis for background queueing and scheduling successfully tackled the complex "Workflow Engine" requirement. Building custom global middlewares for caching, rate-limiting, and Audit diff-tracking natively satisfied the core aviation-grade enterprise requirements without polluting controllers.
- **Frontend Agility:** The unified UI Design system provided immediate returns, enabling complex dynamic features (Rich Text editing, Calendars, Paginated lists) to be styled beautifully with minimal overhead.

## 2. Challenges & Roadblocks (What Went Wrong)
- **Docker Production vs. Development Discrepancies:** One major roadblock occurred deploying the Backend API to Railway (Cloud). The initial `Dockerfile` relied on `npx prisma migrate deploy` which silently failed because the local SQL migration artifacts weren't committed to Git. Furthermore, attempting to run database seeder scripts inside the production container crashed due to missing `ts-node` module resolution contexts in strict Linux Alpine environments. Ultimately, solving this required leaning on Prisma's `db push` strategy (for schema syncing) and configuring explicit external database connection URLs to seed production securely from a local terminal.
- **Conflict Management Algorithms:** Implementing the "Skynet" overlapping conflict detection natively inside PostgreSQL required carefully constructing Prisma's nested `OR` conditions (`{ startTime: { lt: end }, endTime: { gt: start } }`). Ensuring this accurately detected back-to-back overlaps without rejecting perfectly matching sequential bounds took significant unit-testing refinement.
- **Managing Multi-Tenant Scopes:** Natively ensuring `tenantId` scoping across every single database query is risky. A forgotten `where: { tenantId }` in one endpoint immediately breaks data isolation.

## 3. What I Would Improve With One More Week
- **Centralized Table-Agnostic Workflow Engine:** The current BullMQ execution engine is hardcoded to specifically process delayed `Booking Escalations`. I would refactor this into a generalized event-driven state machine where *any* entity transition (e.g., Course Approval, User Promotion) could attach configurable delayed job triggers.
- **Polymorphic Audit Logging:** Currently, the system utilizes a single monolithic `AuditLog` table. This is robust but unoptimized. I would split this into dedicated tables per entity (e.g., `BookingAuditLogs`, `CourseAuditLogs`) to dramatically optimize indexing speeds during historical forensic queries.
- **Real-Time Websockets:** Implementing Socket.io to push live Schedule assignments and Workflow Escalation alerts directly to the Tenant Administrator's dashboard, rather than relying on manual page refreshes or standard fetches.
