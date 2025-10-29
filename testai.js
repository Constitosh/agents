import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

try {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Say hello" }]
  });

  console.log("✅ OpenAI connection OK:");
  console.log(response.choices[0].message.content);
} catch (error) {
  console.error("❌ OpenAI error:", error.message);
}
