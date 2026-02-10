/**
 * TOON (Token-Oriented Object Notation) Utility
 * 
 * Converts JSON data to TOON format for LLM prompts to reduce token usage.
 * TOON uses YAML-like indentation and compact syntax.
 * 
 * @see https://github.com/toon-format/toon
 */

import { encode as toonEncode } from "@toon-format/toon";

export interface BrandContextForToon {
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
    category?: string;
    targetAudience?: string;
    painPoints?: string[];
    features?: Array<{ title: string; description: string; priority: string }>;
}

/**
 * Encode brand context to TOON format for minimal token usage
 * 
 * Example output:
 * ```
 * brand
 *   name:LaunchKit
 *   tagline:Build faster
 *   colors:primary=#6366F1,secondary=#8B5CF6,accent=#F59E0B,bg=#0F172A,text=#F8FAFC
 *   audience:Developers
 * ```
 */
export function encodeBrandContext(brand: BrandContextForToon): string {
    // Create a flattened structure for TOON encoding
    // NOTE: Logo is intentionally excluded - can be huge base64 data URLs
    const toonData = {
        brand: {
            name: brand.name,
            tagline: brand.tagline,
            colors: `primary=${brand.colorPalette.primary},secondary=${brand.colorPalette.secondary},accent=${brand.colorPalette.accent},bg=${brand.colorPalette.background},text=${brand.colorPalette.text}`,
            category: brand.category || "startup",
            audience: brand.targetAudience || "users",
        },
    };

    // Add pain points as comma-separated if present
    if (brand.painPoints && brand.painPoints.length > 0) {
        (toonData.brand as Record<string, string>).painPoints = brand.painPoints.slice(0, 3).join("; ");
    }

    // Add features as compact list
    if (brand.features && brand.features.length > 0) {
        (toonData.brand as Record<string, string>).features = brand.features
            .slice(0, 4)
            .map((f) => `${f.title}(${f.priority})`)
            .join(", ");
    }

    try {
        return toonEncode(toonData);
    } catch {
        // Fallback to simple manual encoding if TOON library fails
        return manualEncode(brand);
    }
}

/**
 * Manual fallback encoder in case @toon-format/toon fails
 */
function manualEncode(brand: BrandContextForToon): string {
    const lines = [
        `brand`,
        `  name:${brand.name}`,
        `  tagline:${brand.tagline}`,
        `  logo:${brand.logo || "none"}`,
        `  colors:primary=${brand.colorPalette.primary},secondary=${brand.colorPalette.secondary},accent=${brand.colorPalette.accent},bg=${brand.colorPalette.background},text=${brand.colorPalette.text}`,
        `  category:${brand.category || "startup"}`,
        `  audience:${brand.targetAudience || "users"}`,
    ];

    if (brand.painPoints && brand.painPoints.length > 0) {
        lines.push(`  painPoints:${brand.painPoints.slice(0, 3).join("; ")}`);
    }

    if (brand.features && brand.features.length > 0) {
        lines.push(
            `  features:${brand.features
                .slice(0, 4)
                .map((f) => `${f.title}(${f.priority})`)
                .join(", ")}`
        );
    }

    return lines.join("\n");
}

/**
 * Token estimation utility for logging
 * Rough estimate: 1 token ≈ 4 characters for English text
 */
export function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Compare token usage between JSON and TOON formats
 */
export function compareTokenUsage(data: object): { json: number; toon: number; savings: string } {
    const jsonStr = JSON.stringify(data, null, 2);
    let toonStr: string;
    try {
        toonStr = toonEncode(data);
    } catch {
        toonStr = jsonStr; // Fallback
    }

    const jsonTokens = estimateTokenCount(jsonStr);
    const toonTokens = estimateTokenCount(toonStr);
    const savingsPercent = Math.round(((jsonTokens - toonTokens) / jsonTokens) * 100);

    return {
        json: jsonTokens,
        toon: toonTokens,
        savings: `${savingsPercent}%`,
    };
}
