import { Mistral } from "@mistralai/mistralai";
import { MistralMessage, MistralTool } from "./types";

class MistralModel {
	client: Mistral;
	baseModel: string;

	constructor(model: string, apiKey: string) {
		this.client = new Mistral({
			apiKey: apiKey,
		})
		this.baseModel = model;
	}
	async queryReasoningModel(messages: MistralMessage[], tools: MistralTool[], model?: string) {
		// sleep for 1 second to avoid rate limiting
		await new Promise(resolve => setTimeout(resolve, 500));
		return await this.client.chat.complete({
			model: model || this.baseModel,
			messages: messages,
			tools: tools,
		});

	}
}

export default MistralModel;
