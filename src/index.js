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

const isKnownTechnologyWord = (word) => {
  if (!word) return false;
  const lower = word.toLowerCase();
  return [
    "ai",
    "python",
    "frontend",
    "backend",
    "fullstack",
    "react",
    "vue",
    "shopify",
    "devops"
  ].includes(lower);
};

if (IS_SLACK_BOT) {
  slackApp.command("/proposal", async ({ ack, respond, command }) => {
    await ack();

    try {
      if (!command.text || !command.text.trim()) {
        await respond(
          "invalid format use /proposal name [tech] tone [clientName] job"
        );
        return;
      }

      // Split and filter out empty strings
      const parts = command.text
        .trim()
        .split(/\s+/)
        .filter((part) => part.length > 0);

      if (parts.length < 3) {
        await respond(
          "invalid format use /proposal name [tech] tone [clientName] job"
        );
        return;
      }

      const rawName = parts[0];
      let rawTechnology = null;
      let rawTone;
      let rawClientName = null;
      let jobDescription;

      // Determine whether the second argument is a technology or a tone.
      // If it's a known technology word, treat as technology; otherwise treat as tone.
      if (isKnownTechnologyWord(parts[1])) {
        rawTechnology = parts[1];
        rawTone = parts[2];

        // With explicit technology:
        // If there are 5+ parts, treat 4th as clientName, rest as jobDescription
        // If there are 4 parts, treat all after tone as jobDescription
        if (parts.length >= 5) {
          rawClientName = parts[3];
          jobDescription = parts.slice(4).join(" ");
        } else {
          jobDescription = parts.slice(3).join(" ");
        }
      } else {
        // No explicit technology – second argument is tone
        rawTone = parts[1];

        // If there are 4+ parts, treat 3rd as clientName, rest as jobDescription
        // If there are 3 parts, treat all after tone as jobDescription
        if (parts.length >= 4) {
          rawClientName = parts[2];
          jobDescription = parts.slice(3).join(" ");
        } else {
          jobDescription = parts.slice(2).join(" ");
        }
      }

      const name = normalizeName(rawName);
      const technology = normalizeTechnology(rawTechnology);
      const tone = normalizeTone(rawTone);
      const clientName =
        rawClientName && rawClientName.trim() ? rawClientName.trim() : null;

      if (!name || !tone || !jobDescription) {
        await respond(
          "invalid format use /proposal name [tech] tone [clientName] job"
        );
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

