/**
 * Gemini Deep Research Agent Module
 * 
 * Provides comprehensive startup validation using the Deep Research Agent
 * with streaming support for real-time progress updates.
 * 
 * @see https://ai.google.dev/gemini-api/docs/deep-research
 */

import { GoogleGenAI } from "@google/genai";

// Initialize client
const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
});

// Deep Research Agent model
const DEEP_RESEARCH_AGENT = "deep-research-pro-preview-12-2025";

// System prompt for startup validation expert
export const VALIDATION_SYSTEM_PROMPT = `# ROLE
You are a world-class startup validation analyst with expertise in:
- Market research and competitive analysis
- Customer development and pain point identification  
- Technology trend forecasting
- Business model evaluation
- Product-market fit assessment

# APPROACH
When analyzing a startup idea, you:
1. Identify the core problem being solved
2. Research the target market size (TAM/SAM/SOM)
3. Analyze existing competitors and their positioning
4. Evaluate community signals and user sentiment
5. Assess viability based on timing, team fit, and market dynamics
6. Provide actionable recommendations

# OUTPUT FORMAT
Always structure your response using TOON format (Token-Oriented Object Notation).
TOON uses indentation instead of braces, colons for values, and [N] for array lengths.

Example TOON structure:
validation
  category
    primary:SaaS
    secondary[2]:productivity,AI/ML
    confidence:0.85
  market
    size:$47B TAM
    growth:12% CAGR
  scores
    viability:8
    demandLevel:7
  verdict
    recommendation:proceed
    summary:Strong opportunity with validated demand`;

/**
 * Generate the validation prompt for a startup idea
 */
export function getValidationPrompt(idea: string): string {
    return `Validate this startup idea thoroughly:

IDEA: "${idea}"

Use web search to research:
1. Market size and growth projections
2. Top 5 competitors with descriptions
3. User pain points from forums/discussions
4. Recent industry trends (2024-2025)

RESPOND IN TOON FORMAT:
validation
  category
    primary:<main category from: fitness,health,fintech,entertainment,AI/ML,SaaS,e-commerce,education,gaming,social,productivity,developer-tools,travel,food,real-estate,crypto/web3>
    secondary[N]:<related categories>
    confidence:<0.0-1.0>
    audience:<target user description>
    keywords[5]:<k1>,<k2>,<k3>,<k4>,<k5>
  market
    size:<TAM estimate with source>
    growth:<growth rate projection>
    trends[3]:<t1>,<t2>,<t3>
  competitors[5]
    name:<competitor name>
    description:<one-line description>
    ---
  community
    sentiment:<positive|mixed|negative>
    engagement:<high|medium|low>
    painPoints[3]:<p1>,<p2>,<p3>
  scores
    viability:<1-10>
    painPointStrength:<1-10>
    demandLevel:<1-10>
    competitionIntensity:<1-10>
  verdict
    recommendation:<proceed|pivot|reconsider>
    summary:<2-3 sentence analysis>
  opportunities[3]:<o1>,<o2>,<o3>
  risks[3]:<r1>,<r2>,<r3>
  features[3]
    title:<feature name>
    description:<what it does and why>
    priority:<high|medium|low>
    ---`;
}

/**
 * Progress callback type for streaming updates
 */
export type ProgressCallback = (update: {
    type: "thinking" | "content" | "complete" | "error";
    text?: string;
    progress?: number;
}) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InteractionChunk = any;

/**
 * Start Deep Research validation with streaming
 * 
 * Uses the Gemini Deep Research Agent for comprehensive analysis.
 * Takes 1-3 minutes but provides thorough, cited research.
 */
export async function runDeepResearch(
    idea: string,
    onProgress?: ProgressCallback
): Promise<string> {
    const client = genAI;

    try {
        onProgress?.({ type: "thinking", text: "Starting deep research...", progress: 5 });

        // Start research in background with streaming
        const stream = await client.interactions.create({
            input: `${VALIDATION_SYSTEM_PROMPT}\n\n${getValidationPrompt(idea)}`,
            agent: DEEP_RESEARCH_AGENT,
            background: true,
            stream: true,
            agent_config: {
                type: "deep-research",
                thinking_summaries: "auto"
            }
        });

        let result = "";

        for await (const chunk of stream as AsyncIterable<InteractionChunk>) {
            // Capture interaction ID
            if (chunk.event_type === "interaction.start") {
                onProgress?.({ type: "thinking", text: "Research agent initialized", progress: 10 });
            }

            // Handle content deltas
            if (chunk.event_type === "content.delta") {
                if (chunk.delta?.type === "text") {
                    result += chunk.delta.text || "";
                    onProgress?.({ type: "content", text: chunk.delta.text, progress: 50 });
                } else if (chunk.delta?.type === "thought_summary") {
                    const thought = chunk.delta?.content?.text || "";
                    onProgress?.({ type: "thinking", text: thought, progress: 30 });
                }
            }

            // Handle completion
            if (chunk.event_type === "interaction.complete") {
                onProgress?.({ type: "complete", progress: 100 });
            }
        }

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        onProgress?.({ type: "error", text: errorMessage });
        throw error;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InteractionResult = any;

/**
 * Poll-based Deep Research (non-streaming fallback)
 */
export async function runDeepResearchPolling(idea: string): Promise<string> {
    const client = genAI;

    // Start research in background
    const interaction = await client.interactions.create({
        input: `${VALIDATION_SYSTEM_PROMPT}\n\n${getValidationPrompt(idea)}`,
        agent: DEEP_RESEARCH_AGENT,
        background: true,
    });

    const interactionId = interaction.id;
    if (!interactionId) {
        throw new Error("Failed to get interaction ID");
    }

    // Poll for results
    while (true) {
        const result: InteractionResult = await client.interactions.get(interactionId);

        if (result.status === "completed") {
            // Get the last output text
            const outputs = result.outputs || [];
            const lastOutput = outputs[outputs.length - 1];
            return lastOutput?.text || "";
        } else if (result.status === "failed") {
            throw new Error(`Research failed: ${result.error || "Unknown error"}`);
        }

        // Wait 10 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
}

export { genAI };
