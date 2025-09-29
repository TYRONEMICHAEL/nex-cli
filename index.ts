import * as readline from 'readline';
import { generateText, experimental_createMCPClient, stepCountIs } from 'ai';
import type { CoreMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import * as dotenv from 'dotenv';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';


dotenv.config();

// Constants
const MCP_SERVER_URL = process.env.NEXUS_MCP_URL || 'https://nexus.civic.com/hub/mcp';
const MAX_STEPS = 10;
const SYSTEM_PROMPT = 'You are a helpful assistant. When you use tools to gather information, always provide a clear, conversational response to the user based on the tool results.';

class ChatCLI {
  private conversationHistory: CoreMessage[] = [];
  private apiKey: string;
  private rl: readline.Interface;
  private mcpClient: unknown = null;
  private mcpTools: Record<string, unknown> = {};
  private debugMode: boolean;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.debugMode = process.env.DEBUG === 'true';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async promptForApiKey(): Promise<void> {
    return new Promise((resolve) => {
      this.rl.question('Enter your OpenAI API key: ', (key) => {
        this.apiKey = key.trim();
        console.log('API key saved for this session.\n');
        resolve();
      });
    });
  }

  private async getUserInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private async initializeMCP(): Promise<void> {
    try {
      console.log('Connecting to Civic MCP server...');

      const accessToken = process.env.CIVIC_ACCESS_TOKEN;
      const transport = new StreamableHTTPClientTransport(
        new URL(MCP_SERVER_URL),
        accessToken ? {
          requestInit: {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        } : undefined
      );

      this.mcpClient = await experimental_createMCPClient({ transport });
      this.mcpTools = await (this.mcpClient as any).tools();

      const toolCount = Object.keys(this.mcpTools).length;
      console.log(`Connected! Loaded ${toolCount} tools from Civic MCP.\n`);
    } catch (error) {
      console.log('Warning: Could not connect to Civic MCP server.');
      if (error instanceof Error) {
        console.log(`Error: ${error.message}\n`);
      }
      console.log('Continuing without MCP tools...\n');
    }
  }

  private log(message: string): void {
    if (this.debugMode) {
      console.log(message);
    }
  }

  private async sendMessage(userMessage: string): Promise<string> {
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const openai = createOpenAI({ apiKey: this.apiKey });

      const result = await generateText({
        model: openai('gpt-4o-mini'),
        system: SYSTEM_PROMPT,
        messages: this.conversationHistory,
        tools: this.mcpTools,
        stopWhen: stepCountIs(MAX_STEPS),
        onStepFinish: (step) => {
          if (step.toolCalls && step.toolCalls.length > 0) {
            step.toolCalls.forEach(call => {
              console.log(`\n[Using tool: ${call.toolName}]`);
              this.log(`[Args: ${JSON.stringify(call.args)}]`);
            });
          }
          if (step.toolResults && step.toolResults.length > 0) {
            step.toolResults.forEach(result => {
              const isError = result.output?.isError || false;
              if (isError) {
                console.log(`[Tool failed]`);
                this.log(`[Error: ${JSON.stringify(result.output)}]`);
              } else {
                this.log(`[Tool completed successfully]`);
              }
            });
          }
        },
      });

      // Update conversation history with full response (includes tool calls/results)
      this.conversationHistory = result.response.messages;

      return result.text || 'No response generated.';
    } catch (error) {
      if (error instanceof Error) {
        return `Error: ${error.message}`;
      }
      return 'An unknown error occurred.';
    }
  }

  public async start(): Promise<void> {
    console.log('=== Nexus CLI - AI Chat ===');
    console.log('Powered by Vercel AI SDK v5\n');

    if (!this.apiKey) {
      await this.promptForApiKey();
    } else {
      console.log('Using API key from .env file\n');
    }

    await this.initializeMCP();

    console.log('Type your message and press Enter to chat.');
    console.log('Type "exit" or "quit" to end the conversation.\n');

    while (true) {
      const userInput = await this.getUserInput('You: ');

      if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
        console.log('\nGoodbye!');
        this.rl.close();

        if (this.mcpClient) {
          await (this.mcpClient as any).close();
        }

        break;
      }

      if (!userInput) {
        continue;
      }

      const response = await this.sendMessage(userInput);
      console.log('\nAssistant: ' + response + '\n');
    }
  }
}

const chat = new ChatCLI();
chat.start().catch(console.error);