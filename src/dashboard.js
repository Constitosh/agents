import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import crypto from "crypto";
import { getClient, replyToTweet, postTweet } from "./twitter.js";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

let authed = false;
const PASSWORD_HASH = process.env.PASSWORD_HASH;

function checkPassword(input) {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  return hash === PASSWORD_HASH;
}

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  if (checkPassword(req.body.password)) {
    authed = true;
    res.redirect("/pending");
  } else res.send("Access denied");
});

app.get("/pending", (req, res) => {
  if (!authed) return res.redirect("/login");
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  res.render("pending", { pending });
});

app.post("/approve/:id", async (req, res) => {
  const id = Number(req.params.id);
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  const item = pending.find(p => p.id === id);
  if (!item) return res.send("Not found");

  const agent = JSON.parse(fs.readFileSync(`./agents/${item.agent}_agent_profile.json`));
  const client = getClient(agent.cabal);
  await replyToTweet(client, item.tweetId, item.reply);

  const posted = JSON.parse(fs.readFileSync("./posted.json"));
  posted.push(item);
  fs.writeFileSync("./posted.json", JSON.stringify(posted, null, 2));
  fs.writeFileSync("./pending.json", JSON.stringify(pending.filter(p => p.id !== id), null, 2));
  res.redirect("/pending");
});

app.post("/deny/:id", (req, res) => {
  const id = Number(req.params.id);
  const pending = JSON.parse(fs.readFileSync("./pending.json"));
  fs.writeFileSync("./pending.json", JSON.stringify(pending.filter(p => p.id !== id), null, 2));
  res.redirect("/pending");
});

export function startDashboard() {
  app.listen(process.env.PORT, () => console.log(`Dashboard running on ${process.env.PORT}`));
}
