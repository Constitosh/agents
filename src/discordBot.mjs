// src/discordBot.mjs
import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} from "discord.js";

import fs from "fs";
import { getClient, replyToTweet, postTweet } from "./twitter.js";
import { generateReply } from "./openai.js";


const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ No DISCORD_BOT_TOKEN found in .env");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ✅ Register slash command /tweet
const commands = [
  new SlashCommandBuilder()
    .setName("tweet")
    .setDescription("Generate a reply from a chosen cabal to a tweet link")
    .addStringOption(o =>
      o.setName("url").setDescription("Tweet URL").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("cabal").setDescription("Choose cabal").setRequired(true)
        .addChoices(
          { name: "ALPHA", value: "alpha" },
          { name: "ANON", value: "anon" },
          { name: "FED", value: "fed" },
          { name: "FOUNDER", value: "founder" },
          { name: "GHOST", value: "ghost" },
          { name: "NOISE", value: "noise" },
          { name: "REKT", value: "rekt" },
          { name: "WHALE", value: "whale" }
        )
    )
].map(c => c.toJSON());

// Register commands with Discord API
const rest = new REST({ version: "10" }).setToken(TOKEN);
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

(async () => {
  try {
const GUILD_ID = process.env.DISCORD_GUILD_ID;
if (GUILD_ID) {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log(`✅ Registered /tweet in guild ${GUILD_ID}`);
} else {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log("✅ Registered /tweet command globally (may take ~1 hour to appear)");
}

  } catch (err) {
    console.error("❌ Failed to register command:", err);
  }
})();

// 🧠 Handle slash command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "tweet") {
    const url = interaction.options.getString("url");
    const cabal = interaction.options.getString("cabal");

    await interaction.reply({ content: `🔍 Generating ${cabal.toUpperCase()} reply for ${url}...`, ephemeral: true });

    const match = url.match(/status\/(\d+)/);
    if (!match) return interaction.followUp("❌ Invalid tweet link.");

    const tweetId = match[1];
    const agent = JSON.parse(fs.readFileSync(`./agents/${cabal}_agent_profile.json`));
    const sharedLibrary = JSON.parse(fs.readFileSync("./shared/library.json"));

    const reply = await generateReply(agent, `Tweet link: ${url}`, sharedLibrary);
    if (!reply) return interaction.followUp("❌ No reply generated.");

    const item = {
      id: Date.now(),
      agent: cabal,
      tweetId,
      tweetUrl: url,
      tweetText: "MANUAL DISCORD COMMAND",
      reply
    };

    // Save to pending
    const pending = JSON.parse(fs.readFileSync("./pending.json"));
    pending.push(item);
    fs.writeFileSync("./pending.json", JSON.stringify(pending, null, 2));


const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`approve_${item.id}`)
    .setLabel("✅ Approve")
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId(`deny_${item.id}`)
    .setLabel("❌ Deny")
    .setStyle(ButtonStyle.Danger)
);

await interaction.followUp({
  content: `🧠 *${cabal.toUpperCase()}* draft ready:\n> ${reply}\n\n🔗 [View Tweet](${url})`,
  components: [row]
});

  }
});

client.once("ready", () => {
  console.log(`🤖 Discord bot logged in as ${client.user.tag}`);
});
client.once("clientReady", () => {
  console.log(`🤖 Discord bot logged in as ${client.user.tag}`);
});


// Handle Approve/Deny button clicks
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  const [action, idStr] = i.customId.split("_");
  const id = Number(idStr);

  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  const item = pending.find(p => p.id === id);

  if (!item) return i.reply({ content: "Item not found.", ephemeral: true });

  if (action === "approve") {
    const { getClient, replyToTweet, postTweet } = await import("./twitter.js");
    const agent = JSON.parse(fs.readFileSync(`./agents/${item.agent}_agent_profile.json`));
    const clientTw = getClient(agent.cabal);

    if (item.tweetId && item.tweetId !== "ORIGINAL") {
      await replyToTweet(clientTw, item.tweetId, item.reply);
    } else {
      await postTweet(clientTw, item.reply);
    }

    const posted = JSON.parse(fs.readFileSync("./posted.json"));
    posted.push(item);
    fs.writeFileSync("./posted.json", JSON.stringify(posted, null, 2));
    fs.writeFileSync("./pending.json", JSON.stringify(pending.filter(p => p.id !== id), null, 2));

    await i.reply({ content: `✅ Approved and posted by ${item.agent.toUpperCase()}`, ephemeral: true });
  }

  if (action === "deny") {
    fs.writeFileSync("./pending.json", JSON.stringify(pending.filter(p => p.id !== id), null, 2));
    await i.reply({ content: `❌ Denied and removed from queue.`, ephemeral: true });
  }
});
client.on("error", console.error);
client.on("warn", console.warn);


client.login(TOKEN);
