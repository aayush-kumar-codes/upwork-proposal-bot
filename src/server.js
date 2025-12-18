import express from "express";
import { generateProposal } from "./proposal.js";

const app = express();

app.use(express.json());

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

app.post("/api/proposal", async (req, res) => {
  try {
    const { name: rawName, technology: rawTechnology, tone: rawTone, jobDescription, clientName } = req.body || {};

    const name = normalizeName(rawName);
    const technology = normalizeTechnology(rawTechnology);
    const tone = normalizeTone(rawTone);

    if (!name || !technology || !tone || !jobDescription) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, technology, tone, jobDescription"
      });
    }

    const proposal = await generateProposal({
      name,
      technology,
      tone,
      jobDescription,
      clientName: clientName || null
    });

    return res.status(200).json({
      success: true,
      proposal
    });
  } catch (error) {
    console.error("Error in /api/proposal:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

let server;

export const startServer = (port = process.env.PORT || 3000) =>
  new Promise((resolve, reject) => {
    try {
      server = app.listen(port, () => {
        console.log(`http api server running on port ${port}`);
        resolve(server);
      });
    } catch (err) {
      reject(err);
    }
  });

export const stopServer = () =>
  new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });


