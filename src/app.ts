import express from 'express';
import cors from "cors";
import authRouter from './module/auth/auth.route';
import adminRoutes from './module/admin/admin.route';
import trainerRoutes from './module/course/trainer.route';
import adminCourseRoutes from './module/adminCourse/admin.course.route'
import studentCourseRoutes from './module/student//student.course.route'
import enrollmentRoutes from './module/enrollment/enrollment.route'
import studentEnrollmentRoutes from './module/studentEnrollment/student.enrollment.route'
import adminDashboardRoutes from './module/adminDashboard/admin.dashboard.route'
import trainerDashboardRoutes from './module/trainerDashboard/trainer.dashboard.route';
import courseSearchRoutes from './module/search/course.search.route';

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/trainer", trainerRoutes);
app.use("/api/v1/admin", adminCourseRoutes);
app.use("/api/v1/student", studentCourseRoutes);
app.use("/api/v1/student", enrollmentRoutes);
app.use("/api/v1/student", studentEnrollmentRoutes);
app.use("/api/v1/admin", adminDashboardRoutes);
app.use("/api/v1/trainer", trainerDashboardRoutes);
app.use("/api/v1", courseSearchRoutes);

app.get('/', (req, res) => {
    res.send('Hello, World!');
});


export default app;