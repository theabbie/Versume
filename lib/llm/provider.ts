import { GraphState } from "../types";

export interface TailorRequest {
  graph: GraphState;
  jobDescription: string;
  instruction?: string;
}

export interface TailorSuggestion {
  summary: string;
  mutations: Array<
    | { type: "toggleNode"; nodeId: string; enabled: boolean; reason: string }
    | { type: "editBullet"; nodeId: string; index: number; text: string; reason: string }
    | { type: "reorder"; sectionId: string; entryOrder: string[]; reason: string }
    | { type: "note"; reason: string }
  >;
}

export interface LLMProvider {
  readonly name: string;
  readonly configured: boolean;
  tailor(req: TailorRequest): Promise<TailorSuggestion>;
}

export class NullLLMProvider implements LLMProvider {
  readonly name = "none";
  readonly configured = false;
  async tailor(): Promise<TailorSuggestion> {
    throw new Error("No LLM provider configured. LLM-assisted tailoring lands in a future release; the graph schema already supports it.");
  }
}

export function getLLMProvider(): LLMProvider {
  return new NullLLMProvider();
}
