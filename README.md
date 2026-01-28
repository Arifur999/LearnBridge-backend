# LearnBridge Backend

LearnBridge is a role-based skill learning platform backend built with
TypeScript, Express, PostgreSQL, and Prisma.

## 🚀 Features
- JWT Authentication
- Role-based Authorization (Admin / Trainer / Student)
- Trainer approval by Admin
- Course creation & approval workflow
- Student enrollment system
- Search, filter & pagination
- Dashboard stats (Admin / Trainer / Student)

## 🧱 Tech Stack
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT, bcrypt

## 🔐 Roles
- **Admin**: Approve trainers & courses, view dashboard stats
- **Trainer**: Create courses, view enrollments
- **Student**: Browse courses, enroll, view enrolled courses

Run Locally

```
npm install
npx prisma migrate dev
npm run dev
```
API Base URL
```
http://localhost:5000/api/v1

```

---

# 📮 API DOCUMENTATION (Endpoints)

## 🔐 AUTH
| Method | Endpoint | Description |
|------|---------|-------------|
| POST | `/auth/register` | Register Student / Trainer |
| POST | `/auth/login` | Login user |

---

## 🧑‍⚖️ ADMIN
| Method | Endpoint | Description |
|------|---------|-------------|
| GET | `/admin/trainers/pending` | Pending trainers |
| PATCH | `/admin/trainers/:id/approve` | Approve trainer |
| GET | `/admin/courses/pending` | Pending courses |
| PATCH | `/admin/courses/:id/approve` | Approve course |
| PATCH | `/admin/courses/:id/reject` | Reject course |
| GET | `/admin/dashboard` | Admin stats |

---

## 🎓 TRAINER
| Method | Endpoint | Description |
|------|---------|-------------|
| POST | `/trainer/courses` | Create course |
| GET | `/trainer/dashboard` | Trainer dashboard |

---

## 👨‍🎓 STUDENT
| Method | Endpoint | Description |
|------|---------|-------------|
| GET | `/student/courses` | View approved courses |
| GET | `/student/enrollments` | View enrolled courses |
| POST | `/student/courses/:id/enroll` | Enroll course |

---

## 🔎 PUBLIC
| Method | Endpoint | Description |
|------|---------|-------------|
| GET | `/courses/search` | Search & filter courses |

---


