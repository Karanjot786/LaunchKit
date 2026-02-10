import { ThinkingLevel } from "@google/genai";
import type { GoogleGenAI } from "@google/genai";
import type {
    BrandContext,
    DesignTokens,
    GenerationQuality,
    RepairCandidate,
} from "./types";

export interface SemanticValidationResult {
    isValid: boolean;
    issues: string[];
}

interface RepairerInput {
    ai: GoogleGenAI;
    model: string;
    message: string;
    brandContext: BrandContext;
    files: Record<string, string>;
    issues: string[];
    quality: GenerationQuality;
}

function normalizeContent(files: Record<string, string>): string {
    return Object.values(files).join("\n").toLowerCase();
}

function containsColor(content: string, color: string): boolean {
    const normalized = color.trim().toLowerCase();
    if (!normalized) return true;
    return content.includes(normalized);
}

export function validateSemanticOutput(
    files: Record<string, string>,
    brandContext: BrandContext,
    designTokens?: DesignTokens
): SemanticValidationResult {
    const issues: string[] = [];
    const requiredFiles = ["src/App.tsx", "src/index.tsx", "src/styles.css"];

    for (const file of requiredFiles) {
        if (!files[file]) {
            issues.push(`Missing required file: ${file}`);
        }
    }

    const content = normalizeContent(files);
    const colorsToCheck = [
        brandContext.colorPalette.primary,
        brandContext.colorPalette.secondary,
        brandContext.colorPalette.accent,
        brandContext.colorPalette.background,
        brandContext.colorPalette.text,
        ...(designTokens?.colors || []),
    ].filter(Boolean);

    const missingColors = colorsToCheck.filter((color) => !containsColor(content, color));
    if (missingColors.length > 2) {
        issues.push(`Missing brand/design color values in output: ${missingColors.slice(0, 5).join(", ")}`);
    }

    const styles = files["src/styles.css"] || "";
    const requiredCssVars = ["--color-primary", "--color-secondary", "--color-accent", "--color-background", "--color-text"];
    const missingVars = requiredCssVars.filter((token) => !styles.includes(token));
    if (missingVars.length > 0) {
        issues.push(`Missing required CSS variables in src/styles.css: ${missingVars.join(", ")}`);
    }

    if (!files["src/App.tsx"]?.includes("<main")) {
        issues.push("src/App.tsx should include a <main> landmark for semantic structure.");
    }

    // Visual quality checks
    const hasLucideImport = Object.values(files).some((f) => f.includes("lucide-react"));
    if (!hasLucideImport) {
        issues.push("No lucide-react icon imports found. Feature cards MUST use lucide-react icons, not empty placeholder circles.");
    }

    const hasStatsSection = content.includes("stats") || content.includes("social-proof") || content.includes("metric");
    if (!hasStatsSection) {
        issues.push("Missing stats/social-proof section. Add a section with 3-4 impressive metrics (e.g., users, uptime, countries).");
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
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

function parseRepairCandidate(text: string): RepairCandidate | null {
    const candidate = extractBalancedJson(text.trim()) ?? text.trim();
    try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const filesValue = parsed.files;
        if (!filesValue || typeof filesValue !== "object" || Array.isArray(filesValue)) {
            return null;
        }

        const files: Record<string, string> = {};
        for (const [path, content] of Object.entries(filesValue as Record<string, unknown>)) {
            if (typeof content === "string") {
                files[path] = content;
            }
        }

        if (Object.keys(files).length === 0) {
            return null;
        }

        const message = typeof parsed.message === "string"
            ? parsed.message
            : "Applied semantic repair to generated files.";
        return { files, message };
    } catch {
        return null;
    }
}

function getRepairThinkingLevel(quality: GenerationQuality): ThinkingLevel {
    if (quality === "high") return ThinkingLevel.MEDIUM;
    if (quality === "balanced") return ThinkingLevel.LOW;
    return ThinkingLevel.MINIMAL;
}

function getRepairTokens(quality: GenerationQuality): number {
    if (quality === "high") return 32768;
    if (quality === "balanced") return 24576;
    return 16384;
}

function applyLocalRepair(files: Record<string, string>, brandContext: BrandContext): RepairCandidate {
    const updated = { ...files };
    const varsBlock = [
        ":root {",
        `  --color-primary: ${brandContext.colorPalette.primary};`,
        `  --color-secondary: ${brandContext.colorPalette.secondary};`,
        `  --color-accent: ${brandContext.colorPalette.accent};`,
        `  --color-background: ${brandContext.colorPalette.background};`,
        `  --color-text: ${brandContext.colorPalette.text};`,
        "}",
        "",
    ].join("\n");

    if (!updated["src/styles.css"]) {
        updated["src/styles.css"] = `${varsBlock}body { margin: 0; font-family: 'Inter', sans-serif; background: var(--color-background); color: var(--color-text); }\n`;
    } else if (!updated["src/styles.css"].includes("--color-primary")) {
        updated["src/styles.css"] = `${varsBlock}${updated["src/styles.css"]}`;
    }

    if (!updated["src/App.tsx"]) {
        updated["src/App.tsx"] = [
            "export default function App() {",
            "  return (",
            "    <main>",
            "      <h1>Landing Page</h1>",
            "    </main>",
            "  );",
            "}",
            "",
        ].join("\n");
    }

    if (!updated["src/index.tsx"]) {
        updated["src/index.tsx"] = [
            'import React from "react";',
            'import ReactDOM from "react-dom/client";',
            'import App from "./App";',
            'import "./styles.css";',
            "",
            'ReactDOM.createRoot(document.getElementById("root")!).render(',
            "  <React.StrictMode>",
            "    <App />",
            "  </React.StrictMode>",
            ");",
            "",
        ].join("\n");
    }

    return {
        files: updated,
        message: "Applied local semantic repair fallback.",
    };
}

export async function runRepairer(input: RepairerInput): Promise<RepairCandidate> {
    const { ai, model, message, brandContext, files, issues, quality } = input;

    const prompt = [
        "Repair the generated website project.",
        "You must fix semantic and brand-token issues while preserving existing structure.",
        "Return ONLY valid JSON with shape:",
        '{ "message": "string", "files": { "path": "full file content" } }',
        `Original user request: ${message}`,
        `Brand context: ${JSON.stringify(brandContext)}`,
        `Detected issues: ${JSON.stringify(issues)}`,
        `Current files: ${JSON.stringify(files)}`,
        "Do not return markdown.",
    ].join("\n");

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingLevel: getRepairThinkingLevel(quality),
                },
                temperature: 0.2,
                maxOutputTokens: getRepairTokens(quality),
            },
        });

        const parsed = parseRepairCandidate(response.text || "");
        if (parsed) {
            return parsed;
        }
    } catch (error) {
        console.warn("Repairer generation failed, applying local repair fallback:", error);
    }

    return applyLocalRepair(files, brandContext);
}
