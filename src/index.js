import "dotenv/config";
import { slackApp } from "./utils/slack.js";
import { generateProposal } from "./proposal.js";
import { startServer, stopServer } from "./server.js";

const normalizeTechnology = (tech) => {
  if (!tech) return tech;
  const lower = tech.toLowerCase();
  if (lower === "ai") return "AI";
  if (lower === "devops") return "Devops";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const normalizeName = (name) => {
  if (!name) return name;
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const normalizeTone = (tone) => {
  if (!tone) return tone;
  return tone.toLowerCase();
};

slackApp.command("/proposal", async ({ ack, respond, command }) => {
  await ack();
  
  try {
    const parts = command.text.split(" ");
    const rawName = parts[0];
    const rawTechnology = parts[1];
    const rawTone = parts[2];
    const jobDescription = parts.slice(3).join(" ");

    const name = normalizeName(rawName);
    const technology = normalizeTechnology(rawTechnology);
    const tone = normalizeTone(rawTone);

    if (!name || !technology || !tone) {
      await respond("invalid format use /proposal name tech tone job");
      return;
    }

    const proposal = await generateProposal({
      name,
      technology,
      tone,
      jobDescription
    });

    await respond(proposal);
  } catch (err) {
    console.error(err);
    await respond("something went wrong");
  }
});

const main = async () => {
  try {
    await Promise.all([
      slackApp.start(),
      startServer(process.env.PORT || 3000)
    ]);

    console.log("slack bot running");
  } catch (err) {
    console.error("failed to start services", err);
    process.exit(1);
  }
};

main();

process.on("SIGINT", async () => {
  console.log("received SIGINT, shutting down http server");
  await stopServer();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("received SIGTERM, shutting down http server");
  await stopServer();
  process.exit(0);
});

