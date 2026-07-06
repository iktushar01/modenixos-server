import { StatusCodes } from "http-status-codes";
import { chatbotConfig } from "../../../config/chatbot.config";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { CHATBOT_KNOWLEDGE } from "./chatbot.knowledge";
import { cosineSimilarity, parseEmbedding } from "./chatbot.utils";
import { createChatCompletion, createEmbedding, OpenRouterRateLimitError } from "./openrouter.client";
import { DEMO_STORE_PATH } from "../../constants/demo";

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatAction = {
  label: string;
  href: string;
};

type RetrievedChunk = {
  title: string;
  content: string;
  category: string;
  score: number;
};

const SYSTEM_PROMPT = `You are a helpful sales and onboarding assistant for ${chatbotConfig.appName}, an e-commerce SaaS platform.

Rules:
- Answer ONLY using the provided context. If the context does not contain the answer, say you are not sure and suggest contacting support@modenixos.com or visiting the FAQ section.
- Never invent prices, features, or URLs that are not in the context.
- Be concise, friendly, and actionable (2-4 short paragraphs max).
- When relevant, mention specific paths like /register, /onboarding, /dashboard/products, ${DEMO_STORE_PATH}, /demo, or /#pricing.
- Do not mention OpenRouter, embeddings, or internal AI systems.`;

function buildActions(message: string): ChatAction[] {
  const lower = message.toLowerCase();
  const actions: ChatAction[] = [];

  if (/(start|sign up|register|try|free|launch)/i.test(lower)) {
    actions.push({ label: "Start free", href: "/register" });
  }
  if (/(demo|example|see|storefront|live)/i.test(lower)) {
    actions.push({ label: "View demo store", href: DEMO_STORE_PATH });
  }
  if (/(price|plan|cost|billing|upgrade)/i.test(lower)) {
    actions.push({ label: "See pricing", href: "/#pricing" });
  }
  if (/(how|work|setup|onboard|begin)/i.test(lower)) {
    actions.push({ label: "How it works", href: "/#how-it-works" });
  }
  if (/(faq|question)/i.test(lower)) {
    actions.push({ label: "Read FAQ", href: "/#faq" });
  }

  const unique = new Map(actions.map((a) => [a.href, a]));
  return Array.from(unique.values()).slice(0, 3);
}

