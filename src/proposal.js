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

  // Extract portfolio link from portfolio text if it exists
  const extractPortfolioLink = (text) => {
    if (!text || typeof text !== "string") return null;
    // Match URLs (http, https, or www)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const matches = text.match(urlRegex);
    if (matches && matches.length > 0) {
      // Find the portfolio link (usually tinyurl or similar, not github)
      const portfolioLink = matches.find(url => 
        url.includes("tinyurl") || 
        url.includes("portfolio") || 
        (!url.includes("github.com") && !url.includes("git"))
      );
      return portfolioLink || matches[matches.length - 1]; // Return last URL if no portfolio-specific one found
    }
    return null;
  };

  const portfolioLink = extractPortfolioLink(portfolio) || "https://example.com";

  // Determine greeting based on clientName
  const greeting = clientName ? `hey ${clientName}` : "hey there";

  // Build a concise tech stack string from the job description; fall back to finalTechnology if empty
  const rawTechStack = Array.isArray(techStack) ? techStack : [];
  const cleanedTechStack = [...new Set(rawTechStack.map((t) => String(t).trim()).filter(Boolean))];
  const techStackString =
    cleanedTechStack.length > 0
      ? cleanedTechStack.join(", ")
      : finalTechnology;

  const prompt = `you are writing an upwork proposal for a developer. write it like a real human would write it not like ai.

CRITICAL RULES:
- write everything in lowercase letters EXCEPT:
  * "I" when used as a pronoun (like "I am" "I have" "I will" "I can")
  * technical terms should have RANDOM capitalization - some with first letter capital (like "React" "Python" "Next.js") and some all lowercase (like "node" "docker" "fastapi") to make it look natural and human-written
- DO NOT use any commas anywhere in the proposal
- use very simple words like "I have" "I am" "I will" "I can" "I work" "I did" etc (always capitalize "I")
- write like you're texting a friend about work keep it super casual and natural
- allow small grammar mistakes and natural flow that makes it feel human-written not ai-generated
- do not sound polished or perfect make it feel authentic

very important:
- do not sound like a cover letter or formal proposal
- do NOT use phrases like "for your project" "for this project" "i'd" "i would" 
- do NOT use phrases like "some of the key technologies you're using"
- do NOT use phrases like "from your tech stack" or "based on your job"
- write directly about the work and skills without referencing "your project" explicitly
- use simple direct language that matches the job post style
- write like you would talk to a friend about a project

use this structure exactly with line breaks between sections:

1) greeting (use exactly: "${greeting}")
2) short intro: "I am ${name} a ${roleLabel} dev I work with [skills from ${techStackString}] [write something that makes sense according to the job post - like what you do with these skills or how you use them, keep it short and natural]" 
   - MUST use "I am" not "i'm" (always capitalize "I")
   - list skills WITHOUT commas (just space separated)
   - skills should have RANDOM capitalization: some like "React" "Python" "Next.js" and some like "node" "docker" "fastapi" to look natural
   - DO NOT use "in real projects" - instead write something contextually relevant to the job description (e.g. "building voice apps" "creating apis" "developing web apps" etc)
3) recent project section: start with "recently" and write about 2 lines (2 sentences) describing a recent project that uses technologies from the job. include the git link ${gitLink}. make it detailed and related to what the job needs. write it naturally like you're explaining what you did.
4) fit paragraph: 2-3 short sentences that directly address the job requirements using simple words like "I have" "I can" "I will" (always capitalize "I"). write it similar to the job post style. do NOT say "for your project" or "i'd" - just write directly about the work and how your skills match.
5) portfolio line: "please review my portfolio: ${portfolioLink}"
6) closing: "Please let me know when we can proceed further.\nBest regards\n${name}"

job description:
${jobDescription}

job analysis (use this to understand what they need but write naturally about it):
${jobAnalysis}

my details:
- name: ${name}
- tone: ${tone}
- main technology: ${finalTechnology}
- main tech stack from job description: ${techStackString}
- recent work github: ${gitLink}
- client name (use in greeting if provided): ${clientName || "not provided"}
- portfolio link: ${portfolioLink}
- extra portfolio details (use for context but do not copy verbatim): ${portfolio}

IMPORTANT FORMATTING:
- all text lowercase except "I" (always capitalize "I" as pronoun) and technical terms with RANDOM capitalization (some like "React" "Python" some like "node" "docker" "fastapi")
- no commas anywhere
- the "recently" section should be about 2 lines with good detail about the project
- use simple direct words like "I have" "I am" "I will" "I can" (always capitalize "I")
- write naturally like human text not ai text
- match the style of the job post
- in the intro line after listing skills write something contextually relevant to the job (NOT "in real projects") - like "building voice apps" "creating apis" "developing web platforms" etc based on what the job is about

example structure (adapt to the actual job):

${greeting}

I am ${name} a ${roleLabel} dev I work with React Python node docker Next.js fastapi [something relevant to job like building web apps or creating apis or developing voice systems etc]

recently i [describe what you did in detail about 2 lines]. [second sentence with more details about the project]. you can check it out here: ${gitLink}

[I have experience with relevant skills]. [I can help with specific job needs]. [simple statement about fit using "I have" or "I will"].

please review my portfolio: ${portfolioLink}

Please let me know when we can proceed further.
Best regards
${name}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 600,
    temperature: 0.9
  });

  return response.choices[0].message.content;
}
