import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CHATBOT_STARTER_PROMPTS } from "./chatbot.knowledge";
import { ChatbotService } from "./chatbot.service";
import { chatbotConfig } from "../../../config/chatbot.config";

const chat = catchAsync(async (req: Request, res: Response) => {
  const { message, history } = req.body;
  // #region agent log
  fetch("http://127.0.0.1:7520/ingest/ad77b84b-eaea-40fc-9651-0b3ce1c650f2", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4cfb43" },
    body: JSON.stringify({
      sessionId: "4cfb43",
      hypothesisId: "H1",
      location: "chatbot.controller.ts:chat",
      message: "chat handler reached (passed rate limiter)",
      data: { messageLen: String(message ?? "").length, historyLen: (history ?? []).length },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const result = await ChatbotService.chat(message, history ?? []);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reply generated",
    data: result,
  });
});

const getConfig = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chatbot config retrieved",
    data: {
      enabled: chatbotConfig.enabled,
      starterPrompts: CHATBOT_STARTER_PROMPTS,
    },
  });
});

export const ChatbotController = { chat, getConfig };
