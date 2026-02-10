/**
 * Enhanced Validation Pipeline v2
 * 
 * Dual-mode validation using Gemini AI:
 * - Quick Mode: Flash model with Google Search grounding (~5-10 sec)
 * - Deep Mode: Deep Research Agent for comprehensive analysis (~1-3 min)
 * 
 * Output format: TOON (Token-Oriented Object Notation)
 */

import { genAI, MODELS } from "./gemini";
import { encode as toonEncode } from "@toon-format/toon";
import {
    runDeepResearch,
    getValidationPrompt,
    VALIDATION_SYSTEM_PROMPT,
    type ProgressCallback
} from "./deep-research";

// Types
export interface CategoryResult {
    primary: string;
    secondary: string[];
    confidence: number;
    targetAudience: string;
    keywords: string[];
}

export interface CommunityData {
    sentiment: "positive" | "mixed" | "negative";
    engagement: "high" | "medium" | "low";
    painPoints: string[];
}

export interface MarketData {
    size: string;
    growth: string;
    competitors: { name: string; description: string }[];
    trends: string[];
    sources: { title: string; url: string }[];
}

export interface ValidationScores {
    viability: number;
    painPointStrength: number;
    demandLevel: number;
    competitionIntensity: number;
}

export interface EnhancedValidationResult {
    category: CategoryResult;
    community: CommunityData;
    market: MarketData;
    scores: ValidationScores;
    verdict: string;
    recommendation: "proceed" | "pivot" | "reconsider";
    opportunities: string[];
    risks: string[];
    proposedFeatures: {
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
    }[];
    rawToon?: string;
}

/**
 * Parse TOON format response into structured result
 */
function parseToonValidation(toonText: string): Partial<EnhancedValidationResult> {
    const result: Partial<EnhancedValidationResult> = {
        rawToon: toonText,
    };

    try {
        // Extract values using regex patterns for TOON format
        const getValue = (key: string): string => {
            const match = toonText.match(new RegExp(`${key}:([^\\n]+)`));
            return match ? match[1].trim() : "";
        };

        const getArrayValues = (key: string): string[] => {
            const match = toonText.match(new RegExp(`${key}\\[\\d+\\]:([^\\n]+)`));
            if (match) {
                return match[1].split(",").map(s => s.trim());
            }
            return [];
        };

        // Parse category
        result.category = {
            primary: getValue("primary") || "startup",
            secondary: getArrayValues("secondary"),
            confidence: parseFloat(getValue("confidence")) || 0.5,
            targetAudience: getValue("audience") || "",
            keywords: getArrayValues("keywords"),
        };

        // Parse community
        const sentiment = getValue("sentiment") as "positive" | "mixed" | "negative";
        const engagement = getValue("engagement") as "high" | "medium" | "low";
        result.community = {
            sentiment: sentiment || "mixed",
            engagement: engagement || "medium",
            painPoints: getArrayValues("painPoints"),
        };

        // Parse market
        result.market = {
            size: getValue("size") || "Unknown",
            growth: getValue("growth") || "Unknown",
            competitors: [],
            trends: getArrayValues("trends"),
            sources: [],
        };

        // Parse competitors (multi-line block)
        const competitorMatches = toonText.matchAll(/name:([^\n]+)\n\s*description:([^\n]+)/g);
        const competitors: { name: string; description: string }[] = [];
        for (const match of competitorMatches) {
            competitors.push({
                name: match[1].trim(),
                description: match[2].trim(),
            });
        }
        result.market.competitors = competitors;

        // Parse scores
        result.scores = {
            viability: parseInt(getValue("viability")) || 5,
            painPointStrength: parseInt(getValue("painPointStrength")) || 5,
            demandLevel: parseInt(getValue("demandLevel")) || 5,
            competitionIntensity: parseInt(getValue("competitionIntensity")) || 5,
        };

        // Parse verdict
        const recommendation = getValue("recommendation") as "proceed" | "pivot" | "reconsider";
        result.recommendation = recommendation || "reconsider";
        result.verdict = getValue("summary") || "";

        // Parse opportunities and risks
        result.opportunities = getArrayValues("opportunities");
        result.risks = getArrayValues("risks");

        // Parse features (multi-line block)
        const featureMatches = toonText.matchAll(/title:([^\n]+)\n\s*description:([^\n]+)\n\s*priority:([^\n]+)/g);
        const features: { title: string; description: string; priority: "high" | "medium" | "low" }[] = [];
        for (const match of featureMatches) {
            const priority = match[3].trim() as "high" | "medium" | "low";
            features.push({
                title: match[1].trim(),
                description: match[2].trim(),
                priority: priority || "medium",
            });
        }
        result.proposedFeatures = features;

    } catch (error) {
        console.warn("[Validation] Error parsing TOON response:", error);
    }

    return result;
}

