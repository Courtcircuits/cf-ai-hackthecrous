Does agents by cloudflare support other model than open ai ? 

-- model : mistral + web search tool

> Yes, Cloudflare Workers AI supports a wide range of models beyond OpenAI. As of October 2025, Workers AI offers a curated set of popular open-source models, including:

    Llama 3.1 (optimized for multilingual dialogue and outperforming many open and closed chat models)
    Mistral
    Stable Diffusion
    Gemma 3 (multimodal, supporting text and image input)
    SEA-LION (for Southeast Asian languages)
    IndicTrans2 (for Indic language translations)
    Lucid Origin (from Leonardo.AI, for image generation)
    @cf/baai/bge-m3 (multilingual embeddings)
    @cf/openai/gpt-oss-120b and @cf/openai/gpt-oss-20b (OpenAI’s open models, recently added)

    Workers AI also allows you to run these models serverlessly, with support for text generation, image classification, object detection, and more. You can integrate these models into your applications via the Cloudflare API or directly from Workers and Pages.
    Would you like details on a specific model or how to integrate them?

    > https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/
