import { openai } from "./utils/openai.js";
import { portfolios } from "./data/portfolios.js";
import { gitLinks } from "./data/gitLinks.js";

async function analyzeJobDescription(jobDescription) {
  const analysisPrompt = `analyze the following job description and extract only the most important points:
1) key skills and technologies mentioned
2) main requirements and problems to solve
3) specific challenges or pain points
4) important technical details (apis, databases, frameworks, tools, architecture, etc.)

job description:
${jobDescription}

keep the analysis short and clear so it can be used to write a focused proposal. use simple language and avoid marketing buzzwords.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: analysisPrompt }],
    max_tokens: 300,
    temperature: 0.5
  });

  return response.choices[0].message.content;
}

export async function generateProposal({
  name,
  technology,
  tone,
  jobDescription,
  clientName
}) {
  // Analyze the job description to extract key skills and requirements
  const jobAnalysis = await analyzeJobDescription(jobDescription);

  const portfolio =
    portfolios?.[technology]?.[name] ||
    "No portfolio available for this technology.";

  const gitLink =
    gitLinks?.[technology]?.[name] ||
    "No portfolio available for this technology.";

  // Determine greeting based on clientName
  const greeting = clientName ? `hey ${clientName}` : "hey there";

  const prompt = `you are writing an upwork proposal for a developer.

write in very simple, human language. use short sentences and clear grammar. avoid buzzwords and marketing language. keep it friendly and confident, not salesy. allow small natural mistakes so it does not feel like ai.

use normal capitalization and punctuation. do not force everything to be lowercase. do not follow a strict word limit, but keep it short and to the point (around 120–200 words).

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
- main technology: ${technology}
- recent work github: ${gitLink}
- client name (use in greeting if provided): ${clientName || "not provided"}
- extra portfolio paragraph (optional, use only if it sounds natural and do not repeat the same info): ${portfolio}

IMPORTANT: Start the proposal with exactly this greeting: "${greeting}"

follow this style example, but adapt it fully to the job above and to my details:

${greeting}

i'm ${name}, a developer who works a lot with ${technology.toLowerCase()} and related tools. i focus on writing clean code and keeping communication simple so clients always know what is going on.

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
