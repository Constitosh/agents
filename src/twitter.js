// src/twitter.js
import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
dotenv.config();

// Return a Twitter client for a given cabal
export function getClient(cabal) {
  const prefix = cabal.toUpperCase();
  return new TwitterApi({
    appKey: process.env[`${prefix}_TWITTER_KEY`],
    appSecret: process.env[`${prefix}_TWITTER_SECRET`],
    accessToken: process.env[`${prefix}_ACCESS_TOKEN`],
    accessSecret: process.env[`${prefix}_ACCESS_SECRET`]
  });
}

// --- Search tweets via hashtags ---
export async function searchTweets(client, query) {
  try {
    const q = `${query} -is:retweet`;
    const res = await client.v2.search(q, {
      max_results: 10,
      "tweet.fields": "author_id,text,created_at,public_metrics",
      expansions: "author_id"
    });

    const tweets = res.data || [];
    if (!tweets.length) {
      console.log(`No tweets found for query: ${q}`);
      return [];
    }
    console.log(`Found ${tweets.length} tweets for query: ${q}`);
    return tweets;
  } catch (err) {
    if (err?.code === 429) {
      console.error("❌ searchTweets rate-limited (429) — skipping this slot.");
      return [];
    }
    console.error("❌ searchTweets error:", err.message);
    return [];
  }
}


// --- Fetch recent tweets from accounts the agent follows ---
export async function getFollowingTweets(client, limit = 10) {
   try {
    const me = await client.v2.me();
    const following = await client.v2.following(me.data.id, { max_results: 20 });
    const tweets = [];

    for (const user of following.data || []) {
      try {
        const tl = await client.v2.userTimeline(user.id, {
          max_results: 5,
          exclude: "retweets"
        });
        if (tl?.data?.length) tweets.push(...tl.data);
      } catch (e) {
        // skip any single-user error
      }
      if (tweets.length >= limit) break;
    }

    if (!tweets.length) console.log("No following tweets found.");
    else console.log(`Fetched ${tweets.length} tweets from followings.`);
    return tweets.slice(0, limit);
  } catch (err) {
    if (err?.code === 429) {
      console.error("❌ getFollowingTweets rate-limited (429) — skipping this slot.");
      return [];
    }
    console.error("❌ getFollowingTweets error:", err.message);
    return [];
  }
}


// --- Post a reply to a tweet ---
export async function replyToTweet(client, tweetId, text) {
  try {
    await client.v2.reply(text, tweetId);
    console.log(`✅ Replied to tweet ${tweetId}`);
  } catch (err) {
    console.error(`Reply error: ${err.message}`);
  }
}

// --- Post an original tweet ---
export async function postTweet(client, text) {
  try {
    const res = await client.v2.tweet(text);
    console.log(`🧠 Posted tweet: "${text.slice(0, 80)}..."`);
    return res;
  } catch (err) {
    console.error(`Tweet error: ${err.message}`);
  }
}

// --- Like a tweet ---
export async function likeTweet(client, tweetId) {
  try {
    const me = await client.v2.me();
    await client.v2.like(me.data.id, tweetId);
    console.log(`❤️ Liked tweet ${tweetId}`);
  } catch (e) {
    console.error(`Like error: ${e.message}`);
  }
}

// --- Follow a user ---
export async function followUser(client, userId) {
  try {
    const me = await client.v2.me();
    await client.v2.follow(me.data.id, userId);
    console.log(`👤 Followed user ${userId}`);
  } catch (e) {
    console.error(`Follow error: ${e.message}`);
  }
}

// --- Helper: trending crypto topics for tweet prompts ---
export function getTrendingTopics() {
  const pool = [
    "Bitcoin ETF news",
    "Ethereum Layer 2 updates",
    "Solana ecosystem growth",
    "AI in crypto",
    "Web3 regulation trends",
    "DeFi market activity",
    "Memecoin hype cycles",
    "NFT market movements",
    "Crypto gaming expansion",
    "Privacy coin discussions"
  ];
  const pick = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
  return pick.join(", ");
}
