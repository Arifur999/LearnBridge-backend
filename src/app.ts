import express from 'express';
import cors from "cors";
import authRouter from './module/auth/auth.route';
import { verifyToken } from './middlewares/verifyToken';
import { verifyAdmin } from './middlewares/role';
import adminRoutes from './module/auth/auth.route';

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRoutes);


app.get(
  "/api/v1/admin-test",
  verifyToken,
  verifyAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
    });
  }
);


app.get('/', (req, res) => {
    res.send('Hello, World!');
});


export default app;