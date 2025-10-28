import { AssistantMessage, SystemMessage, ToolMessage, UserMessage } from "@mistralai/mistralai/models/components";
import { DateTime, Str } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type AppContext = Context<{ Bindings: Env }>;



export const RealtimeMessageValidator = z.object({
	content: Str(),
	thread_id: Str(),
	token: Str()
})

export const Task = z.object({
	name: Str({ example: "lorem" }),
	slug: Str(),
	description: Str({ required: false }),
	completed: z.boolean().default(false),
	due_date: DateTime(),
});

export const AgentAnswer = z.object({
	message: Str(),
	generated_at: DateTime()
})

export const UserPrompt = z.object({
	prompt: Str(),
})

export interface Prompt {
		prompt: string
}


export type MCPServer = {
	name: string;
	server_url: string;
};

type MCPTool = {
	name: string;
	description?: string;
	inputSchema: {
		type: "object";
		properties?: Record<string, unknown>;
	};
};

export type MCPListToolsResult = {
	tools: MCPTool[];
	nextCursor?: string;
};

export type MistralTool = {
	type?: "function";
	function: {
		name: string;
		description?: string;
		strict?: boolean;
		parameters: Record<string, unknown>;
	};
};

export type MistralToolCall = {
	id?: string;
	type?: "function" | string;
	function: {
		name: string;
		arguments: Record<string, unknown> | string;
	};
	index?: number;
};

export type MCPCallToolRequest = {
	name: string;
	arguments?: Record<string, unknown>;
};

type MCPTextContent = {
	type: "text";
	text: string;
};

type MCPImageContent = {
	type: "image";
	data: string;
	mimeType: string;
};

type MCPResourceContent = {
	type: "resource";
	resource:
	| {
		text: string;
		uri: string;
		mimeType?: string;
	}
	| { blob: string; uri: string; mimeType?: string };
};

type MCPContent = MCPTextContent | MCPImageContent | MCPResourceContent;

export type MCPCallToolResult =
	| {
		content: MCPContent[];
		isError?: boolean;
	}
	| { toolResult?: unknown };

type MistralImageURLChunk = {
	type: "image_url";
	imageUrl:
	| string
	| {
		url: string;
		detail?: string | null;
	};
};

type MistralTextChunk = {
	type: "text";
	text: string;
};

type MistralReferenceChunk = {
	type: "reference";
	referenceIds: number[];
};

type MistralContentChunk =
	| MistralTextChunk
	| MistralImageURLChunk
	| MistralReferenceChunk;

export type MistralToolMessage = {
	role: "tool";
	content: string | MistralContentChunk[] | null;
	toolCallId?: string | null;
	name?: string | null;
};

export type MistralMessage = ((SystemMessage & {
	role: "system";
	insertedAt: string;
	threadId: string;
}) | (ToolMessage & {
	role: "tool";
	insertedAt: string;
	threadId: string;
}) | (UserMessage & {
	role: "user";
	insertedAt: string;
	threadId: string;
}) | (AssistantMessage & {
	role: "assistant";
	insertedAt: string;
	threadId: string;
}))

export interface ConversationState {
		messages: MistralMessage[];
		finalMessage?: MistralMessage;
}
