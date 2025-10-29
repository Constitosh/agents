import fs from "fs";
import { getClient, searchTweets, replyToTweet, postTweet, likeTweet, followUser } from "./twitter.js";
import { generateReply, generateTweet } from "./openai.js";

export async function runAgent(agent, sharedLibrary) {
  const memoryPath = `./memory/${agent.cabal}.json`;
  const memory = fs.existsSync(memoryPath) ? JSON.parse(fs.readFileSync(memoryPath)) : { last_post_time: 0 };
  const now = Date.now();
  const rhythm = 4 * 60 * 60 * 1000; // every 4 hours

  if (now - memory.last_post_time < rhythm) return;

  const client = getClient(agent.cabal);
  const topics = agent.topics?.join(" OR ") || "#crypto";
  const tweets = await searchTweets(client, topics);
  const target = tweets[Math.floor(Math.random() * tweets.length)];
  if (!target) return;

  const reply = await generateReply(agent, target.text, sharedLibrary);
  const pending = JSON.parse(fs.readFileSync("./pending.json", "utf8"));
  pending.push({ id: Date.now(), agent: agent.cabal, tweetId: target.id, tweetText: target.text, reply });
  fs.writeFileSync("./pending.json", JSON.stringify(pending, null, 2));

  memory.last_post_time = now;
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}

// auto-follow-back logic
export async function autoFollowBack(client, likes) {
  for (const like of likes) {
    await followUser(client, like.user_id);
  }
}
