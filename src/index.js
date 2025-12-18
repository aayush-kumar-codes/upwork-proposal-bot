import "dotenv/config";
import { slackApp } from "./utils/slack.js";
import { generateProposal } from "./proposal.js";
import { startServer, stopServer } from "./server.js";

const IS_SLACK_BOT = process.env.IS_SLACK_BOT === "true";

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

if (IS_SLACK_BOT) {
  slackApp.command("/proposal", async ({ ack, respond, command }) => {
    await ack();

    try {
      if (!command.text || !command.text.trim()) {
        await respond("invalid format use /proposal name tech tone [clientName] job");
        return;
      }

      // Split and filter out empty strings
      const parts = command.text.trim().split(/\s+/).filter(part => part.length > 0);
      
      if (parts.length < 4) {
        await respond("invalid format use /proposal name tech tone [clientName] job");
        return;
      }

      const rawName = parts[0];
      const rawTechnology = parts[1];
      const rawTone = parts[2];
      
      // Check if clientName is provided (4th parameter, optional)
      // If there are 5+ parts, treat 4th as clientName, rest as jobDescription
      // If there are 4 parts, treat all after tone as jobDescription
      let rawClientName = null;
      let jobDescription;
      
      if (parts.length >= 5) {
        rawClientName = parts[3];
        jobDescription = parts.slice(4).join(" ");
      } else {
        jobDescription = parts.slice(3).join(" ");
      }

      const name = normalizeName(rawName);
      const technology = normalizeTechnology(rawTechnology);
      const tone = normalizeTone(rawTone);
      const clientName = rawClientName && rawClientName.trim() ? rawClientName.trim() : null;

      if (!name || !technology || !tone || !jobDescription) {
        await respond("invalid format use /proposal name tech tone [clientName] job");
        return;
      }

      
      const proposal = await generateProposal({
        name,
        technology,
        tone,
        jobDescription,
        clientName
      });

      await respond(proposal);
    } catch (err) {
      console.error("Error in /proposal command:", err);
      await respond("something went wrong");
    }
  });
}

const main = async () => {
  try {
    if (IS_SLACK_BOT) {
      await Promise.all([
        slackApp.start(),
        startServer(process.env.PORT || 3000)
      ]);

      console.log("slack bot and http api server running");
    } else {
      await startServer(process.env.PORT || 3000);
      console.log("http api server running (Slack bot disabled)");
    }
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

