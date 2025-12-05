import { GoogleGenAI, Chat } from "@google/genai";

const SYSTEM_PROMPT = `
You are an expert system architect and product assistant for "AutoFlow", an AI Automation Simulation Platform.
The platform is a VISUAL AI AUTOMATION & SIMULATION TOOL, similar to n8n or Node-RED.

Your capabilities:
1. Interpret natural language requests to design workflows.
2. Generate JSON configurations for workflows based on user requests.
3. Explain node behaviors and RAG pipelines.

Workflows follow this structure:
{
  "id": "string",
  "name": "string",
  "description": "string",
  "start_node_id": "string",
  "nodes": [ { "id": "...", "type": "...", "config": {...}, "next": "..." } ]
}

Node Types:
- trigger (manual, webhook, schedule)
- csv-reader, pdf-reader
- chunk-splitter, embedding-index (RAG)
- ai-agent (LLM), rag-ai-agent (RAG LLM)
- whatsapp, email, http-request (Simulated targets)
- log, output

When the user asks to create a flow, output the JSON in a markdown code block labeled 'json'.
Ensure the JSON is valid and follows the schema. 
Always favor "simulate" mode in configs.
Make reasonable assumptions for missing config values.
`;

let chatSession: Chat | null = null;

export const initializeChat = (): Chat => {
  if (chatSession) return chatSession;
  
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) {
    console.warn("No API Key found for Gemini");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  try {
    const chat = initializeChat();
    const result = await chat.sendMessage({ message });
    return result.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error communicating with AI Assistant. Please check your API key.";
  }
};