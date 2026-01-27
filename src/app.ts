import express from 'express';
import cors from "cors";
import authRouter from './module/auth/auth.route';

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api/v1/auth", authRouter);



app.get('/', (req, res) => {
    res.send('Hello, World!');
});


export default app;