/**
 * Quick validation using selected model with Google Search grounding
 * ~5-10 seconds
 */
export async function runQuickValidation(
    idea: string,
    modelName: string = MODELS.FLASH,
    onProgress?: (step: string, progress: number) => void
): Promise<EnhancedValidationResult> {
    const model = genAI.models;

    onProgress?.("Starting quick validation...", 10);

    const response = await model.generateContent({
        model: modelName,
        contents: `${VALIDATION_SYSTEM_PROMPT}\n\n${getValidationPrompt(idea)}`,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    onProgress?.("Parsing results...", 80);

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
        (chunk: { web?: { uri?: string; title?: string } }) => ({
            title: chunk.web?.title || "Source",
            url: chunk.web?.uri || "",
        })
    ) || [];

    // Parse TOON response
    const parsed = parseToonValidation(text);

    // Add grounding sources
    if (parsed.market) {
        parsed.market.sources = sources;
    }

    onProgress?.("Complete!", 100);

    // Return with defaults for missing fields
    return {
        category: parsed.category || {
            primary: "startup",
            secondary: [],
            confidence: 0.5,
            targetAudience: "",
            keywords: [],
        },
        community: parsed.community || {
            sentiment: "mixed",
            engagement: "medium",
            painPoints: [],
        },
        market: parsed.market || {
            size: "Unknown",
            growth: "Unknown",
            competitors: [],
            trends: [],
            sources,
        },
        scores: parsed.scores || {
            viability: 5,
            painPointStrength: 5,
            demandLevel: 5,
            competitionIntensity: 5,
        },
        verdict: parsed.verdict || "",
        recommendation: parsed.recommendation || "reconsider",
        opportunities: parsed.opportunities || [],
        risks: parsed.risks || [],
        proposedFeatures: parsed.proposedFeatures || [],
        rawToon: text,
    };
}

/**
 * Deep validation using Deep Research Agent
 * ~1-3 minutes, comprehensive analysis
 */
export async function runDeepValidation(
    idea: string,
    onProgress?: ProgressCallback
): Promise<EnhancedValidationResult> {
    // Run deep research
    const toonResponse = await runDeepResearch(idea, onProgress);

    // Parse TOON response
    const parsed = parseToonValidation(toonResponse);

    // Return with defaults for missing fields
    return {
        category: parsed.category || {
            primary: "startup",
            secondary: [],
            confidence: 0.5,
            targetAudience: "",
            keywords: [],
        },
        community: parsed.community || {
            sentiment: "mixed",
            engagement: "medium",
            painPoints: [],
        },
        market: parsed.market || {
            size: "Unknown",
            growth: "Unknown",
            competitors: [],
            trends: [],
            sources: [],
        },
        scores: parsed.scores || {
            viability: 5,
            painPointStrength: 5,
            demandLevel: 5,
            competitionIntensity: 5,
        },
        verdict: parsed.verdict || "",
        recommendation: parsed.recommendation || "reconsider",
        opportunities: parsed.opportunities || [],
        risks: parsed.risks || [],
        proposedFeatures: parsed.proposedFeatures || [],
        rawToon: toonResponse,
    };
}

/**
 * Main validation pipeline
 * Supports both quick and deep modes with model selection
 */
export async function runValidationPipeline(
    idea: string,
    mode: "quick" | "deep" = "quick",
    modelName: string = MODELS.FLASH,
    onProgress?: (step: string, progress: number) => void
): Promise<EnhancedValidationResult> {
    if (mode === "deep") {
        return runDeepValidation(idea, (update) => {
            onProgress?.(update.text || "", update.progress || 0);
        });
    }

    return runQuickValidation(idea, modelName, onProgress);
}

/**
 * Encode validation result to TOON format for token-efficient storage
 */
export function encodeValidationToToon(result: EnhancedValidationResult): string {
    try {
        return toonEncode(result);
    } catch {
        return JSON.stringify(result, null, 2);
    }
}
