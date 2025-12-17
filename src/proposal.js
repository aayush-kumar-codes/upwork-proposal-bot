import { openai } from "./utils/openai.js";
import { portfolios } from "./data/portfolios.js";
import { gitLinks } from "./data/gitLinks.js";

export async function generateProposal({
  name,
  technology,
  tone,
  jobDescription
}) {
  const portfolio =
    portfolios?.[technology]?.[name] ||
    "No portfolio available for this technology.";

  const gitLink =
    gitLinks?.[technology]?.[name] ||
    "No portfolio available for this technology.";

  const prompt = `Make sure the proposal includes minor grammatical and punctuation mistakes to mimic human writing. Use normal, conversational English and ensure the proposal cannot be easily detected by AI text detection tools.
don't use commas in proposal also write in small letters git URLs will be as it is exclude them.
Write an Upwork proposal for the following job description: ${jobDescription} in 30 words as a developer.
The tone should be ${tone} and the technology focused and it must use recent work from git ${gitLink} according to technology. after recent work paragraph it should take ${portfolio} paragraph according to technology.
The proposal should be similar in style to the following example, but with modifications as specified:

I am ${name}, a Sr. Full Stack Engineer with 10+ years of experience in building robust applications, including expertise in LLMs, Python, and Reactjs.

Recently I completed a project that involved integrating an AI-driven content generation tool with a site which you can view in my portfolio at ${gitLink}. This project required a deep understanding of both development and AI integration similar to the requirements of your project. The solution I delivered not only improved user engagement but also streamlined the content creation process, showcasing the potential of combining AI with web technologies.

${portfolio}

Let me know when we can connect to discuss the project.

Best regards,
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
