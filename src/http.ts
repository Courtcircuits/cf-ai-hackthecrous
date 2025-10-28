import { UserPrompt } from "./types"

export const readBody = async (request: Request) => {
	const reader = request.body.getReader()
	const pumper = () => {

		return new ReadableStream({
			start(controller) {
				return pump()
				function pump() {
					return reader.read().then(({ done, value }) => {
						// When no more data needs to be consumed, close the stream
						if (done) {
							controller.close()
							return
						}
						// Enqueue the next data chunk into our destination stream
						controller.enqueue(value)
						return pump()
					})
				}
			}
		})
	}
	const res = pumper();
	return new Response(res);
}

export const validateRequest = async (request: Request): Promise<Prompt> => {
	if (request.method !== "POST") {
		throw new Error("Invalid request method");
	}

	const content = await readBody(request);
	const res = await content.json();
	const prompt = await UserPrompt.parseAsync(res);
	if (!prompt.prompt) {
		throw new Error("Invalid prompt");
	}
	return prompt as Prompt;
}
