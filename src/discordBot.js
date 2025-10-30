// src/discordBot.js
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import { generateReply } from "./openai.js";
import { notifyDiscord } from "./notifyDiscord.js";

dotenv.config();

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
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Registered /tweet command globally");
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

    // Notify in Discord
    await notifyDiscord(item);

    await interaction.followUp({
      content: `✅ Reply queued for *${cabal.toUpperCase()}*:\n\n> ${reply}\n\n[Open Dashboard](https://agents.thefakerug.com/pending)`,
      ephemeral: true
    });
  }
});

client.once("ready", () => {
  console.log(`🤖 Discord bot logged in as ${client.user.tag}`);
});

client.login(TOKEN);
