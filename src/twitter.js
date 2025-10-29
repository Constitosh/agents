import { TwitterApi } from "twitter-api-v2";
import dotenv from "dotenv";
dotenv.config();

export function getClient(cabal) {
  const prefix = cabal.toUpperCase();
  return new TwitterApi({
    appKey: process.env[`${prefix}_TWITTER_KEY`],
    appSecret: process.env[`${prefix}_TWITTER_SECRET`],
    accessToken: process.env[`${prefix}_ACCESS_TOKEN`],
    accessSecret: process.env[`${prefix}_ACCESS_SECRET`]
  });
}

export async function searchTweets(client, query) {
  try {
    const res = await client.v2.searchRecent(query, {
      max_results: 10,
      "tweet.fields": "author_id,text,created_at",
      expansions: "author_id"
    });

    if (!res.data?.length) {
      console.log(`No tweets found for query: ${query}`);
      return [];
    }

    console.log(`Found ${res.data.length} tweets for query: ${query}`);
    return res.data;
  } catch (err) {
    console.error("❌ searchTweets error:", err.message);
    return [];
  }
}

export async function replyToTweet(client, tweetId, text) {
  return await client.v2.reply(text, tweetId);
}

export async function postTweet(client, text) {
  return await client.v2.tweet(text);
}

export async function followUser(client, targetUserId) {
  try {
    const me = await client.v2.me();
    await client.v2.follow(me.data.id, targetUserId);
    console.log(`Followed user ${targetUserId}`);
  } catch (e) {
    console.error(`Follow error: ${e.message}`);
  }
}

export async function likeTweet(client, tweetId) {
  try {
    const me = await client.v2.me();
    await client.v2.like(me.data.id, tweetId);
    console.log(`Liked tweet ${tweetId}`);
  } catch (e) {
    console.error(`Like error: ${e.message}`);
  }
}
