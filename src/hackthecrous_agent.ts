import { Connection } from "agents";
import { MistralMessage, Prompt } from "./types";
import MCPThinkingAgent from "./agent";
import MCPServer from "./mcp";
import MistralModel from "./model";

export class HackTheCrousAgent extends MCPThinkingAgent {
	constructor(mcpServer: MCPServer, model: MistralModel, connection?: Connection, messages?: MistralMessage[], onNewMessage?: (message: MistralMessage) => void) {
		super(connection, mcpServer, model, messages, onNewMessage);
	}

	async initialize() {
		this.addSystemMessage("You are a restaurant specialist, your role is to tell people where they can find certain meals in university restaurants. Use the provided tools to do so.");
		this.addSystemMessage("The tools are in French, so you should translate the inputs to English.");
	}

	async prompt({ prompt }: Prompt) {
		this.addUserMessage(prompt);
		return this.queryReasoningModel();
	}

}
