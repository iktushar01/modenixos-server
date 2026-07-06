import "dotenv/config";
import { prisma } from "../src/app/lib/prisma";
import { seedChatbotKnowledge } from "../src/app/module/chatbot/chatbot.service";

const main = async () => {
  await seedChatbotKnowledge(true);
  console.log("Chatbot knowledge re-indexed.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
