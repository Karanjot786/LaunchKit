import type { GoogleGenAI } from "@google/genai";

export type BuilderMode = "fast" | "agentic";
export type GenerationStrategy = "fast_json" | "plan_driven" | "template_fill";
export type GenerationQuality = "speed" | "balanced" | "high";
export type PipelineStage = "planning" | "designing" | "coding" | "repairing" | "finalizing";

export interface BrandContext {
    name: string;
    tagline: string;
    logo: string | null;
    colorPalette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    validation: {
        category?: { primary: string; targetAudience: string; keywords: string[] };
        community?: { painPoints: string[] };
        opportunities?: string[];
        proposedFeatures?: { title: string; description: string; priority: string }[];
    };
    selectedFeatures?: { id: string; title: string; description: string; category: string }[];
}

export interface BuildRequestV2 {
    message: string;
    brandContext: BrandContext;
    currentFiles?: Record<string, string>;
    mode?: BuilderMode;
    strategy?: GenerationStrategy;
    quality?: GenerationQuality;
    templateId?: string;
}

export interface StreamEvent {
    type: "status" | "preview" | "tool_call" | "file_created" | "file_edited" | "message" | "error" | "done" | "install_packages";
    data: unknown;
}

export type SendEvent = (event: StreamEvent) => void;

export interface DesignTokens {
    colors: string[];
    fonts: string[];
}

export interface GenerationArtifacts {
    masterPlan?: Record<string, unknown>;
    designDoc?: string;
    designTokens?: DesignTokens;
    repairAttempts: number;
    strategyUsed: GenerationStrategy;
    tokenMetrics?: {
        systemPromptTokens: number;
        turns: number;
    };
    componentsInstalled?: string[];
}

export interface GenerationResult {
    files: Record<string, string>;
    message: string;
    artifacts: GenerationArtifacts;
    finishReason?: string;
    fallbackPath?: "none" | "agentic_fallback" | "repairer_fallback";
    parseStage?: "direct" | "repaired" | "agentic_fallback" | "repairer_fallback" | "tool_calling";
    generationDurationMs?: number;
}

export interface PlannerOutput {
    masterPlan: Record<string, unknown>;
}

export interface DesignerOutput {
    designDoc: string;
    designTokens: DesignTokens;
}

export interface RepairCandidate {
    files: Record<string, string>;
    message: string;
}

export interface GenerationHandlers {
    runFast: (
        message: string,
        brandContext: BrandContext,
        currentFiles: Record<string, string>,
        send: SendEvent,
        quality: GenerationQuality
    ) => Promise<GenerationResult>;
    runAgentic: (
        message: string,
        brandContext: BrandContext,
        currentFiles: Record<string, string>,
        send: SendEvent,
        quality: GenerationQuality
    ) => Promise<GenerationResult>;
}

export interface PipelineRunContext {
    ai: GoogleGenAI;
    model: string;
    message: string;
    brandContext: BrandContext;
    currentFiles: Record<string, string>;
    mode: BuilderMode;
    strategy: GenerationStrategy;
    quality: GenerationQuality;
    templateId?: string;
    send: SendEvent;
    handlers: GenerationHandlers;
}
