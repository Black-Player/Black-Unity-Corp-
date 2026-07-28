import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface GeminiApiRequestParams {
  prompt?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | string;
  systemInstruction?: string;
  thinkingMode?: boolean;
  image?: { base64: string; mimeType: string };
}

/**
 * Handle multi-turn or single generation request with specified model and options
 */
export async function generateGeminiResponse(params: GeminiApiRequestParams) {
  const ai = getGeminiClient();

  // Model selection strategy according to guidelines:
  // - 'gemini-3.1-pro-preview' for complex tasks / thinking mode
  // - 'gemini-3.5-flash' for general tasks
  // - 'gemini-3.1-flash-lite' for fast, low-latency tasks
  let model = params.model || 'gemini-3.5-flash';

  if (params.thinkingMode) {
    model = 'gemini-3.1-pro-preview';
  }

  const config: any = {};

  if (params.systemInstruction) {
    config.systemInstruction = params.systemInstruction;
  }

  if (params.thinkingMode && model === 'gemini-3.1-pro-preview') {
    config.thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
    // Crucial: Do NOT set maxOutputTokens when using thinking mode
  }

  // Construct contents array
  const contents: any[] = [];

  if (params.messages && params.messages.length > 0) {
    params.messages.forEach((msg) => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    });
  }

  // Handle image attachment or latest prompt
  const latestParts: any[] = [];
  if (params.prompt) {
    latestParts.push({ text: params.prompt });
  }

  if (params.image && params.image.base64) {
    latestParts.push({
      inlineData: {
        data: params.image.base64.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: params.image.mimeType || 'image/png',
      },
    });
  }

  if (latestParts.length > 0) {
    // If last message in contents is already 'user', append parts to it, else add new message
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push(...latestParts);
    } else {
      contents.push({
        role: 'user',
        parts: latestParts,
      });
    }
  }

  if (contents.length === 0) {
    throw new Error("No prompt or content provided for Gemini generation.");
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  return {
    text: response.text || '',
    modelUsed: model,
    thinkingEnabled: !!params.thinkingMode && model === 'gemini-3.1-pro-preview',
  };
}
