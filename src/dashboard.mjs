import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import crypto from "crypto";
import { getClient, replyToTweet } from "./twitter.js";
import { notifyDiscord } from "./notifyDiscord.js";


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

let authed = false;
const PASSWORD_HASH = process.env.PASSWORD_HASH;

// password check using sha256 hash
function checkPassword(input) {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return hash === PASSWORD_HASH;
}

// =============== LOGIN ===============
app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
  if (checkPassword(req.body.password)) {
    authed = true;
    return res.redirect("/pending");
  }
  return res.send("Access denied");
});

// =============== PENDING QUEUE ===============
app.get("/pending", (req, res) => {
  if (!authed) return res.redirect("/login");
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  res.render("pending", { pending });
});

// =============== PENDING QUEUE ===============
app.get("/pending", (req, res) => {
  if (!authed) return res.redirect("/login");
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  res.render("pending", { pending });
});

// ✅ UPDATED APPROVAL ROUTE (reply or original)
app.post("/approve/:id", async (req, res) => {
  const id = Number(req.params.id);
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  const item = pending.find((p) => p.id === id);
  if (!item) return res.send("Not found");

  const agent = JSON.parse(fs.readFileSync(`./agents/${item.agent}_agent_profile.json`));
  const client = getClient(agent.cabal);

  try {
    if (item.tweetId && item.tweetId !== "ORIGINAL") {
      // 🗨️ Reply to an existing tweet
      await replyToTweet(client, item.tweetId, item.reply);
      console.log(`✅ ${agent.cabal} replied to tweet ${item.tweetId}`);
    } else {
      // 🧠 Post an original tweet
      const { postTweet } = await import("./twitter.js");
      await postTweet(client, item.reply);
      console.log(`✅ ${agent.cabal} posted an original tweet`);
    }
  } catch (e) {
    console.error("Approval post error:", e.message);
  }

  // Move from pending → posted history
  const posted = JSON.parse(fs.readFileSync("./posted.json"));
  posted.push({ ...item, approvedAt: Date.now() });
  fs.writeFileSync("./posted.json", JSON.stringify(posted, null, 2));
  fs.writeFileSync("./pending.json", JSON.stringify(pending.filter((p) => p.id !== id), null, 2));

  res.redirect("/pending");
});

// =============== DENY PENDING ===============
app.post("/deny/:id", (req, res) => {
  const id = Number(req.params.id);
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  fs.writeFileSync("./pending.json", JSON.stringify(pending.filter((p) => p.id !== id), null, 2));
  res.redirect("/pending");
});

app.post("/deny/:id", (req, res) => {
  const id = Number(req.params.id);
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  fs.writeFileSync("./pending.json", JSON.stringify(pending.filter((p) => p.id !== id), null, 2));
  res.redirect("/pending");
});

// =============== MANUAL REPLY COMPOSER ===============
app.get("/manual", (req, res) => {
  if (!authed) return res.redirect("/login");
  const agents = fs.readdirSync("./agents").map(f => f.replace("_agent_profile.json", ""));
  res.render("manual", { agents });
});

app.post("/manual", async (req, res) => {
  if (!authed) return res.redirect("/login");
  const { tweetUrl, cabal } = req.body;

  // 🧩 extract tweet ID from URL
  const match = tweetUrl.match(/status\/(\d+)/);
  if (!match) return res.send("Invalid tweet URL");
  const tweetId = match[1];

  const agent = JSON.parse(fs.readFileSync(`./agents/${cabal}_agent_profile.json`));
  const sharedLibrary = JSON.parse(fs.readFileSync("./shared/library.json"));

  const { generateReply } = await import("./openai.js");
  const reply = await generateReply(agent, `Tweet link: ${tweetUrl}`, sharedLibrary);

  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  pending.push({
    id: Date.now(),
    agent: cabal,
    tweetId,
    tweetUrl,
    tweetText: "MANUAL REPLY REQUEST",
    reply
  });
fs.writeFileSync("./pending.json", JSON.stringify(pending, null, 2));

// ✅ Send Discord notification
await notifyDiscord(pending[pending.length - 1]);

console.log(`🧠 Manual reply for ${cabal} queued & sent to Discord for ${tweetUrl}`);
res.redirect("/pending");



// =============== SETTINGS PAGE ===============
app.get("/settings", (req, res) => {
  if (!authed) return res.redirect("/login");
  const agents = fs.readdirSync("./agents").map((f) =>
    JSON.parse(fs.readFileSync(`./agents/${f}`))
  );
  res.render("settings", { agents });
});

app.post("/settings/:cabal", (req, res) => {
  const cabal = req.params.cabal;
  const file = `./agents/${cabal}_agent_profile.json`;
  if (!fs.existsSync(file)) return res.send("Agent not found");
  const data = JSON.parse(fs.readFileSync(file));

  data.topics = req.body.topics.split(",").map((s) => s.trim());
  data.follow_targets = req.body.follow_targets.split(",").map((s) => s.trim());

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  res.redirect("/settings");
});

// =============== SERVER START ===============
export function startDashboard() {
  const port = process.env.PORT || 8082;
  app.listen(port, () => console.log(`✅ Dashboard running on port ${port}`));
}
