# Upwork Proposal Bot

A Slack bot that generates personalized Upwork proposals using AI.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Slack workspace with app permissions
- OpenAI API key

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
```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
OPENAI_API_KEY=sk-your-openai-api-key
```

## Getting Slack Tokens

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select existing one
3. Enable Socket Mode
4. Get `SLACK_BOT_TOKEN` from OAuth & Permissions
5. Get `SLACK_APP_TOKEN` from Basic Information → App-Level Tokens
6. Install the app to your workspace

## Running the Project

Start the bot:
```bash
npm start
```

The bot will connect to Slack and listen for commands.

## Usage

In Slack, use the `/proposal` command:

```
/proposal <name> <technology> <tone> <job description>
```

### Parameters

- **name**: Person's name (Manish, Aayush, Arun, Saurabh, Faisal, etc.)
- **technology**: AI, Python, Frontend, Fullstack, Vue, React, Shopify, Backend, Devops
- **tone**: professional, friendly, casual, etc.
- **job description**: The job posting text

### Examples

```
/proposal Manish AI professional Need an AI developer to build a chatbot

/proposal Aayush Python friendly Looking for API integration developer

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
  ├── index.js             # Main entry point
  └── proposal.js          # Proposal generation logic
```

## Available Names

Manish, Saurabh, Aayush, Faisal, Mahima, Kishan, Rahul, Gopal, Yuvraj, Atul, Arun

## Available Technologies

AI, Python, Frontend, Fullstack, Vue, React, Shopify, Backend, Devops

