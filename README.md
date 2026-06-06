# LearnBridge — Backend API

A role-based skill-learning platform built with **TypeScript**, **Express**, **PostgreSQL**, and **BetterAuth**. Handles authentication, course management, bookings, enrollments, payments, and AI-assisted features.

---

## Live

| Resource | URL |
|---|---|
| **API Base** | https://learnbridge-backend.vercel.app |
| **Frontend** | https://learnbridge-frontend-five.vercel.app |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 |
| Framework | Express 5 |
| Language | TypeScript |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon serverless) |
| Auth | BetterAuth 1.6 (email/password, Google OAuth, email OTP) |
| File Upload | Cloudinary |
| Payments | Stripe |
| Email | Nodemailer (SMTP) |
| AI | Anthropic SDK |
| Deployment | Vercel (serverless, ESM bundle via esbuild) |

---

## Roles

| Role | Permissions |
|---|---|
| **ADMIN** | Approve trainers & courses, manage categories, view platform analytics |
| **TRAINER** | Create & manage courses, view enrollments, manage bookings |
| **STUDENT** | Browse & enroll in courses, book tutors, write reviews, access AI assistant |

---

## Features

- Email/password registration with OTP email verification
- Google OAuth login (always creates STUDENT role)
- Forgot-password via OTP email
- JWT-free — session tokens managed by BetterAuth (bearer + cookie)
- Course creation, admin approval workflow, and category filtering
- Student enrollment with progress tracking
- Tutor booking with time-slot management
- Stripe payment integration
- Review & rating system
- AI-powered learning assistant (Anthropic Claude)
- Image uploads via Cloudinary
- Full-text course search with filters

---

## Project Structure

```
src/
├── config/         # Environment config
├── lib/            # Auth (BetterAuth), Prisma client, email sender
├── module/
│   ├── admin/          # Admin management
│   ├── adminCourse/    # Admin course approval
│   ├── adminDashboard/ # Platform analytics
│   ├── ai/             # AI assistant
│   ├── auth/           # Custom auth routes
│   ├── booking/        # Tutor booking & slots
│   ├── category/       # Course categories
│   ├── course/         # Trainer course CRUD
│   ├── enrollment/     # Enrollment logic
│   ├── payment/        # Stripe payments
│   ├── review/         # Reviews & ratings
│   ├── search/         # Course search
│   ├── student/        # Student course listing
│   ├── studentDashboard/
│   ├── studentEnrollment/
│   ├── trainerDashboard/
│   ├── tutor/          # Tutor profile & listing
│   └── upload/         # Cloudinary upload
├── scripts/        # Seed scripts
├── utils/          # Email templates, helpers
└── app.ts          # Express app + BetterAuth handlers
```

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Arifur999/LearnBridge-backend.git
cd learnbridge-backend
bun install
```

### 2. Configure environment

Create a `.env` file in the root:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

BETTER_AUTH_URL=http://localhost:5000/api/auth
BETTER_AUTH_SECRET=your_secret_here

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

FRONTEND_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@learnbridge.com

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Run database migration & seed

```bash
npx prisma migrate dev
bun src/scripts/seed.ts   # creates default admin account
```

### 4. Start dev server

```bash
bun run dev
```

Server runs at `http://localhost:5000`.

---

## API Reference

All routes are prefixed with `/api/v1` unless noted otherwise.

### Auth (BetterAuth managed)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/sign-up/email` | Register with email & password |
| POST | `/api/auth/sign-in/email` | Login with email & password |
| POST | `/api/auth/sign-out` | Logout |
| GET  | `/api/google-auth` | Initiate Google OAuth |
| POST | `/api/auth/email-otp/send-verification-otp` | Send verification OTP |
| POST | `/api/auth/email-otp/verify-email` | Verify email with OTP |
| POST | `/api/auth/forget-password` | Request password reset OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP token |
| GET  | `/api/auth/get-session` | Get current session |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/trainers/pending` | List pending trainer applications |
| PATCH | `/admin/trainers/:id/approve` | Approve trainer |
| PATCH | `/admin/trainers/:id/reject` | Reject trainer |
| GET | `/admin/courses/pending` | List pending courses |
| PATCH | `/admin/courses/:id/approve` | Approve course |
| PATCH | `/admin/courses/:id/reject` | Reject course |
| GET | `/admin/dashboard` | Platform analytics & stats |
| GET | `/admin/users` | List all users |
| DELETE | `/admin/users/:id` | Delete user |

### Courses (Trainer)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/trainer/courses` | Create course |
| GET | `/trainer/courses` | List trainer's courses |
| PUT | `/trainer/courses/:id` | Update course |
| DELETE | `/trainer/courses/:id` | Delete course |
| GET | `/trainer/dashboard` | Trainer analytics |

### Courses (Student/Public)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/student/courses` | Browse approved courses |
| GET | `/courses/search` | Search & filter courses |
| GET | `/categories` | List categories |

### Enrollment

| Method | Endpoint | Description |
|---|---|---|
| POST | `/student/courses/:id/enroll` | Enroll in a course |
| GET | `/student/enrollments` | View enrolled courses |
| GET | `/student/dashboard` | Student stats |

### Bookings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tutors` | List tutors |
| GET | `/tutors/:id` | Tutor profile |
| POST | `/bookings` | Book a session |
| GET | `/bookings` | My bookings |
| PATCH | `/bookings/:id` | Update booking status |

### Reviews

| Method | Endpoint | Description |
|---|---|---|
| POST | `/reviews` | Submit a review |
| GET | `/reviews/:tutorId` | Get tutor reviews |

### Payments

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/create-intent` | Create Stripe payment intent |
| POST | `/payments/webhook` | Stripe webhook (raw body) |

### Upload

| Method | Endpoint | Description |
|---|---|---|
| POST | `/upload/image` | Upload image to Cloudinary |

### AI

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/chat` | AI learning assistant (Claude) |

---

## Default Admin Account

After running the seed script:

```
Email:    admin@skillbridge.com
Password: Admin@123
```

---

## Deployment (Vercel)

The build bundles everything with esbuild into a single ESM file:

```bash
npx prisma generate && npx esbuild api/_handler.ts --bundle --packages=external --platform=node --target=node18 --format=esm --outfile=api/index.js
```

Required Vercel environment variables match the `.env` keys above, with:
- `BETTER_AUTH_URL` set to `https://learnbridge-backend.vercel.app/api/auth`
- `FRONTEND_URL` set to your deployed frontend URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for OAuth
- `DATABASE_URL` pointing to Neon production database

Add `https://learnbridge-backend.vercel.app/api/auth/callback/google` to your Google Cloud Console's **Authorized redirect URIs**.
