/**
 * Builder Chat API - Structured Output Version
 * 
 * Uses Gemini 3 structured outputs with Zod schemas for reliable code generation.
 * Supports both instant preview (UI Tree) and full code generation.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { getCatalogDescription, uiTreeSchema, type UITree } from "@/lib/ui-catalog";
import { codeGenerationSchema, type CodeGenerationResult } from "@/lib/code-schemas";

// Initialize Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
        timeout: 1200000, // 20 minutes
    },
});

export const maxDuration = 900; // 15 minutes

const MODEL = "gemini-3-flash-preview";

// =============================================================================
// TYPES
// =============================================================================

interface BrandContext {
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
        category: { primary: string; targetAudience: string; keywords: string[] };
        community: { painPoints: string[] };
        opportunities: string[];
        proposedFeatures?: { title: string; description: string; priority: string }[];
    };
}

// Dual output schema: preview + code
const dualOutputSchema = z.object({
    preview: uiTreeSchema.describe("UI tree for instant preview rendering"),
    code: codeGenerationSchema.describe("Complete React code files"),
});

type DualOutput = z.infer<typeof dualOutputSchema>;

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

function buildSystemPrompt(brand: BrandContext): string {
    return `You are a senior Full-Stack React Developer & UI/UX Designer.
    
BRAND CONTEXT:
- Name: ${brand.name}
- Tagline: ${brand.tagline}
- Logo URL: ${brand.logo || "None"}
- Category: ${brand.validation.category.primary}
- Target Audience: ${brand.validation.category.targetAudience}
- Keywords: ${brand.validation.category.keywords.join(", ")}

BRAND COLORS (use these EXACT hex values):
- Primary: ${brand.colorPalette.primary}
- Secondary: ${brand.colorPalette.secondary}
- Accent: ${brand.colorPalette.accent}
- Background: ${brand.colorPalette.background}
- Text: ${brand.colorPalette.text}

PAIN POINTS TO SOLVE (Validation Data):
${brand.validation.community.painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

OPPORTUNITIES TO CAPTURE:
${brand.validation.opportunities.map((o, i) => `${i + 1}. ${o}`).join("\n")}

PLANNED FEATURES (MUST IMPLEMENT):
${brand.validation.proposedFeatures?.map((f, i) => `${i + 1}. ${f.title} (${f.priority}): ${f.description}`).join("\n") || "Analyze pain points and propose 3 core features."}

You will generate TWO outputs simultaneously:

1. PREVIEW (UI Tree) - For instant rendering
   A flat JSON structure mapping to these catalog components:
${getCatalogDescription()}

   Structure example:
   {
     "root": "page",
     "elements": {
       "page": { "key": "page", "type": "Stack", "props": {...}, "children": ["nav", "hero", ...] },
       ...
     }
   }

2. CODE (React Files) - Full "Shadcn-style" Implementation
   Generate a COMPLETE, multi-file React application.
   
   REQUIREMENTS:
   - **Multi-file Structure**: 
     - \`src/App.jsx\` (Main router/layout)
     - \`src/lib/utils.js\` (Class merger utility)
     - \`src/components/ui/...\` (Reusable UI primitives like Button, Card, Input)
     - \`src/components/...\` (Feature-specific components)
   
   - **Styling**: 
     - Use Tailwind CSS for EVERYTHING.
     - Implement "Shadcn UI" look & feel using standard Tailwind utility classes.
     - Use \`lucide-react\` for icons.
     - Use \`framer-motion\` for smooth animations.
   
   - **Feature Depth**:
     - Analyze the Pain Points & Opportunities.
     - CREATE SPECIFIC FEATURES that solve these problems.
     - Don't just make a landing page; make a functional app shell (Dashboard, Tools, etc.) if requested.
   
   - **Syntax**:
     - Use JSX (not TSX) for simplicity in the web container.
     - Use \`export default function\` for components.
     - Props handling: \`{ className, ...props }\` with the \`cn()\` utility.
   - **IMAGES**: Use the provided "Logo URL" in the Navbar/Header. Use:
     \`<img src="${brand.logo || ""}" alt="${brand.name} Logo" className="h-8 w-auto" />\`
     If no Logo URL is provided, fallback to text.

   MANDATORY FILE: \`src/lib/utils.js\`
   \`\`\`javascript
   import { clsx } from "clsx";
   import { twMerge } from "tailwind-merge";
   
   export function cn(...inputs) {
     return twMerge(clsx(inputs));
   }
   \`\`\`

   MANDATORY COMPONENT PATTERN (e.g., Button):
   \`\`\`javascript
   import { cn } from "@/lib/utils";
   
   export default function Button({ className, variant = "default", size = "default", ...props }) {
     return (
       <button 
         className={cn(
           "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
           {
             "bg-primary text-primary-foreground hover:bg-primary/90": variant === "default",
             "bg-destructive text-destructive-foreground hover:bg-destructive/90": variant === "destructive",
           },
           className
         )}
         {...props} 
       />
     );
   }
   \`\`\`

   IMPORTANT: 
   - GENERATE A STUNNING, MODERN DESIGN. 
   - Think "Award Winning Website".
   - Use the brand colors for branding elements (buttons, accents).
   - Create at least 5-6 files to demonstrate a real project structure.`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
    try {
        const { message, brandContext, mode = "dual" } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 });
        }

        console.log(`Builder chat [${mode}]: "${message.slice(0, 50)}..."`);

        const systemPrompt = buildSystemPrompt(brandContext);

        // Build conversation
        const contents = [
            {
                role: "user" as const,
                parts: [{ text: `${message}\n\nGenerate both a preview tree and complete React code.` }]
            },
        ];

        // Determine which schema to use based on mode and generate JSON schema
        let responseSchema;
        if (mode === "preview") {
            responseSchema = z.toJSONSchema(z.object({ preview: uiTreeSchema }), {
                target: "draft-2020-12",
                unrepresentable: "any",
            });
        } else if (mode === "code") {
            responseSchema = z.toJSONSchema(codeGenerationSchema, {
                target: "draft-2020-12",
                unrepresentable: "any",
            });
        } else {
            responseSchema = z.toJSONSchema(dualOutputSchema, {
                target: "draft-2020-12",
                unrepresentable: "any",
            });
        }

        // Generate with structured output
        const response = await ai.models.generateContent({
            model: MODEL,
            contents,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseJsonSchema: responseSchema,
                thinkingConfig: {
                    thinkingLevel: ThinkingLevel.MINIMAL,
                },
                temperature: 1.0,
                maxOutputTokens: 65536,
            },
        });

        const responseText = response.text || "";

        // Parse structured output
        let result: DualOutput | null = null;
        let preview: UITree | null = null;
        let files: Record<string, string> = {};
        let msg = "Updated the code. Check the preview!";

        try {
            const parsed = JSON.parse(responseText);

            if (mode === "dual") {
                result = dualOutputSchema.parse(parsed);
                preview = result.preview;
                files = result.code.files;
                msg = result.code.message;
            } else if (mode === "preview") {
                preview = uiTreeSchema.parse(parsed.preview || parsed);
            } else if (mode === "code") {
                const codeResult = codeGenerationSchema.parse(parsed);
                files = codeResult.files;
                msg = codeResult.message;
            }
        } catch (parseError) {
            console.error("Parse error:", parseError);

            // Fallback: try to extract what we can
            try {
                const fallback = JSON.parse(responseText);
                if (fallback.files) files = fallback.files;
                if (fallback.preview) preview = fallback.preview;
                if (fallback.message) msg = fallback.message;
            } catch {
                // Last resort: return error
                return NextResponse.json({
                    success: false,
                    error: "Failed to parse AI response",
                    details: responseText.slice(0, 500),
                }, { status: 500 });
            }
        }

        console.log(`Generated: ${Object.keys(files).length} files, preview: ${preview ? "yes" : "no"}`);

        return NextResponse.json({
            success: true,
            message: msg,
            preview: preview || undefined,
            files: Object.keys(files).length > 0 ? files : undefined,
        });

    } catch (error) {
        console.error("Builder error:", error);
        return NextResponse.json(
            {
                error: "Generation failed",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

// =============================================================================
// STREAMING VERSION (for future use)
// =============================================================================

export async function* streamGeneration(
    message: string,
    brandContext: BrandContext
): AsyncGenerator<{ type: "preview" | "code" | "done"; data: unknown }> {
    const systemPrompt = buildSystemPrompt(brandContext);

    const responseSchema = z.toJSONSchema(dualOutputSchema, {
        target: "draft-2020-12",
        unrepresentable: "any",
    });

    const stream = await ai.models.generateContentStream({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: message }] }],
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseJsonSchema: responseSchema,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
    });

    let accumulated = "";

    for await (const chunk of stream) {
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            accumulated += text;

            // Try to parse partial preview
            try {
                const partial = JSON.parse(accumulated + '"}}}');
                if (partial.preview) {
                    yield { type: "preview", data: partial.preview };
                }
            } catch {
                // Not yet parseable, continue
            }
        }
    }

    // Final parse
    try {
        const result = dualOutputSchema.parse(JSON.parse(accumulated));
        yield { type: "preview", data: result.preview };
        yield { type: "code", data: result.code };
        yield { type: "done", data: null };
    } catch (error) {
        console.error("Final parse error:", error);
    }
}
