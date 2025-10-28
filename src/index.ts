import { Agent, Connection, ConnectionContext, routeAgentRequest, WSMessage } from "agents";
import { v4 as uuidv4 } from 'uuid';
import { MistralMessage, Prompt, RealtimeMessageValidator } from "./types";
import { validateRequest } from "./http";
import { compareSync } from "bcryptjs"
import MCPServer from "./mcp";
import MistralModel from "./model";
import MCPThinkingAgent from "./agent";
import { HackTheCrousAgent } from "./hackthecrous_agent";


interface Env {
	AI: Ai;
	MISTRAL_API_KEY: string;
	MCP_SERVER_URL: string;
	PASSWORD: string;
}

interface SessionAttributes {
	conversationId: string;
	peerIP: string; // makes sure that conversation id is not spoofed/stolen
	connection?: Connection;
	currentThreadId?: string;
}

interface State {
	conversations: Map<SessionAttributes, MCPThinkingAgent>;
}

interface Conversation {
	conversationId: string;
	peerIP: string;
	messages: MistralMessage[];
}

interface ConversationSQL {
	conversation_id: string;
	peer_ip: string;
}

interface MessageSQL {
	message_id: string;
	conversation_id: string;
	message: string;
	inserted_at: string;
	thread_id: string;
}

const sqlToMessage = (message: MessageSQL): MistralMessage => {
	const parsedMessage = JSON.parse(message.message);
	console.log(parsedMessage);
	return {
		role: parsedMessage.role,
		content: parsedMessage.content,
		insertedAt: message.inserted_at,
		threadId: message.thread_id
	}
}

const sqlToConversation = (conversation: ConversationSQL, messages: MessageSQL[]): Conversation => {

	return {
		conversationId: conversation.conversation_id,
		peerIP: conversation.peer_ip,
		messages: messages.map(sqlToMessage)
	}
}

export class HackTheCrous extends Agent<Env, State> {
	mcpServer: MCPServer;
	model: MistralModel;

	async initializeSession(session: SessionAttributes) {
		this.sql`INSERT INTO conversations(conversation_id, peer_ip) VALUES (${session.conversationId}, ${session.peerIP})`;

		return session;

	}

	async onRequest(request: Request) {
		try {
			const prompt = await validateRequest(request);
			const session: SessionAttributes = {
				conversationId: request.headers.get("x-conversation-id") || uuidv4(),
				peerIP: request.headers.get("cf-connecting-ip")
			}
			this.initializeSession(session);
			await this.askAgent(session, prompt);
			const agent = await this.getCurrentAgent(session);
			console.log(agent.getMessages());
			return new Response(JSON.stringify(agent.getMessages()), {
				headers: {
					"content-type": "application/json"
				}
			});
		} catch (e) {
			console.error(e);
			return Response.json({ msg: e }, { status: 400 })
		}
	}

	async getCurrentAgent(session: SessionAttributes) {
		const conversation = this.sql<ConversationSQL>`SELECT * FROM conversations WHERE conversation_id = ${session.conversationId} AND peer_ip = ${session.peerIP}`;
		const messages = this.sql<MessageSQL>`SELECT * FROM messages WHERE conversation_id = ${session.conversationId}`;
		const conversationObj = sqlToConversation(conversation[0], messages);
		return new HackTheCrousAgent(this.mcpServer, this.model, session.connection, conversationObj.messages, (message: MistralMessage) => {
			if (session.connection) {
				session.connection.send(JSON.stringify({ ...message, ...session }));
			}
			this.sql`INSERT INTO messages(message_id, conversation_id, message, inserted_at, thread_id) VALUES (${uuidv4()}, ${session.conversationId}, ${JSON.stringify(message)}, ${Date.now()}, ${session.currentThreadId})`;
		})
	}

	async askAgent(session: SessionAttributes, prompt: Prompt) {
		const agent = await this.getCurrentAgent(session);
		await agent.prompt(prompt);
	}

	async onConnect(connection: Connection, ctx: ConnectionContext) {
		const session = await this.initializeSession({
			conversationId: connection.id || uuidv4(),
			peerIP: connection.id
		});
		const agent = await this.getCurrentAgent(session);

		await agent.initialize();
		connection.send(JSON.stringify({
			role: "initialization",
			...session
		}))

	}

	async onMessage(connection: Connection, message: WSMessage) {
		// Handle incoming messages
		try {
			const { content, thread_id, token } = RealtimeMessageValidator.parse(JSON.parse(message as string));
			if (!compareSync(this.env.PASSWORD, token)) {
				connection.send(JSON.stringify({ role: "error", content: "Invalid token" }));
				return;
			}
			const session = {
				conversationId: connection.id,
				peerIP: connection.id,
				connection,
				currentThreadId: thread_id
			}
			if (!this.isThreadIdempotent(session)) {
				connection.send(JSON.stringify({ role: "idempotency_error", content: "Thread already exists", ...session }));
				return;
			}
			await this.askAgent(session, { prompt: content });
		} catch (e) {
			console.error(e);
			connection.send(JSON.stringify({ role: "error", content: e }));
		}
	}

	async isThreadIdempotent(session: SessionAttributes) {
		console.log("thread id", session.currentThreadId);
		if (session.currentThreadId) {
			const conversation = this.sql<ConversationSQL>`SELECT * FROM conversations WHERE conversation_id = ${session.conversationId} AND peer_ip = ${session.peerIP}`;
			const messages = this.sql<MessageSQL>`SELECT * FROM messages WHERE conversation_id = ${session.conversationId}`;
			console.log("conversation", conversation);
			console.log("messages", messages);
			const conversationObj = sqlToConversation(conversation[0], messages);
			const matchingMessage = conversationObj.messages.find(message => message.threadId === session.currentThreadId);
			console.log("matching message", matchingMessage);
			if (matchingMessage) {
				return false;
			}
		}
		return true;
	}

	async onStart() {
		// need to connect to model and mcp server when the agent starts
		this.sql`CREATE TABLE IF NOT EXISTS conversations (conversation_id TEXT PRIMARY KEY, peer_ip TEXT)`;
		this.sql`CREATE TABLE IF NOT EXISTS messages (message_id TEXT PRIMARY KEY, conversation_id TEXT, message TEXT, thread_id TEXT, inserted_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id))`;
		this.model = new MistralModel("mistral-small-2506", this.env.MISTRAL_API_KEY);
		this.mcpServer = new MCPServer(this.env.MCP_SERVER_URL, "mcp-server");
		await this.mcpServer.connect();
	}
}



export default {
	async fetch(request: Request, env: Env, ctx): Promise<Response> {
		return (
			await routeAgentRequest(request, env, ctx) || Response.json({ msg: 'no agent found' }, { status: 404 })
		)
	}
}
