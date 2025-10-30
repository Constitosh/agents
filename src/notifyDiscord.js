// src/notifyDiscord.js
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

const webhook = process.env.DISCORD_WEBHOOK_URL;

export async function notifyDiscord(item) {
  if (!webhook) return;

  const message = {
    username: "Old Money Agent Monitor",
    avatar_url: "https://i.imgur.com/FdKrIHH.png",
    embeds: [
      {
        title: `🧾 New pending post by ${item.agent.toUpperCase()}`,
        description: item.reply?.slice(0, 1000) || "(empty)",
        color: 0x00b894,
        fields: [
          { name: "Tweet", value: item.tweetUrl || "Original Draft", inline: false },
          { name: "Approve / Deny", value: "[Open Dashboard](https://agents.thefakerug.com/pending)", inline: false }
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    if (!res.ok) console.error(`❌ Discord webhook failed: ${res.status}`);
    else console.log(`✅ Discord notified for ${item.agent}`);
  } catch (err) {
    console.error("❌ Discord webhook error:", err.message);
  }
}
