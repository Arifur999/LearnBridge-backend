import express, { Application, Request, Response } from 'express';
import cors from "cors";

// Imports
import authRouter from './module/auth/auth.route';
import adminRoutes from './module/admin/admin.route';
import trainerRoutes from './module/course/trainer.route';
import adminCourseRoutes from './module/adminCourse/admin.course.route';
import studentCourseRoutes from './module/student/student.course.route'; 
import enrollmentRoutes from './module/enrollment/enrollment.route';
import studentEnrollmentRoutes from './module/studentEnrollment/student.enrollment.route';
import adminDashboardRoutes from './module/adminDashboard/admin.dashboard.route';
import trainerDashboardRoutes from './module/trainerDashboard/trainer.dashboard.route';
import courseSearchRoutes from './module/search/course.search.route';
import bookingRoutes from './module/booking/booking.route';
import reviewRoutes from './module/review/review.route';
import categoryRoutes from './module/category/category.route';
import CourseRoutes from './module/course/trainer.route';
import tutorRoutes from './module/tutor/tutor.route';
import studentDashboardRoutes from './module/studentDashboard/student.dashboard.route';
 

const app: Application = express();

app.use(cors());
app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/trainer", trainerRoutes);
app.use("/api/v1/admin", adminCourseRoutes);
app.use("/api/v1/student", studentCourseRoutes);
app.use("/api/v1/student", enrollmentRoutes);
app.use("/api/v1/student", studentEnrollmentRoutes);
app.use("/api/v1/student", studentDashboardRoutes);
app.use("/api/v1/admin", adminDashboardRoutes);
app.use("/api/v1/trainer", trainerDashboardRoutes);

// Search Route
app.use("/api/v1", courseSearchRoutes);
app.use("/api/v1/courses", CourseRoutes); 

// Other Routes
app.use("/api/v1", bookingRoutes); 
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/tutors", tutorRoutes);

// Root Route
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

export default app;