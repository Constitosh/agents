import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

/**
 * Generate a reply tweet based on target tweet text and agent persona
 */
export async function generateReply(agent, tweetText, sharedLibrary) {
  try {
    const inspirations = agent.inspired_by?.join(", ") || "various thinkers";
    const focus =
      agent.inspired_by?.[
        Math.floor(Math.random() * agent.inspired_by.length)
      ] || null;

    const prompt = `
${agent.openai_system_prompt}

You draw stylistic influence from ${inspirations}.
For this response, emulate the tone or worldview of ${
      focus || "one of your inspirations"
    }.

Shared Old Money knowledge:
${JSON.stringify(sharedLibrary, null, 2)}

Tweet to respond to:
"${tweetText}"

Task:
Write a concise, first-person reply (under 250 characters) that reflects your cabal's worldview.
Keep it human, natural, and true to your personality. Avoid hashtags or emojis unless stylistically fitting.
`;

    const res = await openai.responses.create({
      model: "gpt-5",
      input: prompt
    });

    const text = res.output_text?.trim();
    if (!text || text.length < 10) {
      console.warn(`${agent.cabal} fallback: empty OpenAI reply, using default.`);
      return `Interesting move. ${focus ? focus.split(" ")[0] : "Anon"} would approve.`;
    }

    return text;
  } catch (err) {
    console.error(`OpenAI reply error for ${agent.cabal}:`, err.message);
    return null;
  }
}

/**
 * Generate a standalone original tweet from the agent persona
 */
export async function generateTweet(agent, sharedLibrary) {
  try {
    const inspirations = agent.inspired_by?.join(", ") || "various thinkers";
    const focus =
      agent.inspired_by?.[
        Math.floor(Math.random() * agent.inspired_by.length)
      ] || null;

    const prompt = `
${agent.openai_system_prompt}

You draw stylistic influence from ${inspirations}.
For this post, emulate the tone or worldview of ${
      focus || "one of your inspirations"
    }.

Shared Old Money knowledge:
${JSON.stringify(sharedLibrary, null, 2)}

Task:
Write a standalone tweet (under 280 characters) in first person ('I') that feels human and reflective of your cabal's character.
Base it on real-world market, crypto, or cultural context. Be witty, insightful, or philosophical — not robotic.
`;

    const res = await openai.responses.create({
      model: "gpt-5",
      input: prompt
    });

    const text = res.output_text?.trim();
    if (!text || text.length < 10) {
      console.warn(`${agent.cabal} fallback: empty OpenAI tweet, using default.`);
      return `I stay patient when others panic. The chart always comes home. —${agent.cabal.toUpperCase()}`;
    }

    return text;
  } catch (err) {
    console.error(`OpenAI tweet error for ${agent.cabal}:`, err.message);
    return null;
  }
}