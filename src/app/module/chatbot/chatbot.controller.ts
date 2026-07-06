import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CHATBOT_STARTER_PROMPTS } from "./chatbot.knowledge";
import { ChatbotService } from "./chatbot.service";
import { chatbotConfig } from "../../../config/chatbot.config";

const chat = catchAsync(async (req: Request, res: Response) => {
  const { message, history } = req.body;
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
