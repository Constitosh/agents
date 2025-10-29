import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// 🔹 Sharper, sarcastic tone instruction added
const BASE_STYLE = `
Keep responses concise (max 220 characters). 
Favor sarcasm, wit, and punchy phrasing. 
Prefer comments over essays — use dry humor, irony, or subtle arrogance fitting the cabal’s style. 
Never start with generic greetings. 
Sound like a person tweeting, not an AI. 
`;

export async function generateReply(agent, tweetText, sharedLibrary) {
  const prompt = `
${agent.openai_system_prompt}

${BASE_STYLE}

Shared Old Money knowledge:
${JSON.stringify(sharedLibrary, null, 2)}

Tweet to respond to:
"${tweetText}"

Task: Write a witty, sarcastic reply that sounds human, with subtle character traits of the cabal.
`;

  const res = await openai.responses.create({
    model: "gpt-5",
    input: prompt
  });
  return res.output_text?.trim();
}

export async function generateTweet(agent, sharedLibrary) {
  const prompt = `
${agent.openai_system_prompt}

${BASE_STYLE}

Shared Old Money knowledge:
${JSON.stringify(sharedLibrary, null, 2)}

Task: Write a standalone tweet (under 220 chars) that sounds sarcastic, confident, and human.
`;

  const res = await openai.responses.create({
    model: "gpt-5",
    input: prompt
  });
  return res.output_text?.trim();
}