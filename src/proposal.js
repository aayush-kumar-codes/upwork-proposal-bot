import { openai } from "./utils/openai.js";
import { portfolios } from "./data/portfolios.js";
import { gitLinks } from "./data/gitLinks.js";

const VALID_TECHNOLOGIES = [
  "AI",
  "Python",
  "Frontend",
  "Backend",
  "Fullstack",
  "React",
  "Vue",
  "Shopify",
  "Devops"
];

const normalizeDetectedTechnology = (tech) => {
  if (!tech || typeof tech !== "string") return null;
  const lower = tech.toLowerCase();

  if (lower === "ai") return "AI";
  if (lower === "devops") return "Devops";

  const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
  return VALID_TECHNOLOGIES.includes(capitalized) ? capitalized : null;
};

async function analyzeJobDescription(jobDescription) {
  const analysisPrompt = `Analyze this job description and return ONLY valid JSON.

Extract:
1) Key points: skills, requirements, challenges, technical details
2) Role type: Choose ONE from ["AI","Python","Frontend","Backend","Fullstack","React","Vue","Shopify","Devops"]

Return this exact JSON structure (no markdown, no code blocks, no extra text):
{
  "analysis": "brief summary of key points",
  "detectedTechnology": "AI" OR "Python" OR "Frontend" OR "Backend" OR "Fullstack" OR "React" OR "Vue" OR "Shopify" OR "Devops"
}

Rules:
- If job mentions AI/ML/LLM/GPT → "AI"
- If job mentions Python specifically → "Python"
- If job mentions React → "React"
- If job mentions Vue/Nuxt → "Vue"
- If job mentions Shopify → "Shopify"
- If job mentions only frontend/UI/UX → "Frontend"
- If job mentions only backend/API/server → "Backend"
- If job mentions both frontend AND backend → "Fullstack"
- If job mentions DevOps/CI/CD/infrastructure → "Devops"
- If unclear → "Fullstack"

Job description:
${jobDescription}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: analysisPrompt }],
    max_tokens: 400,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const rawContent = response.choices[0]?.message?.content?.trim() ?? "";

  // Log raw response for debugging
  console.log("[analyzeJobDescription] raw response:", rawContent);

  let analysis = rawContent;
  let detectedTechnology = null;

  try {
    // Remove markdown code blocks if present
    let jsonContent = rawContent;
    if (jsonContent.includes("```json")) {
      jsonContent = jsonContent.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    } else if (jsonContent.includes("```")) {
      jsonContent = jsonContent.replace(/```\s*/g, "");
    }

    const parsed = JSON.parse(jsonContent.trim());
    
    if (parsed && typeof parsed.analysis === "string") {
      analysis = parsed.analysis;
    }
    
    // Handle detectedTechnology - check for string "null" or actual null
    if (parsed && parsed.detectedTechnology) {
      const techValue = parsed.detectedTechnology;
      // If it's the string "null", treat as null
      if (techValue === "null" || techValue === null) {
        detectedTechnology = null;
      } else {
        detectedTechnology = normalizeDetectedTechnology(techValue);
      }
    }
    
    console.log("[analyzeJobDescription] parsed result:", {
      hasAnalysis: !!analysis,
      detectedTechnology,
      normalized: detectedTechnology
    });
  } catch (error) {
    // If parsing fails, log the error and try to extract from text
    console.error("[analyzeJobDescription] JSON parse error:", error.message);
    console.error("[analyzeJobDescription] raw content that failed:", rawContent);
    
    // Try to extract technology from the raw content as fallback
    const lowerContent = rawContent.toLowerCase();
    if (lowerContent.includes("ai") || lowerContent.includes("machine learning") || lowerContent.includes("llm") || lowerContent.includes("gpt")) {
      detectedTechnology = "AI";
    } else if (lowerContent.includes("python")) {
      detectedTechnology = "Python";
    } else if (lowerContent.includes("react")) {
      detectedTechnology = "React";
    } else if (lowerContent.includes("vue") || lowerContent.includes("nuxt")) {
      detectedTechnology = "Vue";
    } else if (lowerContent.includes("shopify")) {
      detectedTechnology = "Shopify";
    } else if ((lowerContent.includes("frontend") || lowerContent.includes("ui") || lowerContent.includes("ux")) && 
               (lowerContent.includes("backend") || lowerContent.includes("api") || lowerContent.includes("server"))) {
      detectedTechnology = "Fullstack";
    } else if (lowerContent.includes("frontend") || lowerContent.includes("ui") || lowerContent.includes("ux")) {
      detectedTechnology = "Frontend";
    } else if (lowerContent.includes("backend") || lowerContent.includes("api") || lowerContent.includes("server")) {
      detectedTechnology = "Backend";
    } else if (lowerContent.includes("devops") || lowerContent.includes("ci/cd") || lowerContent.includes("infrastructure")) {
      detectedTechnology = "Devops";
    } else {
      detectedTechnology = null;
    }
    
    if (detectedTechnology) {
      console.log("[analyzeJobDescription] extracted technology from text fallback:", detectedTechnology);
    }
  }

  // Final check: if still null after all attempts, log warning
  if (!detectedTechnology) {
    console.warn("[analyzeJobDescription] WARNING: Could not detect technology, will use Fullstack fallback");
  }

  return { analysis, detectedTechnology };
}

export async function generateProposal({
  name,
  technology,
  tone,
  jobDescription,
  clientName
}) {
  // Analyze the job description to extract key skills, requirements and detect role/technology
  const { analysis: jobAnalysis, detectedTechnology } =
    await analyzeJobDescription(jobDescription);

  // Prefer user-provided technology if present, otherwise use detectedTechnology, otherwise default to Fullstack
  const normalizedUserTech = normalizeDetectedTechnology(technology);
  const finalTechnology =
    normalizedUserTech ||
    detectedTechnology ||
    "Fullstack";

  // Log how technology was resolved so we can debug whether fallback or detection is being used
  console.log("[proposal] technology resolution", {
    name,
    rawTechnology: technology,
    normalizedUserTech,
    detectedTechnology,
    finalTechnology,
    used:
      normalizedUserTech
        ? "userTechnology"
        : detectedTechnology
        ? "detectedTechnology"
        : "fallbackFullstack"
  });

  const portfolio =
    portfolios?.[finalTechnology]?.[name] ||
    "No portfolio available for this technology.";

  const gitLink =
    gitLinks?.[finalTechnology]?.[name] ||
    "No portfolio available for this technology.";

  // Determine greeting based on clientName
  const greeting = clientName ? `hey ${clientName}` : "hey there";

  const prompt = `you are writing an upwork proposal for a developer.

write in very simple, human language. use short sentences and clear grammar. avoid buzzwords and marketing language. keep it friendly and confident, not salesy. allow small natural mistakes so it does not feel like ai.

use normal capitalization and punctuation. do not follow a strict word limit, but keep it short and to the point (around 120–200 words).

use this structure exactly, with line breaks between sections:

1) greeting
2) short intro about who i am and what i do
3) recent project paragraph using the git link
4) extra portfolio paragraph (if provided)
5) paragraph that connects my skills to this job and mentions main challenges
6) short closing with call to action and signature

job description:
${jobDescription}

job analysis (use this to match skills and challenges from the job):
${jobAnalysis}

my details:
- name: ${name}
- tone: ${tone}
- main technology: ${finalTechnology}
- recent work github: ${gitLink}
- client name (use in greeting if provided): ${clientName || "not provided"}
- extra portfolio paragraph (optional, use only if it sounds natural and do not repeat the same info): ${portfolio}

IMPORTANT: Start the proposal with exactly this greeting: "${greeting}"

follow this style example, but adapt it fully to the job above and to my details:

${greeting}

i'm ${name}, a developer who works a lot with ${finalTechnology.toLowerCase()} and related tools. i focus on writing clean code and keeping communication simple so clients always know what is going on.

recently i worked on a project where i integrated different services and improved data flow between systems. you can check it here: ${gitLink}. i handled api integrations, error handling and made sure everything stayed stable in production.

${portfolio}

based on your job, i can help with the main tasks like matching your api and data needs, handling edge cases, and making sure the system is easy to maintain. i pay attention to clear structure, good error handling and simple workflows that match real business needs.

if this sounds good, let's chat and see how i can help with your project.

best regards,
${name}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.7
  });

  return response.choices[0].message.content;
}
