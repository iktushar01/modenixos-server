import axios from "axios";
import { chatbotConfig } from "../../../config/chatbot.config";
import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function openRouterHeaders() {
  return {
    Authorization: `Bearer ${chatbotConfig.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": chatbotConfig.frontendUrl,
    "X-Title": chatbotConfig.appName,
  };
}

function assertChatbotEnabled() {
  if (!chatbotConfig.enabled) {
    throw new AppError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "Chat assistant is not configured. Please try again later.",
    );
  }
}

export async function createEmbedding(input: string): Promise<number[]> {
  assertChatbotEnabled();

  const response = await axios.post(
    `${chatbotConfig.baseUrl}/embeddings`,
    {
      model: chatbotConfig.embeddingModel,
      input,
    },
    { headers: openRouterHeaders(), timeout: 60_000 },
  );

  const embedding = response.data?.data?.[0]?.embedding as number[] | undefined;
  if (!embedding?.length) {
    throw new AppError(StatusCodes.BAD_GATEWAY, "Failed to generate embedding");
  }

  return embedding;
}

export async function createChatCompletion(messages: ChatMessage[]): Promise<string> {
  assertChatbotEnabled();

  const response = await axios.post(
    `${chatbotConfig.baseUrl}/chat/completions`,
    {
      model: chatbotConfig.llmModel,
      messages,
      temperature: 0.3,
      max_tokens: 800,
    },
    { headers: openRouterHeaders(), timeout: 90_000 },
  );

  const content = response.data?.choices?.[0]?.message?.content as string | undefined;
  if (!content?.trim()) {
    throw new AppError(StatusCodes.BAD_GATEWAY, "Failed to generate a response");
  }

  return content.trim();
}
