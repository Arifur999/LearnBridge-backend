import { Router } from "express";
import { AiController } from "./ai.controller";

const router = Router();

router.post("/chat", AiController.chatController);

export default router;