async function retrieveRelevantChunks(queryEmbedding: number[]): Promise<RetrievedChunk[]> {
  const rows = await prisma.chatbotKnowledgeChunk.findMany({
    select: { title: true, content: true, category: true, embedding: true },
  });

  const allScored = rows
    .map((row: { title: string; content: string; category: string; embedding: unknown }) => {
      const embedding = parseEmbedding(row.embedding);
      return {
        title: row.title,
        content: row.content,
        category: row.category,
        score: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .sort((a: RetrievedChunk, b: RetrievedChunk) => b.score - a.score);

  const aboveThreshold = allScored.filter(
    (row: RetrievedChunk) => row.score >= chatbotConfig.minSimilarity,
  );

  const selected =
    aboveThreshold.length > 0
      ? aboveThreshold.slice(0, chatbotConfig.topK)
      : allScored.slice(0, chatbotConfig.topK);

  return selected;
}

function retrieveByKeywords(message: string): RetrievedChunk[] {
  const tokens = message.toLowerCase().split(/\W+/).filter((token) => token.length > 2);
  const scored = CHATBOT_KNOWLEDGE.map((item) => {
    const haystack = `${item.title} ${item.content}`.toLowerCase();
    const score = tokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
    return {
      title: item.title,
      content: item.content,
      category: item.category,
      score,
    };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored.slice(0, chatbotConfig.topK);
  }

  return CHATBOT_KNOWLEDGE.slice(0, chatbotConfig.topK).map((item) => ({
    title: item.title,
    content: item.content,
    category: item.category,
    score: 0,
  }));
}

function buildFallbackReply(chunks: RetrievedChunk[]): string {
  const top = chunks[0];
  if (!top) {
    return "I'm a bit busy right now. Visit /register to start your store or /#pricing to compare plans.";
  }

  return `${top.content}\n\n(Using a quick answer while the AI service is busy — send another message in a minute for a fuller reply.)`;
}

function formatChatResult(message: string, chunks: RetrievedChunk[], reply: string) {
  return {
    reply,
    actions: buildActions(message),
    sources: chunks.map((c) => ({ title: c.title, category: c.category })),
  };
}

function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No matching knowledge base entries were found.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] (${chunk.category}) ${chunk.title}\n${chunk.content}`,
    )
    .join("\n\n");
}

export async function seedChatbotKnowledge(force = false): Promise<void> {
  if (!chatbotConfig.enabled) {
    console.warn("[chatbot] Skipping knowledge seed — OPENROUTER_API_KEY not set");
    return;
  }

  const existingCount = await prisma.chatbotKnowledgeChunk.count();
  if (!force && existingCount >= CHATBOT_KNOWLEDGE.length) {
    return;
  }

  if (force) {
    await prisma.chatbotKnowledgeChunk.deleteMany();
  }

  console.info(`[chatbot] Indexing ${CHATBOT_KNOWLEDGE.length} knowledge chunks...`);

  for (const item of CHATBOT_KNOWLEDGE) {
    const text = `${item.title}\n${item.content}`;
    const embedding = await createEmbedding(text);

    await prisma.chatbotKnowledgeChunk.upsert({
      where: { sourceKey: item.sourceKey },
      create: {
        sourceKey: item.sourceKey,
        title: item.title,
        content: item.content,
        category: item.category,
        embedding,
      },
      update: {
        title: item.title,
        content: item.content,
        category: item.category,
        embedding,
      },
    });
  }

  console.info("[chatbot] Knowledge base indexed successfully");
}

export const ChatbotService = {
  async chat(message: string, history: ChatHistoryMessage[] = []) {
    if (!chatbotConfig.enabled) {
      throw new AppError(
        StatusCodes.SERVICE_UNAVAILABLE,
        "Chat assistant is not available right now.",
      );
    }

    const chunkCount = await prisma.chatbotKnowledgeChunk.count();
    if (chunkCount === 0) {
      try {
        await seedChatbotKnowledge();
      } catch (error) {
        if (!(error instanceof OpenRouterRateLimitError)) throw error;
      }
    }

    let chunks: RetrievedChunk[];
    try {
      const queryEmbedding = await createEmbedding(message);
      chunks = await retrieveRelevantChunks(queryEmbedding);
    } catch (error) {
      if (error instanceof OpenRouterRateLimitError) {
        chunks = retrieveByKeywords(message);
        // #region agent log
        fetch("http://127.0.0.1:7520/ingest/ad77b84b-eaea-40fc-9651-0b3ce1c650f2", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4cfb43" },
          body: JSON.stringify({
            sessionId: "4cfb43",
            runId: "post-fix",
            hypothesisId: "H2",
            location: "chatbot.service.ts:embeddingFallback",
            message: "using keyword fallback after embedding rate limit",
            data: { chunkCount: chunks.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return formatChatResult(message, chunks, buildFallbackReply(chunks));
      }
      throw error;
    }

    const context = buildContextBlock(chunks);

    const historyMessages = history.slice(-6).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    try {
      const reply = await createChatCompletion([
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content: `Context from knowledge base:\n\n${context}`,
        },
        ...historyMessages,
        { role: "user", content: message },
      ]);

      return formatChatResult(message, chunks, reply);
    } catch (error) {
      if (error instanceof OpenRouterRateLimitError) {
        return formatChatResult(message, chunks, buildFallbackReply(chunks));
      }
      throw error;
    }
  },

  getStarterPrompts() {
    return CHATBOT_KNOWLEDGE.length
      ? ["What is ModenixOS?", "How do I start for free?", "Compare pricing plans", "Show me the demo store"]
      : [];
  },
};
