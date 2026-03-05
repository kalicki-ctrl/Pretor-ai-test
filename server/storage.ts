import { prompts, aiResponses, type Prompt, type InsertPrompt, type AiResponse, type InsertAiResponse } from "@shared/schema";

export interface IStorage {
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  createAiResponse(response: InsertAiResponse): Promise<AiResponse>;
  getAiResponsesByPromptId(promptId: number): Promise<AiResponse[]>;
}

export class MemStorage implements IStorage {
  private prompts: Map<number, Prompt>;
  private aiResponses: Map<number, AiResponse>;
  private currentPromptId: number;
  private currentResponseId: number;

  constructor() {
    this.prompts = new Map();
    this.aiResponses = new Map();
    this.currentPromptId = 1;
    this.currentResponseId = 1;
  }

  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const id = this.currentPromptId++;
    const prompt: Prompt = { 
      ...insertPrompt, 
      id, 
      createdAt: new Date(),
    };
    this.prompts.set(id, prompt);
    return prompt;
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    return this.prompts.get(id);
  }

  async createAiResponse(insertResponse: InsertAiResponse): Promise<AiResponse> {
    const id = this.currentResponseId++;
    const response: AiResponse = { 
      ...insertResponse, 
      id, 
      createdAt: new Date(),
      error: insertResponse.error || null,
      responseTime: insertResponse.responseTime || 0,
      tokens: insertResponse.tokens || 0,
    };
    this.aiResponses.set(id, response);
    return response;
  }

  async getAiResponsesByPromptId(promptId: number): Promise<AiResponse[]> {
    return Array.from(this.aiResponses.values())
      .filter(response => response.promptId === promptId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export const storage = new MemStorage();