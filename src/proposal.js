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
3) Tech stack: List of specific technologies, frameworks, languages, databases, and tools mentioned in the job (e.g. ["React","Next.js","Node.js","PostgreSQL"])

Return this exact JSON structure (no markdown, no code blocks, no extra text):
{
  "analysis": "brief summary of key points",
  "detectedTechnology": "AI" OR "Python" OR "Frontend" OR "Backend" OR "Fullstack" OR "React" OR "Vue" OR "Shopify" OR "Devops",
  "techStack": ["React","Next.js","Node.js","PostgreSQL"]
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
- When listing techStack, include only concrete technologies, frameworks, languages, databases, or tools mentioned in the job description (no soft skills or generic phrases)

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
  let techStack = [];

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

    if (parsed && Array.isArray(parsed.techStack)) {
      techStack = parsed.techStack
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    
    console.log("[analyzeJobDescription] parsed result:", {
      hasAnalysis: !!analysis,
      detectedTechnology,
      normalized: detectedTechnology,
      techStack
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

  return { analysis, detectedTechnology, techStack };
}

export async function generateProposal({
  name,
  technology,
  tone,
  jobDescription,
  clientName
}) {
  // Analyze the job description to extract key skills, requirements and detect role/technology
  const { analysis: jobAnalysis, detectedTechnology, techStack } =
    await analyzeJobDescription(jobDescription);

  // Prefer user-provided technology if present, otherwise use detectedTechnology, otherwise default to Fullstack
  const normalizedUserTech = normalizeDetectedTechnology(technology);
  const finalTechnology =
    normalizedUserTech ||
    detectedTechnology ||
    "Fullstack";

  // Simple label for the role (fullstack, backend, frontend, etc.) to use in intro
  const roleLabel =
    typeof finalTechnology === "string"
      ? finalTechnology.toLowerCase()
      : "developer";

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

  // Build a concise tech stack string from the job description; fall back to finalTechnology if empty
  const rawTechStack = Array.isArray(techStack) ? techStack : [];
  const cleanedTechStack = [...new Set(rawTechStack.map((t) => String(t).trim()).filter(Boolean))];
  const techStackString =
    cleanedTechStack.length > 0
      ? cleanedTechStack.join(", ")
      : finalTechnology;

  const prompt = `you are writing an upwork proposal for a developer.

write in very simple, human language. use short sentences and clear grammar. avoid buzzwords and marketing language. keep it friendly and confident, not salesy. allow small natural mistakes so it does not feel like ai.

very important:
- do not sound like a cover letter
- do not use phrases like "some of the key technologies you're using"
- do not use phrases like "from your tech stack"
- do not use phrases like "based on your job"
- do not say "i'm a fullstack developer" unless it feels very natural
- do not list technologies in a long formal sentence. keep it short and casual.
- write like you would talk to a friend about a project.

use normal capitalization and punctuation. do not follow a strict word limit, but keep it short and to the point (around 120–200 words).

use this structure exactly, with line breaks between sections:

1) greeting
2) short intro that starts with the client's main technologies from the job description and mentions my experience with them
3) recent project paragraph using the git link
4) extra portfolio paragraph (if provided)
5) paragraph that connects my skills to this job using the same tech stack (no need to mention challenges)
6) short closing with call to action and signature

job description:
${jobDescription}

job analysis (use this to match skills and challenges from the job, but do not mention that you are using this analysis or that you read the job carefully):
${jobAnalysis}

my details:
- name: ${name}
- tone: ${tone}
- main technology: ${finalTechnology}
- main tech stack from job description: ${techStackString}
- recent work github: ${gitLink}
- client name (use in greeting if provided): ${clientName || "not provided"}
- extra portfolio paragraph (optional, use only if it sounds natural and do not repeat the same info): ${portfolio}

IMPORTANT: Start the proposal with exactly this greeting: "${greeting}"

follow this style example, but adapt it fully to the job above and to my details. you can change the phrasing as long as it stays simple and human:

${greeting}

i'm ${name}, a ${roleLabel} dev. i work with ${techStackString} in real projects.

recently i built a feature using the same kind of stack. you can see it here: ${gitLink}. it handles real-time updates and edge cases in production.

${portfolio}

i think i can help with this job because the tools you use are close to what i use every day. i like to keep things simple, ship working code, and communicate clearly while we build.

if this sounds good, happy to chat more about the details.

thanks,
${name}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.85
  });

  return response.choices[0].message.content;
}
