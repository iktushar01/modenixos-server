export const chatbotConfig = {
  enabled: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
  apiKey: process.env.OPENROUTER_API_KEY?.trim() ?? "",
  baseUrl: (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, ""),
  embeddingModel:
    process.env.OPENROUTER_EMBEDDING_MODEL ?? "nvidia/llama-nemotron-embed-vl-1b-v2:free",
  llmModel: process.env.OPENROUTER_LLM_MODEL ?? "nvidia/nemotron-3-super-120b-a12b:free",
  topK: Number(process.env.CHATBOT_TOP_K ?? 5),
  minSimilarity: Number(process.env.CHATBOT_MIN_SIMILARITY ?? 0.55),
  embeddingDimension: Number(process.env.CHATBOT_EMBEDDING_DIMENSION ?? 2048),
  appName: process.env.APP_NAME ?? "ModenixOS",
  frontendUrl: (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, ""),
};
