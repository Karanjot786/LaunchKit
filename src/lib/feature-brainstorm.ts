/**
 * Feature Brainstorming Module
 *
 * Uses Gemini with Google Search grounding for deep research
 * on features for the startup idea.
 */

import { GoogleGenAI } from "@google/genai";
import { MODELS } from "./gemini";

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
});

// Types
export interface Feature {
    id: string;
    title: string;
    description: string;
    painPointSolved?: string;
    differentiator?: string;
    effort: "low" | "medium" | "high";
    category: "mvp" | "stretch" | "moonshot";
    selected?: boolean;
    viralLoop?: string;
}

export interface FeatureBrainstormResult {
    mvp: Feature[];
    stretch: Feature[];
    moonshots: Feature[];
    rawToon?: string;
}

export interface FeatureDeepDive {
    feature: Feature;
    technicalRequirements: string[];
    userStories: string[];
    implementationApproach: string;
    competitorExamples: string[];
    challenges: string[];
    estimatedDays: number;
}

// System prompt for feature research
const FEATURE_RESEARCH_PROMPT = `# ROLE
You are a world-class product strategist with expertise in:
- User experience research and behavioral psychology
- Competitive feature analysis across SaaS, B2C, and B2B products
- Technology trend forecasting and emerging capabilities
- Growth-driven product development (Jobs-to-Be-Done framework)
- Cross-industry innovation transfer

# MISSION
Using the validation report provided, conduct deep research to brainstorm 
innovative features that will make this product stand out in the market.

# RESEARCH APPROACH

## 1. Pain Point Deep Dive
- Research HOW leading products solve similar pain points
- Find gaps in competitor solutions users complain about
- Identify adjacent problems users face that aren't addressed
- Look for workarounds users create (signals unmet needs)

## 2. Competitive Intelligence
- Analyze feature sets of top 5 competitors
- Identify table-stakes features (must-have)
- Find whitespace (features no one offers)
- Study recently launched features (market direction)

## 3. Cross-Industry Innovation
- Find successful patterns from OTHER industries
- Look for technology transfers (what works in gaming? healthcare?)
- Consider emerging tech: AI, voice, AR, automation
- Study viral/delightful features that drive word-of-mouth

## 4. User Expectation Research  
- What do modern users expect in 2025-2026?
- Mobile-first? Offline support? Real-time collaboration?
- Privacy/security concerns in this category?
- Accessibility and inclusion requirements?

## 5. Technical Feasibility Assessment
- What's buildable in MVP timeframe (4-8 weeks)?
- What requires significant infrastructure?
- What has off-the-shelf solutions (APIs, SDKs)?
- What's technically risky vs proven?

# OUTPUT FORMAT
Return a JSON code block with this structure:
\`\`\`json
{
  "mvp": [
    {
      "title": "Feature name",
      "description": "What it does",
      "painPointSolved": "Which pain point",
      "differentiator": "How it's different from competitors",
      "effort": "low|medium|high",
      "viralLoop": "Potential growth mechanism or null"
    }
  ],
  "stretch": [
    {
      "title": "Feature name",
      "description": "What it does",
      "effort": "low|medium|high"
    }
  ],
  "moonshots": [
    {
      "title": "Feature name",
      "description": "What it does",
      "effort": "high"
    }
  ]
}
\`\`\`

Generate 4-6 MVP features, 3-4 stretch features, and 2-3 moonshots.
Think creatively. Combine ideas. Consider AI/automation.
Prioritize features that create defensible moats.`;

// Deep dive prompt for individual features
const DEEP_DIVE_PROMPT = `# ROLE
You are a senior software architect and product manager.

# MISSION
Analyze the following feature in depth and provide detailed planning.

# FEATURE
{featureData}

# VALIDATION CONTEXT
{validationData}

# OUTPUT FORMAT (TOON)
deepDive
  technicalRequirements[N]:<requirement>
  userStories[N]:<as a user, I want... so that...>
  implementationApproach:<paragraph describing approach>
  competitorExamples[N]:<competitor - how they do it>
  challenges[N]:<potential challenge>
  estimatedDays:<number>

Be thorough and practical. Consider modern tech stack (React, Node, etc).`;

/**
 * Parse TOON features response
 */
