import { Client } from "@modelcontextprotocol/sdk/client";
import { MCPCallToolResult, MCPListToolsResult, MistralTool } from "./types";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { toMcpToolCall, toMistralTools } from "./converter";
import { ToolCall } from "@mistralai/mistralai/models/components";

class MCPServer {
	url: URL;
	name: string;
	// client is defined after connect
	client: Client | null;
	tools: MistralTool[];

	constructor(url: string, name: string) {
		this.url = new URL(url);
		this.name = name;
		this.tools = [];
	}

	async connect() {
		const transport = new StreamableHTTPClientTransport(this.url);
		const client = new Client({
			name: this.name + "-client",
			version: "1.0.0",
		})
		await client.connect(transport);
		this.client = client;
		const toolList = await client.listTools() as MCPListToolsResult;
		const mistralTools = toMistralTools(toolList);
		this.tools = mistralTools;
	}

	getTools() {
			return this.tools;
	}

	async callTool(callRequest: ToolCall): Promise<MCPCallToolResult> {
		    const mcpToolCall = toMcpToolCall(callRequest);
			const toolCall = await this.client.callTool(mcpToolCall) as MCPCallToolResult;
			return toolCall;
	}
}

export default MCPServer;
