import { ThinkingLevel } from "@google/genai";
import type { GoogleGenAI } from "@google/genai";
import type { BrandContext, DesignerOutput, GenerationQuality } from "./types";

interface DesignerInput {
    ai: GoogleGenAI;
    model: string;
    message: string;
    brandContext: BrandContext;
    quality: GenerationQuality;
    masterPlan: Record<string, unknown>;
}

function extractBalancedJson(text: string): string | null {
    const firstOpen = text.indexOf("{");
    if (firstOpen === -1) return null;

    let inString = false;
    let escapeNext = false;
    let depth = 0;

    for (let i = firstOpen; i < text.length; i++) {
        const char = text[i];
        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === "\\") {
            if (inString) escapeNext = true;
            continue;
        }

        if (char === "\"") {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === "{") depth++;
            if (char === "}") {
                depth--;
                if (depth === 0) return text.slice(firstOpen, i + 1);
            }
        }
    }

    return null;
}

function parseDesignerJson(text: string): { designDoc: string; colors: string[]; fonts: string[] } | null {
    const trimmed = text.trim();
    const candidate = extractBalancedJson(trimmed) ?? trimmed;

    try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const designDoc = typeof parsed.designDoc === "string" ? parsed.designDoc : "";
        const colors = Array.isArray(parsed.designTokensColors)
            ? parsed.designTokensColors.filter((v): v is string => typeof v === "string")
            : [];
        const fonts = Array.isArray(parsed.designTokensFonts)
            ? parsed.designTokensFonts.filter((v): v is string => typeof v === "string")
            : [];

        if (designDoc) {
            return { designDoc, colors, fonts };
        }
    } catch {
        return null;
    }

    return null;
}

function getDesignerThinkingLevel(quality: GenerationQuality): ThinkingLevel {
    if (quality === "high") return ThinkingLevel.MEDIUM;
    if (quality === "balanced") return ThinkingLevel.LOW;
    return ThinkingLevel.MINIMAL;
}

function getDesignerOutputTokens(quality: GenerationQuality): number {
    if (quality === "high") return 8192;
    if (quality === "balanced") return 4096;
    return 2048;
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function buildFallbackDesignDoc(message: string, brandContext: BrandContext): string {
    return [
        `Design direction for ${brandContext.name}: premium and conversion-focused landing page.`,
        `Prompt intent: ${message}`,
        "Use strong visual hierarchy: bold hero, feature grid, clear call-to-action.",
        "Use smooth motion and subtle hover effects while preserving accessibility.",
        "Ensure mobile-first layout and semantic sectioning.",
    ].join("\n");
}

export async function runDesigner(input: DesignerInput): Promise<DesignerOutput> {
    const { ai, model, message, brandContext, quality, masterPlan } = input;

    const palette = brandContext.colorPalette;
    const baseColors = uniqueStrings([
        palette.primary,
        palette.secondary,
        palette.accent,
        palette.background,
        palette.text,
    ]);

    const prompt = [
        "Generate a concise visual design spec for a website builder pipeline.",
        "Return ONLY valid JSON in this shape:",
        "{",
        '  "designDoc": string,',
        '  "designTokensColors": string[],',
        '  "designTokensFonts": string[]',
        "}",
        `User prompt: ${message}`,
        `Brand context: ${JSON.stringify(brandContext)}`,
        `Master plan: ${JSON.stringify(masterPlan)}`,
        `Required colors (must be included): ${baseColors.join(", ")}`,
        "Font recommendations should be realistic web fonts (2-3 entries).",
    ].join("\n");

    let designDoc = "";
    let generatedColors: string[] = [];
    let generatedFonts: string[] = [];

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingLevel: getDesignerThinkingLevel(quality),
                },
                temperature: 0.4,
                maxOutputTokens: getDesignerOutputTokens(quality),
            },
        });

        const parsed = parseDesignerJson(response.text || "");
        if (parsed) {
            designDoc = parsed.designDoc;
            generatedColors = parsed.colors;
            generatedFonts = parsed.fonts;
        }
    } catch (error) {
        console.warn("Designer generation failed, using fallback design spec:", error);
    }

    if (!designDoc) {
        designDoc = buildFallbackDesignDoc(message, brandContext);
    }

    const colors = uniqueStrings([...baseColors, ...generatedColors]);
    const fonts = uniqueStrings([
        ...generatedFonts,
        "Manrope",
        "Space Grotesk",
    ]).slice(0, 4);

    return {
        designDoc,
        designTokens: { colors, fonts },
    };
}
