import express from 'express';
import cors from "cors";
import authRouter from './module/auth/auth.route';
import adminRoutes from './module/admin/admin.route';
import trainerRoutes from './module/course/trainer.route';

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/trainer", trainerRoutes);





app.get('/', (req, res) => {
    res.send('Hello, World!');
});


export default app;