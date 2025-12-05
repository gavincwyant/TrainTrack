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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations (dev)
- `npm run prisma:deploy` - Deploy migrations (production)
- `npm run prisma:studio` - Open Prisma Studio

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
│   └── utils.ts          # Utility functions
├── prisma/
│   └── schema.prisma     # Database schema
├── types/
│   └── next-auth.d.ts    # TypeScript type extensions
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
