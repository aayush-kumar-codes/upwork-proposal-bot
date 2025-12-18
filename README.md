# Upwork Proposal Bot

A bot that generates personalized Upwork proposals using AI. Can run as a Slack bot, HTTP API server, or both.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key
- (Optional) Slack workspace with app permissions (if using Slack bot mode)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/aayush-kumar-codes/upwork-proposal-bot
cd upwork-proposal-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
touch .env
```

4. Add your environment variables to `.env`:

**For API-only mode:**
```
OPENAI_API_KEY=sk-your-openai-api-key
IS_SLACK_BOT=false
PORT=3000
```

**For Slack bot mode (with API):**
```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
OPENAI_API_KEY=sk-your-openai-api-key
IS_SLACK_BOT=true
PORT=3000
```

## Getting Slack Tokens (Optional - Only if using Slack bot)

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select existing one
3. Enable Socket Mode
4. Get `SLACK_BOT_TOKEN` from OAuth & Permissions
5. Get `SLACK_APP_TOKEN` from Basic Information → App-Level Tokens
6. Install the app to your workspace

## Running the Project

Start the server:
```bash
npm start
```

### Running Modes

- **API-only mode** (`IS_SLACK_BOT=false`): Runs only the HTTP API server
- **Slack bot mode** (`IS_SLACK_BOT=true`): Runs both Slack bot and HTTP API server

The HTTP API server always runs on the port specified by `PORT` (default: 3000).

## Usage

### HTTP API

The server provides a REST API endpoint for generating proposals.

The bot is smart about **technology** and **client name**:

- **Technology handling**
  - If you pass a `technology` value, it will be normalized (for example: `ai` → `AI`, `devops` → `Devops`).
  - If you omit `technology` or pass an unknown value, the bot analyzes the `jobDescription` and tries to detect the most appropriate role:
    - AI, Python, Frontend, Backend, Fullstack, React, Vue, Shopify, Devops
  - If it still can’t confidently decide, it falls back to **Fullstack**.
- **Client name handling**
  - You can optionally pass `clientName` in the HTTP API body.
  - If provided, the proposal greeting will use it (for example: `hey John`); otherwise it defaults to `hey there`.

**Endpoint:** `POST /api/proposal`

**Request Body:**
```json
{
  "name": "Manish",
  "technology": "AI",
  "tone": "professional",
  "jobDescription": "Need an AI developer to build a chatbot",
  "clientName": "John"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "proposal": "Generated proposal text..."
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: name, tone, jobDescription"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/proposal \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aayush",
    "technology": "Python",
    "tone": "friendly",
    "jobDescription": "Looking for API integration developer"
  }'
```

### Slack Bot (Optional)

If `IS_SLACK_BOT=true`, you can use the `/proposal` command in Slack:

```
/proposal <name> [technology] <tone> [clientName] <job description>
```

**Parameters:**

- **name**: Person's name (Manish, Aayush, Arun, Saurabh, Faisal, etc.)
- **technology** (optional): AI, Python, Frontend, Fullstack, Vue, React, Shopify, Backend, Devops  
  - If omitted, the bot will infer the role from the job description.
- **tone**: professional, friendly, casual, etc.
- **clientName** (optional): The client’s first name; if provided, the greeting will use it.
- **job description**: The job posting text

**Examples:**

```
/proposal Manish AI professional John Need an AI developer to build a chatbot

/proposal Manish AI professional Need an AI developer to build a chatbot

/proposal Aayush Python friendly Sarah Looking for API integration developer

/proposal Aayush Python friendly Looking for API integration developer

/proposal Arun React casual Alex Need React developer for dashboard

/proposal Arun React casual Need React developer for dashboard
```

## Project Structure

```
src/
  ├── data/
  │   ├── gitLinks.js      # GitHub links by technology
  │   └── portfolios.js    # Portfolio descriptions
  ├── utils/
  │   ├── openai.js        # OpenAI client
  │   └── slack.js         # Slack app setup
  ├── index.js             # Main entry point (handles Slack bot conditionally)
  ├── server.js            # Express HTTP API server
  └── proposal.js          # Proposal generation logic
```

## Available Names

Manish, Saurabh, Aayush, Faisal, Mahima, Kishan, Rahul, Gopal, Yuvraj, Atul, Arun

## Available Technologies

AI, Python, Frontend, Fullstack, Vue, React, Shopify, Backend, Devops

