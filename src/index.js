import fs from "fs";
import { runAgent } from "./logic.js";
import { startDashboard } from "./dashboard.js";

const agents = fs.readdirSync("./agents").map(a => JSON.parse(fs.readFileSync(`./agents/${a}`)));
const sharedLibrary = JSON.parse(fs.readFileSync("./shared/library.json"));
if (!fs.existsSync("./pending.json")) fs.writeFileSync("./pending.json", "[]");
if (!fs.existsSync("./posted.json")) fs.writeFileSync("./posted.json", "[]");

(async () => {
  for (const agent of agents) {
    await runAgent(agent, sharedLibrary);
  }
})();

startDashboard();
