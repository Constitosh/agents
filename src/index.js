import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { runAgent, autoFollowBack, ensureFollowingTargets } from "./logic.mjs";
import { startDashboard } from "./dashboard.mjs";

// Load all cabal agents
const agents = fs.readdirSync("./agents").map(a =>
  JSON.parse(fs.readFileSync(`./agents/${a}`))
);

// Load shared library
const sharedLibrary = JSON.parse(fs.readFileSync("./shared/library.json"));

// Ensure pending & posted files exist
if (!fs.existsSync("./pending.json")) fs.writeFileSync("./pending.json", "[]");
if (!fs.existsSync("./posted.json")) fs.writeFileSync("./posted.json", "[]");

// 🧠 Run agent logic asynchronously in background
(async () => {
  console.log(`🚀 Starting ${agents.length} AI agents with 15-minute stagger...`);

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    try {
      console.log(`\n🔹 Running agent [${agent.cabal.toUpperCase()}] (${i + 1}/${agents.length})`);
      await runAgent(agent, sharedLibrary);

      // 💤 Wait 15 minutes before next agent to avoid API rate-limit
      const delayMs = 15 * 60 * 1000;
      console.log(`⏱️ Waiting ${delayMs / 60000} min before next agent...`);
      await new Promise(r => setTimeout(r, delayMs));

      // (Optional) enable these later if needed
      // await autoFollowBack(agent);
      // await ensureFollowingTargets(agent);
    } catch (err) {
      console.error(`❌ Error running ${agent.cabal}:`, err.message);
    }
  }

  console.log("\n✅ All agents finished one full 2-hour cycle.");
})();

// 🖥️ Keep the dashboard live
startDashboard();
