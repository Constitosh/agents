import fs from "fs";
import {
  getClient,
  searchTweets,
  replyToTweet,
  postTweet,
  followUser
} from "./twitter.js";
import { generateReply, generateTweet } from "./openai.js";

// Run one cabal’s logic
export async function runAgent(agent, sharedLibrary) {
  const memoryPath = `./memory/${agent.cabal}.json`;
  const memory = fs.existsSync(memoryPath)
    ? JSON.parse(fs.readFileSync(memoryPath))
    : { last_post_time: 0, followed: [] };

  const now = Date.now();
  const rhythm = 4 * 60 * 60 * 1000; // every 4h default
  if (now - memory.last_post_time < rhythm) return; // too soon

  const client = getClient(agent.cabal);

  const topics =
  agent.topics?.filter(Boolean).join(" OR ") || "#crypto OR #web3 OR #finance";

  console.log(`${agent.cabal} scanning tweets for: ${topics}`);


  const tweets = await searchTweets(client, topics);
  if (!tweets.length) return;

  const target = tweets[Math.floor(Math.random() * tweets.length)];
  const reply = await generateReply(agent, target.text, sharedLibrary);
  if (!reply) return;

  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  pending.push({
    id: Date.now(),
    agent: agent.cabal,
    tweetId: target.id,
    tweetText: target.text,
    reply
  });
  fs.writeFileSync("./pending.json", JSON.stringify(pending, null, 2));

  console.log(`${agent.cabal} queued reply for tweet: "${target.text.slice(0, 80)}..."`);


  memory.last_post_time = now;
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}

export async function ensureFollowingTargets(agent) {
  if (!agent.follow_targets?.length) return;
  const client = getClient(agent.cabal);
  const user = await client.v2.me();

  // memory file to avoid refollowing the same users
  const memoryPath = `./memory/${agent.cabal}.json`;
  const memory = fs.existsSync(memoryPath)
    ? JSON.parse(fs.readFileSync(memoryPath))
    : { followed: [] };

  let followCount = 0;

  for (const handle of agent.follow_targets) {
    if (followCount >= 1) break; // only one follow per cycle

    const clean = handle.replace('@', '').trim();
    if (memory.followed.includes(handle)) continue; // skip already followed

    try {
      const { data } = await client.v2.userByUsername(clean);
      await client.v2.follow(user.id, data.id);
      console.log(`${agent.cabal} followed ${handle}`);
      memory.followed.push(handle);
      followCount++;

      // ⏱️ Wait 10 seconds before any next follow (safety throttle)
      await new Promise(r => setTimeout(r, 10000));
    } catch (e) {
      console.log(`${agent.cabal} could not follow ${handle}: ${e.message}`);
    }
  }

  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}



// Auto-follow-back logic
export async function autoFollowBack(agent) {
  try {
    const client = getClient(agent.cabal);
    const user = await client.v2.me();
    const liked = await client.v2.userLikedTweets(user.data.id, { max_results: 20 });
    if (!liked.data?.length) return;

    const memoryPath = `./memory/${agent.cabal}.json`;
    const memory = fs.existsSync(memoryPath)
      ? JSON.parse(fs.readFileSync(memoryPath))
      : { followed: [] };

    for (const tweet of liked.data) {
      const author = tweet.author_id;
      if (author && !memory.followed.includes(author)) {
        await followUser(client, author);
        memory.followed.push(author);
      }
    }
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
  } catch (err) {
    console.error(`Follow-back error for ${agent.cabal}:`, err.message);
  }
}
