import axios, { isAxiosError } from "axios";
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

function mapOpenRouterError(error: unknown, fallback: string): never {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 429) {
      // #region agent log
      fetch("http://127.0.0.1:7520/ingest/ad77b84b-eaea-40fc-9651-0b3ce1c650f2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4cfb43" },
        body: JSON.stringify({
          sessionId: "4cfb43",
          hypothesisId: "H2",
          location: "openrouter.client.ts:mapOpenRouterError",
          message: "OpenRouter returned 429",
          data: { status },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw new AppError(
        StatusCodes.TOO_MANY_REQUESTS,
        "The assistant is busy right now. Please wait a moment and try again.",
      );
    }
    if (status === 401 || status === 403) {
      throw new AppError(
        StatusCodes.SERVICE_UNAVAILABLE,
        "Chat assistant is temporarily unavailable.",
      );
    }
  }

  throw new AppError(StatusCodes.BAD_GATEWAY, fallback);
}

export async function createEmbedding(input: string): Promise<number[]> {
  assertChatbotEnabled();

  try {
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
  } catch (error) {
    if (error instanceof AppError) throw error;
    mapOpenRouterError(error, "Failed to generate embedding");
  }
}

export async function createChatCompletion(messages: ChatMessage[]): Promise<string> {
  assertChatbotEnabled();

  try {
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
  } catch (error) {
    if (error instanceof AppError) throw error;
    mapOpenRouterError(error, "Failed to generate a response");
  }
}
