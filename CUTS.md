# Cuts & Deprioritizations (Level 2 Features)

To successfully meet the 72-hour constraint while ensuring the highest level of quality and stability for all **Level 1** and mandatory **Level 2** requirements, several high-signal bonus features and non-critical infrastructural additions were consciously deprioritized.

## 1. Offline-First Quiz Attempts (Sync Later)
- **Why it was cut:** Implementing truly robust offline synchronization logic (using Service Workers and IndexedDB) adds massive complexity to the frontend architecture. Resolving conflicts if an instructor updates a quiz while a student takes it offline exceeded the safe scope of an MVP.
- **Future implementation:** Utilize `@tanstack/react-query`'s offline mutation cache and a dedicated sync-engine web worker that flushes stored IndexedDB attempts upon reconnecting.

## 2. Telemetry Ingestion Stub (JSON Flight Logs)
- **Why it was cut:** We actively built an extensive **Aviation-Grade Audit Log** middleware that intercepts and traces all critical human actions (Course creation, Booking escalations, Role changes) natively writing JSON diffs to the database. Building a second ingestion stub for physical flight telemetry felt redundant for the assessment's timeline when the core logging mechanism was already proven.
- **Future implementation:** Create a high-throughput microservice or AWS serverless function specifically designed to buffer rapid IoT flight JSON packets into a time-series DB like InfluxDB or timescale.

## 3. Role-Based Feature Flags
- **Why it was cut:** The strict static RBAC (Student / Instructor / Admin) natively governed access to specific Next.js sub-routes and protected Express API endpoints perfectly. Dynamic feature flagging (e.g., using LaunchDarkly or GrowthBook) wasn't necessary for the current static feature set.
- **Future implementation:** Implement a table structure for `FeatureFlags` associated by `tenantId` to allow gradual rollouts of new Learning Center modules to specific flight schools before global release.

## 4. Comprehensive Frontend E2E Testing (Cypress)
- **Why it was cut:** The assessment explicitly prioritized **backend** testing (protecting Auth, conflict detection, RBAC). Integrating Playwright/Cypress into the GitHub Actions CI pipeline would significantly slow down build times and introduce potential flakiness regarding exact UI selectors during the rapid iteration phase.
- **Future implementation:** Add Cypress test scripts verifying the full user journey: Registering -> Instructor Creating Course -> Student Taking Quiz -> Admin Escalating Booking.

## 5. Physical Email Notification Microservice
- **Why it was cut:** For the Workflow Engine, we implemented a robust BullMQ background job processor running on Redis that successfully triggers delayed Escalation events. We utilized clear `console.log` stubbing for the final Email/SMS output to satisfy the automation requirement without needing to orchestrate third-party API keys (SendGrid/Twilio).