function parseToonFeatures(toonText: string): FeatureBrainstormResult {
    const result: FeatureBrainstormResult = {
        mvp: [],
        stretch: [],
        moonshots: [],
        rawToon: toonText,
    };

    console.log("[Features] Parsing response, length:", toonText.length);

    // Try JSON parsing first (more reliable)
    try {
        // Look for JSON in the response
        const jsonMatch = toonText.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            console.log("[Features] Found JSON format");
            if (jsonData.mvp) result.mvp = jsonData.mvp.map((f: Partial<Feature>, i: number) => ({ ...f, id: `mvp-${i}`, category: "mvp", selected: true }));
            if (jsonData.stretch) result.stretch = jsonData.stretch.map((f: Partial<Feature>, i: number) => ({ ...f, id: `stretch-${i}`, category: "stretch" }));
            if (jsonData.moonshots) result.moonshots = jsonData.moonshots.map((f: Partial<Feature>, i: number) => ({ ...f, id: `moonshot-${i}`, category: "moonshot" }));
            return result;
        }
    } catch (e) {
        console.log("[Features] JSON parsing failed, trying TOON format");
    }

    // Helper to extract feature blocks with flexible matching
    const extractFeatures = (category: "mvp" | "stretch" | "moonshot"): Feature[] => {
        const features: Feature[] = [];
        const categoryName = category === "moonshot" ? "moonshots" : category;

        // Try multiple regex patterns
        const patterns = [
            // Pattern 1: TOON format with [N]
            new RegExp(`${categoryName}\\[\\d+\\]([\\s\\S]*?)(?=\\n\\s*(?:mvp|stretch|moonshots)\\[|$)`, "gi"),
            // Pattern 2: Simple heading format
            new RegExp(`##?\\s*${categoryName}[\\s\\S]*?(?=##|$)`, "gi"),
            // Pattern 3: Bullet list format  
            new RegExp(`${categoryName}[:\\n]([\\s\\S]*?)(?=\\n(?:mvp|stretch|moonshots)|$)`, "gi"),
        ];

        for (const regex of patterns) {
            const matches = toonText.matchAll(regex);
            for (const match of matches) {
                const content = match[1] || match[0];
                const blocks = content.split(/---|\n\n/).filter(b => b.trim());

                blocks.forEach((block, index) => {
                    const getValue = (key: string): string => {
                        const m = block.match(new RegExp(`${key}[:\\s]+([^\\n]+)`, "i"));
                        return m ? m[1].replace(/^[*-]\s*/, "").trim() : "";
                    };

                    // Try to extract title in multiple ways
                    let title = getValue("title") || getValue("name");
                    if (!title) {
                        // Try extracting first bold text or first line
                        const boldMatch = block.match(/\*\*([^*]+)\*\*/);
                        const firstLineMatch = block.match(/^[*-]?\s*(.+?)(?::|$)/m);
                        title = boldMatch?.[1] || firstLineMatch?.[1] || "";
                    }
                    title = title.replace(/^[*-]\s*/, "").trim();

                    if (title && !features.some(f => f.title === title)) {
                        features.push({
                            id: `${category}-${index}`,
                            title,
                            description: getValue("description") || block.split("\n").slice(1).join(" ").substring(0, 200),
                            painPointSolved: getValue("painPointSolved") || getValue("painPoint") || undefined,
                            differentiator: getValue("differentiator") || undefined,
                            effort: (getValue("effort") as "low" | "medium" | "high") || "medium",
                            category,
                            viralLoop: getValue("viralLoop") || undefined,
                            selected: category === "mvp",
                        });
                    }
                });
            }
            if (features.length > 0) break; // Stop if we found features
        }

        console.log(`[Features] Extracted ${features.length} ${categoryName} features`);
        return features;
    };

    result.mvp = extractFeatures("mvp");
    result.stretch = extractFeatures("stretch");
    result.moonshots = extractFeatures("moonshot");

    // Fallback: try to extract any structured content if nothing was found
    if (result.mvp.length === 0 && result.stretch.length === 0 && result.moonshots.length === 0) {
        console.log("[Features] No features found with patterns, trying bullet extraction");

        // Extract bullet points as features
        const bulletRegex = /[-*•]\s*\*?\*?([^*\n:]+)\*?\*?[:\s]*([^\n]*)/g;
        let match;
        const allFeatures: Feature[] = [];
        while ((match = bulletRegex.exec(toonText)) !== null && allFeatures.length < 15) {
            const title = match[1].trim();
            const description = match[2].trim();
            if (title.length > 5 && title.length < 100) {
                allFeatures.push({
                    id: `feature-${allFeatures.length}`,
                    title,
                    description,
                    effort: "medium",
                    category: allFeatures.length < 5 ? "mvp" : allFeatures.length < 10 ? "stretch" : "moonshot",
                    selected: allFeatures.length < 5,
                });
            }
        }

        result.mvp = allFeatures.filter(f => f.category === "mvp");
        result.stretch = allFeatures.filter(f => f.category === "stretch");
        result.moonshots = allFeatures.filter(f => f.category === "moonshot");
        console.log(`[Features] Bullet extraction found ${allFeatures.length} total features`);
    }

    return result;
}

/**
 * Parse deep dive response
 */
function parseDeepDive(toonText: string, feature: Feature): FeatureDeepDive {
    const getArrayValues = (key: string): string[] => {
        const values: string[] = [];
        const regex = new RegExp(`${key}\\[\\d+\\]:([^\\n]+)`, "g");
        let match;
        while ((match = regex.exec(toonText)) !== null) {
            values.push(match[1].trim());
        }
        // Also try single-line array format
        const singleMatch = toonText.match(new RegExp(`${key}:([^\\n]+)`));
        if (singleMatch && values.length === 0) {
            values.push(...singleMatch[1].split(",").map(s => s.trim()));
        }
        return values;
    };

    const getValue = (key: string): string => {
        const match = toonText.match(new RegExp(`${key}:([^\\n]+)`));
        return match ? match[1].trim() : "";
    };

    return {
        feature,
        technicalRequirements: getArrayValues("technicalRequirements"),
        userStories: getArrayValues("userStories"),
        implementationApproach: getValue("implementationApproach"),
        competitorExamples: getArrayValues("competitorExamples"),
        challenges: getArrayValues("challenges"),
        estimatedDays: parseInt(getValue("estimatedDays")) || 7,
    };
}

/**
 * Brainstorm features using validation data
 */
export async function brainstormFeatures(
    validationData: Record<string, unknown>,
    model: string = MODELS.FLASH
): Promise<FeatureBrainstormResult> {
    const prompt = `${FEATURE_RESEARCH_PROMPT}

# VALIDATION REPORT
${JSON.stringify(validationData, null, 2)}`;

    const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return parseToonFeatures(text);
}

/**
 * Deep dive into a specific feature
 */
export async function deepDiveFeature(
    feature: Feature,
    validationData: Record<string, unknown>,
    model: string = MODELS.FLASH
): Promise<FeatureDeepDive> {
    const prompt = DEEP_DIVE_PROMPT
        .replace("{featureData}", JSON.stringify(feature, null, 2))
        .replace("{validationData}", JSON.stringify(validationData, null, 2));

    const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return parseDeepDive(text, feature);
}
