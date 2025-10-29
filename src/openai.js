import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

export async function generateReply(agent, tweetText, sharedLibrary) {
  const prompt = `
${agent.openai_system_prompt}

Shared Old Money knowledge:
${JSON.stringify(sharedLibrary, null, 2)}

Tweet to respond to:
"${tweetText}"

Task: Generate a short, in-character reply (under 250 chars).
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

Shared Old Money knowledge:
${JSON.stringify(sharedLibrary, null, 2)}

Task: Generate a standalone tweet (under 280 chars).
`;

  const res = await openai.responses.create({
    model: "gpt-5",
    input: prompt
  });
  return res.output_text?.trim();
}
