import { Request, Response } from "express";
import { chatWithAI, ChatMessage } from "./ai.service";

const chatController = async (req: Request, res: Response) => {
  try {
    const { messages } = req.body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "messages array is required" });
    }

    // Filter to only user/assistant roles (Anthropic doesn't accept "system" in messages array)
    const filtered = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    if (filtered.length === 0) {
      return res.status(400).json({ success: false, message: "No valid messages provided" });
    }

    const reply = await chatWithAI(filtered);

    res.status(200).json({ success: true, data: reply });
  } catch (error: any) {
    console.error("AI chat error:", error?.message);
    res.status(500).json({ success: false, message: "AI service unavailable" });
  }
};

export const AiController = { chatController };
