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
  const res = await client.v2.search(query, { max_results: 10 });
  return res.data || [];
}

export async function replyToTweet(client, tweetId, text) {
  return await client.v2.reply(text, tweetId);
}

export async function postTweet(client, text) {
  return await client.v2.tweet(text);
}

export async function likeTweet(client, tweetId) {
  try { await client.v2.like(tweetId); } catch (e) { }
}

export async function followUser(client, userId) {
  try { await client.v2.follow(userId); } catch (e) { }
}
