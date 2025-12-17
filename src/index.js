import "dotenv/config";
import { slackApp } from "./utils/slack.js";
import { generateProposal } from "./proposal.js";


slackApp.command("/proposal", async ({ ack, respond, command }) => {
  await ack();
  
  try {
    const parts = command.text.split(" ");
    const name = parts[0];
    const technology = parts[1];
    const tone = parts[2];
    const jobDescription = parts.slice(3).join(" ");

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

(async () => {
  await slackApp.start();
  console.log("slack bot running");
})();
