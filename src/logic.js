// src/logic.js
import fs from "fs";
import {
  getClient,
  searchTweets,
  getFollowingTweets,
  replyToTweet,
  postTweet,
  followUser,
  getTrendingTopics,
} from "./twitter.js";
import { generateReply, generateTweet } from "./openai.js";

/**
 * Run one cabal’s full logic cycle
 */
export async function runAgent(agent, sharedLibrary) {
  const memoryPath = `./memory/${agent.cabal}.json`;
  const memory = fs.existsSync(memoryPath)
    ? JSON.parse(fs.readFileSync(memoryPath))
    : { last_post_time: 0, followed: [], daily_posts: 0, last_reset: 0 };

  const now = Date.now();

  // Reset daily post counter every 24h
  if (now - memory.last_reset > 24 * 60 * 60 * 1000) {
    memory.daily_posts = 0;
    memory.last_reset = now;
  }

  const client = getClient(agent.cabal);
  const topics =
    agent.topics?.filter(Boolean).join(" OR ") || "#crypto OR #web3 OR #finance";

  console.log(`${agent.cabal} scanning tweets for: ${topics}`);

  // ---- merge hashtag search + followings feed ----
  let tweets = await searchTweets(client, topics);

  if (!tweets.length || Math.random() < 0.5) {
    console.log(`${agent.cabal} scanning followings for conversation targets...`);
    const followTweets = await getFollowingTweets(client, 10);
    if (followTweets?.length) tweets = [...tweets, ...followTweets];
  }

  // ---- if nothing found, queue an original draft ----
  if (!tweets.length) {
    const context = getTrendingTopics();
    const text = await generateTweet(agent, { sharedLibrary, context });
    const pending = JSON.parse(fs.readFileSync("./pending.json"));
    pending.push({
      id: Date.now(),
      agent: agent.cabal,
      tweetId: "ORIGINAL",
      tweetUrl: null,
      tweetText: "ORIGINAL POST DRAFT",
      reply: text
    });
    fs.writeFileSync("./pending.json", JSON.stringify(pending, null, 2));
    console.log(`${agent.cabal} queued an original draft for approval.`);
    return;
  }

  // ---- safe target selection ----
  let target = tweets[Math.floor(Math.random() * tweets.length)];
  if (!target) {
    console.log(`${agent.cabal} skipped — target vanished after filtering.`);
    return;
  }

  const tid = target.id_str || target.id || null;
  const turl = tid ? `https://x.com/i/web/status/${tid}` : null;

  const reply = await generateReply(agent, target.text || "", sharedLibrary);
  if (!reply) return;

  // ✅ ensure valid tweetId & tweetUrl
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  pending.push({
    id: Date.now(),
    agent: agent.cabal,
    tweetId: tid || "ORIGINAL",
    tweetUrl: turl,
    tweetText: (target.text || "").slice(0, 280),
    reply,
  });
  fs.writeFileSync("./pending.json", JSON.stringify(pending, null, 2));

  console.log(`${agent.cabal} queued reply for tweet: "${(target.text || "").slice(0, 80)}..."`);

  memory.last_post_time = now;
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}

/**
 * Follow-target logic (unchanged, minor cleanup)
 */
export async function ensureFollowingTargets(agent) {
  if (!agent.follow_targets?.length) return;
  const client = getClient(agent.cabal);
  const user = await client.v2.me();

  const memoryPath = `./memory/${agent.cabal}.json`;
  const memory = fs.existsSync(memoryPath)
    ? JSON.parse(fs.readFileSync(memoryPath))
    : { followed: [] };

  let followCount = 0;
  for (const handle of agent.follow_targets) {
    if (followCount >= 1) break; // one follow per cycle
    const clean = handle.replace("@", "").trim();
    if (memory.followed.includes(handle)) continue;
    try {
      const { data } = await client.v2.userByUsername(clean);
      await client.v2.follow(user.id, data.id);
      console.log(`${agent.cabal} followed ${handle}`);
      memory.followed.push(handle);
      followCount++;
      await new Promise((r) => setTimeout(r, 10_000));
    } catch (e) {
      console.log(`${agent.cabal} could not follow ${handle}: ${e.message}`);
    }
  }
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}

/**
 * Auto-follow-back logic
 */
export async function autoFollowBack(agent) {
  try {
    const client = getClient(agent.cabal);
    const user = await client.v2.me();
    const liked = await client.v2.userLikedTweets(user.data.id, {
      max_results: 20,
    });
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
