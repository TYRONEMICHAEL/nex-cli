# Nexus CLI - AI Chat

A basic CLI application for having conversations with AI using the Vercel AI SDK v5.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Key:**

   Copy `.env.example` to `.env` and add your OpenAI API key:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and replace `your_api_key_here` with your actual OpenAI API key.

   Get your API key from: https://platform.openai.com/api-keys

## Usage

**Start the chat:**
```bash
npm start
```

**Commands:**
- Type your message and press Enter to chat
- Type `exit` or `quit` to end the conversation

## Features

- Interactive CLI conversation
- Maintains conversation history throughout the session
- Uses OpenAI's GPT-4o-mini model via Vercel AI SDK v5
- **MCP Integration:** Connects to Civic MCP server (nexus.civic.com) via StreamableHTTP
- Automatically loads and uses tools from the MCP server
- API key configurable via .env file or prompted at runtime

## Development

**Run in watch mode:**
```bash
npm run dev
```

**Build TypeScript:**
```bash
npm run build
```