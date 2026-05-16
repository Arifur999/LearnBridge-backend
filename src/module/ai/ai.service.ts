import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const chatWithAI = async (messages: ChatMessage[]): Promise<string> => {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system:
      "You are a helpful learning assistant for LearnBridge, an online tutoring platform. Help students find tutors, understand courses, and answer questions about learning topics.",
    messages,
  });

  const block = response.content[0];
  if (!block || block.type !== "text") {
    throw new Error("UNEXPECTED_RESPONSE_TYPE");
  }
  return block.text;
};
