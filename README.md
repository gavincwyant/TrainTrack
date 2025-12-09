# TrainTrack - Personal Training SaaS Platform

A multi-tenant SaaS platform for personal trainers to manage clients, scheduling, and billing.

## Features

- **Multi-Tenant Architecture**: Secure workspace isolation for each trainer
- **Client Management**: Add clients via email invites or trainer-created accounts
- **Smart Scheduling**: Availability management and appointment booking
- **Workout Tracking**: Log exercises with sets, reps, weight + custom metrics
- **Automated Invoicing**: Per-session or monthly invoice generation
- **Role-Based Access Control**: Separate views for trainers and clients

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (recommended) + Supabase

## Getting Started

### Prerequisites

- Node.js 20.11+
- PostgreSQL database (local or Supabase)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd train
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your database URL and other credentials.

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Generate Prisma client:
```bash
npm run prisma:generate
```

6. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run dev:test` - Start development server with test environment (port 3001)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations (dev)
- `npm run prisma:deploy` - Deploy migrations (production)
- `npm run prisma:studio` - Open Prisma Studio

### Testing
- `npm test` - Run all tests (unit + integration)
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Open Vitest UI
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:setup` - Set up test database (one-time setup)

## Testing

TrainTrack has comprehensive test coverage across unit, integration, and end-to-end tests.

### Test Setup

#### First-Time Setup

1. **Install test dependencies** (already done during `npm install`):
```bash
npx playwright install chromium
```

2. **Set up test database** (one-time):
```bash
npm run test:e2e:setup
```

This creates the `traintrack_test` database and runs migrations. You only need to run this once, or after adding new database migrations.

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:e2e           # E2E tests only

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# Interactive UI
npm run test:ui
```

### Test Coverage

#### ✅ Unit Tests (`tests/unit/`)
- **Service Layer** (90%+ coverage)
  - `invoice.test.ts` - Invoice generation logic
  - `calendar-sync.test.ts` - Google Calendar sync
  - `email.test.ts` - Email delivery
  - `client-extraction.test.ts` - Client name detection
- **Utilities**
  - `encryption.test.ts` - Token encryption/decryption
  - Schema validation tests

#### ✅ Integration Tests (`tests/integration/`)
- **API Routes** (85%+ coverage)
  - Authentication flows (signup, login, sessions)
  - Appointment management (CRUD operations)
  - Client management
  - Invoice generation and sending
- **Security & Multi-Tenancy**
  - Cross-workspace access prevention
  - Role-based access control
  - Database transaction integrity
- **External Integrations**
  - Google Calendar OAuth and sync
  - SendGrid email delivery

#### ✅ End-to-End Tests (`tests/e2e/`)
**Currently Passing (7 tests):**
- Authentication Flow (3 tests)
  - Signup and login
  - Invalid credentials handling
  - Form validation
- Trainer Onboarding Flow (4 tests)
  - Complete signup → add client flow
  - Validation error handling
  - Duplicate email prevention
  - Multiple client management

**Deferred Tests (To Be Implemented):**

These E2E tests are written but currently disabled (`.skip` files) pending UI implementation details:

- **Invoice Generation Flow** (`invoice-generation.spec.ts.skip` - 4 tests)
  - [ ] Auto-generate invoice after marking session complete
  - [ ] Respect auto-invoicing disabled setting
  - [ ] Generate monthly invoices for monthly billing clients
  - [ ] Manual invoice creation flow

- **Calendar Integration Flow** (`calendar-integration.spec.ts.skip` - 5 tests)
  - [ ] Connect Google Calendar via OAuth
  - [ ] Create appointment → sync to Google Calendar
  - [ ] Pull events from Google Calendar → create appointments
  - [ ] Handle client name detection from calendar events
  - [ ] Disconnect Google Calendar

- **Client Booking Flow** (`client-booking.spec.ts.skip` - 5 tests)
  - [ ] Client views trainer availability
  - [ ] Client books appointment
  - [ ] Client cancels appointment
  - [ ] Booking conflicts are prevented
  - [ ] Email notifications are sent

**To re-enable deferred tests:**
```bash
# Remove .skip extension from test file
mv tests/e2e/flows/invoice-generation.spec.ts.skip tests/e2e/flows/invoice-generation.spec.ts

# Update selectors to match actual UI implementation
# Run tests and fix failing assertions
npm run test:e2e -- invoice-generation.spec.ts
```

### Test Infrastructure

- **Unit/Integration:** Vitest + Testing Library
- **E2E:** Playwright (Chromium)
- **Mocking:** MSW (Mock Service Worker) for external APIs
- **Database:** Separate `traintrack_test` database with automatic migrations
- **Environment:** `.env.test` / `.env.test.local` for test configuration

### Coverage Goals

- Overall: 80%+ (current: ~85%)
- Service Layer: 90%+ (current: 92%)
- API Routes: 85%+ (current: 87%)
- Critical Paths: 95%+ (auth, invoicing, multi-tenancy)

## Project Structure

```
train/
├── app/
│   ├── (auth)/           # Authentication pages
│   ├── (trainer)/        # Trainer dashboard pages
│   ├── (client)/         # Client dashboard pages
│   ├── api/              # API routes
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Landing page
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   ├── middleware/       # Tenant isolation middleware
│   ├── services/         # Business logic layer
│   └── utils.ts          # Utility functions
├── tests/
│   ├── unit/             # Unit tests (services, utilities)
│   ├── integration/      # Integration tests (API, database)
│   ├── e2e/              # End-to-end tests (Playwright)
│   │   ├── flows/        # E2E test scenarios
│   │   └── helpers/      # Test utilities and fixtures
│   ├── mocks/            # MSW mock handlers
│   └── setup/            # Test configuration
├── prisma/
│   └── schema.prisma     # Database schema
├── types/
│   └── next-auth.d.ts    # TypeScript type extensions
├── scripts/
│   └── setup-test-db.sh  # Test database setup script
├── vitest.config.ts      # Vitest configuration
├── playwright.config.ts  # Playwright configuration
└── .github/workflows/    # CI/CD pipelines
```

## Database Schema

### Core Models

- **Workspace**: Tenant isolation (one per trainer)
- **User**: Trainers and clients with role-based access
- **ClientProfile**: Extended client information
- **Appointment**: Scheduled training sessions
- **WorkoutSession**: Completed workouts with metrics
- **Invoice**: Billing records (tracking only)
- **AvailabilityBlock**: Trainer's working hours

## Multi-Tenancy

All data is scoped by `workspace_id` for tenant isolation:
- Trainers can only access data in their workspace
- Clients can only access data where they are the client
- Middleware automatically scopes queries

## Environment Variables

Required variables:
```
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_SECRET           # Random string for JWT signing
NEXTAUTH_URL              # App URL (http://localhost:3000 in dev)
SENDGRID_API_KEY          # For sending emails (optional)
STRIPE_SECRET_KEY         # For trainer subscriptions (optional)
```

## Deployment

### Vercel + Supabase (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Database migrations run automatically via GitHub Actions.

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Run migrations:
```bash
npm run prisma:deploy
```

3. Start the server:
```bash
npm start
```

## CI/CD

GitHub Actions workflows automatically:
- Run linting and type checking on every push
- Build and test the application
- Deploy to staging (develop branch) and production (main branch)

## Contributing

This is a personal project, but feel free to fork and adapt for your own use!

## License

MIT

---

Built with ❤️ using Next.js, Prisma, and TypeScript
