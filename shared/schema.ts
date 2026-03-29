import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiResponses = pgTable("ai_responses", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").references(() => prompts.id).notNull(),
  provider: text("provider").notNull(), // 'gemini', 'openrouter', 'groq', 'cohere', 'llama3'
  response: text("response").notNull(),
  responseTime: integer("response_time"), // milliseconds
  tokens: integer("tokens"),
  status: text("status").notNull(), // 'success', 'error'
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPromptSchema = createInsertSchema(prompts).pick({
  content: true,
});

export const insertAiResponseSchema = createInsertSchema(aiResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;
export type InsertAiResponse = z.infer<typeof insertAiResponseSchema>;
export type AiResponse = typeof aiResponses.$inferSelect;

// Frontend types
export const apiKeysSchema = z.object({
  openrouter: z.string().optional(),
  groq: z.string().optional(),
  cohere: z.string().optional(),
  google: z.string().optional(),
});

export type ApiKeys = z.infer<typeof apiKeysSchema>;

const AI_PROVIDER = z.enum(['openrouter', 'groq', 'cohere', 'llama3', 'google']);

export const promptUnderstandingSchema = z.object({
  prompt: z.string().min(10, "Prompt deve ter pelo menos 10 caracteres").max(4000),
});

export const promptAnalysisSchema = z.object({
  prompt: z.string().min(10, "Prompt deve ter pelo menos 10 caracteres").max(4000),
  recommendedAI: AI_PROVIDER.optional(),
  aiWeights: z.record(AI_PROVIDER, z.number().min(0).max(1)).optional(),
});

export type PromptAnalysis = z.infer<typeof promptAnalysisSchema>;
export type PromptUnderstanding = z.infer<typeof promptUnderstandingSchema>;