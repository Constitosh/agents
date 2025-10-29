import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { runAgent, autoFollowBack, ensureFollowingTargets } from "./src/logic.js";

const whale = JSON.parse(fs.readFileSync("./agents/whale_agent_profile.json"));
const shared = JSON.parse(fs.readFileSync("./shared/library.json"));

console.log("Running Whale manually...");
await ensureFollowingTargets(whale);
await runAgent(whale, shared);
await autoFollowBack(whale);
console.log("✅ Manual Whale cycle complete");
