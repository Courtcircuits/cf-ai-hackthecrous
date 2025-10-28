import { Connection } from "agents";
import { MistralMessage } from "./types";
import { AssistantMessage, ChatCompletionResponse } from "@mistralai/mistralai/models/components";
import MistralModel from "./model";
import MCPServer from "./mcp";
import { toMistralMessage } from "./converter";

export default abstract class MCPThinkingAgent {
	messages: MistralMessage[]
	connection?: Connection;
	mcpServer?: MCPServer;
	model?: MistralModel;
	onNewMessage?: (message: MistralMessage) => void;

	constructor(connection?: Connection, mcpServer?: MCPServer, model?: MistralModel, messages?: MistralMessage[], onNewMessage?: (message: MistralMessage) => void) {
		this.connection = connection;
		this.messages = messages || [];
		this.mcpServer = mcpServer;
		this.model = model;
		this.onNewMessage = onNewMessage;
	}


	protected async addSystemMessage(content: string) {
		this.pushMessage({
			content: content,
			role: "system",
		    insertedAt: Date.now().toString()
		})
	}

	protected async addUserMessage(content: string) {
		this.pushMessage({
			content: content,
			role: "user",
			insertedAt: new Date().toISOString()
		})
	}

	protected async addAssistantMessage(message: AssistantMessage) {
		this.pushMessage(message as AssistantMessage & { role: "assistant", insertedAt: string });
	}


	private async pushMessage(message: MistralMessage) {
		// eventually will push the message to an active websocket connection
		console.log(message);
		this.messages.push(message);
		if (this.onNewMessage) {
			this.onNewMessage(message);
		}
	}

	public getMessages() {
		return this.messages;
	}

	async queryReasoningModel() {
		const result = await this.rawCallReasoningModel();
		if (result.choices?.length) {
			return await this.handleResponse(result);
		}
		return "No answer";
	}

	protected async rawCallReasoningModel() {
		const tools = this.mcpServer?.getTools() || [];
		return await this.model.queryReasoningModel(this.messages, tools);
	}

	protected async handleResponse(response: ChatCompletionResponse) {
		if (!response.choices?.length) {
			throw new Error("No response choices found");
		}

		const { message: assistantMessage, finishReason } = response.choices[0];

		if (assistantMessage.role === "assistant") {
			this.addAssistantMessage(assistantMessage);
		}

		if (finishReason === "tool_calls") {
			if (!assistantMessage.toolCalls) {
				throw new Error("No tool calls found in response");
			}

			for (const toolCall of assistantMessage.toolCalls) {
				if (!toolCall.id) {
					throw new Error("Tool call ID not found");
				}
				const toolResult = await this.mcpServer.callTool(toolCall);
				const message = toMistralMessage(toolCall.id, toolResult);
				this.messages.push({
						...message,
						insertedAt: new Date().toISOString()
				});
				return await this.queryReasoningModel();
			}
		}
	}

	abstract initialize(): Promise<void>;
	abstract prompt(prompt: Prompt): Promise<void>;


}
