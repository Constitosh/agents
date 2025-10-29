import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { runAgent, autoFollowBack, ensureFollowingTargets } from "./logic.js";
import { startDashboard } from "./dashboard.js";   // ✅ ADD THIS LINE

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
  for (const agent of agents) {
    try {
      await runAgent(agent, sharedLibrary);
      // Comment out next two lines temporarily to avoid 429 spam
      // await autoFollowBack(agent);
      // await ensureFollowingTargets(agent);
    } catch (err) {
      console.error(`Error running ${agent.cabal}:`, err.message);
    }
  }
})();

// 🖥️ Start the web dashboard (approvals)
startDashboard();   // ✅ Safe and defined now