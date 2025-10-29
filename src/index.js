import dotenv from "dotenv";
dotenv.config();

import { runAgent, autoFollowBack, ensureFollowingTargets } from "./logic.js";
import fs from "fs";


const agents = fs.readdirSync("./agents").map(a => JSON.parse(fs.readFileSync(`./agents/${a}`)));
const sharedLibrary = JSON.parse(fs.readFileSync("./shared/library.json"));
if (!fs.existsSync("./pending.json")) fs.writeFileSync("./pending.json", "[]");
if (!fs.existsSync("./posted.json")) fs.writeFileSync("./posted.json", "[]");

(async () => {
  for (const agent of agents) {
    await runAgent(agent, sharedLibrary);
    await autoFollowBack(agent);
    await ensureFollowingTargets(agent); // optional addition
  }
})();

startDashboard();

