import { z } from "zod";

const rendererSelectionSchema = z.enum(["udio"]);
const llmProviderNameSchema = z.enum(["mcpSampling"]);

const agentLLMAssignmentSchema = z
  .object({
    producer: llmProviderNameSchema.default("mcpSampling"),
    promptEngineer: llmProviderNameSchema.default("mcpSampling"),
    critic: llmProviderNameSchema.default("mcpSampling"),
  })
  .strict();

const workflowSettingsSchema = z
  .object({
    maxIterations: z.number().int().positive().default(3),
    acceptanceThreshold: z.number().min(0).max(1).default(0.7),
  })
  .strict();

const idmPresetSchema = z
  .object({
    genre: z.string().default("IDM"),
    mood: z.array(z.string()).default(["dark", "glitchy"]),
    rhythm: z.string().default("broken beat, 140bpm"),
    texture: z.string().default("granular, bitcrushed"),
    mix: z.string().default("wide stereo, saturated low end"),
  })
  .strict();

const storagePathsSchema = z
  .object({
    outputDir: z.string().default("output/tracks"),
    memoryDataDir: z.string().default("memory-data"),
  })
  .strict();

export const appConfigSchema = z
  .object({
    version: z.literal(1),
    renderer: rendererSelectionSchema.default("udio"),
    llmProviders: agentLLMAssignmentSchema.default({
      producer: "mcpSampling",
      promptEngineer: "mcpSampling",
      critic: "mcpSampling",
    }),
    workflow: workflowSettingsSchema.default({ maxIterations: 3, acceptanceThreshold: 0.7 }),
    idmPreset: idmPresetSchema.default({
      genre: "IDM",
      mood: ["dark", "glitchy"],
      rhythm: "broken beat, 140bpm",
      texture: "granular, bitcrushed",
      mix: "wide stereo, saturated low end",
    }),
    storage: storagePathsSchema.default({
      outputDir: "output/tracks",
      memoryDataDir: "memory-data",
    }),
  })
  .strict();
