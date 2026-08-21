import type { Intent } from "@/types/chat";

export type EvidenceDocument = {
  id: string;
  title: string;
  url: string;
  section: string;
  content: string;
};

export type ProviderInput = {
  messages: { role: "user" | "assistant"; content: string }[];
  intent: Intent;
  evidence: EvidenceDocument[];
  signal: AbortSignal;
  requestId?: string;
  guidance?: string;
  clarification?: string;
};

export interface AIProvider {
  streamResponse(input: ProviderInput): AsyncIterable<string>;
}
