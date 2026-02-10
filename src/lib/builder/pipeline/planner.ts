import { ThinkingLevel } from "@google/genai";
import type { GoogleGenAI } from "@google/genai";
import type { BrandContext, GenerationQuality, PlannerOutput } from "./types";

interface PlannerInput {
    model: string;
    message: string;
    brandContext: BrandContext;
    quality: GenerationQuality;
    ai: GoogleGenAI;
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

function parsePlannerJson(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const candidate = extractBalancedJson(trimmed) ?? trimmed;

    try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }

    return null;
}

function getPlannerThinkingLevel(quality: GenerationQuality): ThinkingLevel {
    if (quality === "high") return ThinkingLevel.MEDIUM;
    if (quality === "balanced") return ThinkingLevel.LOW;
    return ThinkingLevel.MINIMAL;
}

function getPlannerOutputTokens(quality: GenerationQuality): number {
    if (quality === "high") return 8192;
    if (quality === "balanced") return 4096;
    return 2048;
}

function buildFallbackPlan(message: string, brandContext: BrandContext): Record<string, unknown> {
    return {
        objective: `Build a production-ready marketing site for ${brandContext.name}`,
        userPrompt: message,
        sections: [
            "navbar",
            "hero",
            "features",
            "social-proof",
            "cta",
            "footer",
        ],
        componentPlan: [
            { file: "src/components/Navbar.tsx", role: "navigation and branding" },
            { file: "src/components/Hero.tsx", role: "primary value proposition" },
            { file: "src/components/Features.tsx", role: "core feature grid" },
            { file: "src/components/CTA.tsx", role: "conversion section" },
            { file: "src/components/Footer.tsx", role: "secondary navigation and legal" },
        ],
        implementationNotes: [
            `Use brand palette from BrandContext: ${JSON.stringify(brandContext.colorPalette)}`,
            "Use semantic HTML and responsive layout.",
            "Keep generated code split into reusable components.",
        ],
        acceptanceCriteria: [
            "All core files are generated.",
            "Brand colors are present in src/styles.css.",
            "Main CTA and copy align with provided prompt intent.",
        ],
    };
}

export async function runPlanner(input: PlannerInput): Promise<PlannerOutput> {
    const { ai, model, message, brandContext, quality } = input;

    const prompt = [
        "Create a concise implementation plan for generating a business landing page.",
        "Return ONLY valid JSON with these fields:",
        "{",
        '  "objective": string,',
        '  "sections": string[],',
        '  "componentPlan": [{"file": string, "role": string}],',
        '  "implementationNotes": string[],',
        '  "acceptanceCriteria": string[]',
        "}",
        `Brand name: ${brandContext.name}`,
        `Brand tagline: ${brandContext.tagline}`,
        `Target audience: ${brandContext.validation.category?.targetAudience || "general users"}`,
        `Prompt intent: ${message}`,
        "REQUIRED sections (always include in plan): navbar, hero, stats-bar (3-4 metrics), features (with lucide-react icons), testimonials-or-social-proof, cta-section, footer (multi-column).",
        "Each componentPlan entry must specify visual elements: e.g. 'Feature grid with Shield/Zap/Target icons from lucide-react, hover:-translate-y-1 card animations'.",
        "The plan MUST include a StatsBar component showing impressive metrics.",
        "acceptanceCriteria MUST include: 'All feature cards have lucide-react icons', 'Stats section is present', 'CTA section has gradient background'.",
    ].join("\n");

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingLevel: getPlannerThinkingLevel(quality),
                },
                temperature: 0.3,
                maxOutputTokens: getPlannerOutputTokens(quality),
            },
        });

        const parsed = parsePlannerJson(response.text || "");
        if (parsed) {
            return { masterPlan: parsed };
        }
    } catch (error) {
        console.warn("Planner generation failed, using fallback plan:", error);
    }

    return { masterPlan: buildFallbackPlan(message, brandContext) };
}
