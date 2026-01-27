import express from 'express';
import cors from "cors";
import authRouter from './module/auth/auth.route';
import { verifyToken } from './middlewares/verifyToken';

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/v1/auth", authRouter);

app.get("/api/v1/protected", verifyToken, (req, res) => {
  res.json({
    success: true,
    message: "You are authorized",
  });
});

app.get('/', (req, res) => {
    res.send('Hello, World!');
});


export default app;