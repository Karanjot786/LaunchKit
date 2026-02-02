import { NextRequest, NextResponse } from "next/server";
import { genAI, MODELS } from "@/lib/gemini";
import { createSandbox, connectSandbox, writeFilesToSandbox, getSandboxPreviewUrl } from "@/lib/e2b";

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
    };
}

// System prompt for code generation - Vite React app
function buildSystemPrompt(brand: BrandContext): string {
    return `You are a senior React developer building a landing page in a Vite React environment.

BRAND CONTEXT:
- Name: ${brand.name}
- Tagline: ${brand.tagline}
- Category: ${brand.validation.category.primary}
- Target Audience: ${brand.validation.category.targetAudience}
- Keywords: ${brand.validation.category.keywords.join(", ")}

BRAND COLORS (use these EXACT hex values):
- Primary: ${brand.colorPalette.primary}
- Secondary: ${brand.colorPalette.secondary}
- Accent: ${brand.colorPalette.accent}
- Background: ${brand.colorPalette.background}
- Text: ${brand.colorPalette.text}

PAIN POINTS TO ADDRESS:
${brand.validation.community.painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

OPPORTUNITIES:
${brand.validation.opportunities.map((o, i) => `${i + 1}. ${o}`).join("\n")}

ENVIRONMENT RULES:
- This is a Vite + React app (NOT Next.js)
- Main file: src/App.jsx - create the landing page here
- Tailwind CSS is loaded via CDN in index.html
- Use JSX syntax (not TSX)
- Do NOT use "use client" directive (not needed in Vite)
- Do NOT import React (it's auto-imported)
- Export default function component

STYLING RULES:
- Use Tailwind CSS classes: className="bg-indigo-600 text-white"
- For custom colors use Tailwind arbitrary values: className="bg-[${brand.colorPalette.primary}]"
- Or use inline styles: style={{ backgroundColor: '${brand.colorPalette.primary}' }}
- Make it modern, polished, production-ready
- Include hover effects and transitions

FEATURE COMPLETENESS:
- Create a complete, stunning landing page
- Include: Hero, Features, CTA sections
- Use real content for ${brand.name} - no Lorem ipsum
- Make buttons interactive with onClick handlers

OUTPUT FORMAT:
Brief explanation (1-2 sentences), then files as JSON:

\`\`\`json
{
  "files": {
    "src/App.jsx": "complete React component code"
  }
}
\`\`\``;
}

export async function POST(request: NextRequest) {
    try {
        const { message, brandContext, currentFiles, sandboxId: existingSandboxId } = await request.json();

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 });
        }

        console.log(`Builder chat: "${message.slice(0, 50)}..."`);

        // Create or connect to sandbox
        let sandboxId = existingSandboxId;
        let previewUrl: string;

        if (!sandboxId) {
            // Create new sandbox
            console.log("Creating new E2B sandbox...");
            const sandbox = await createSandbox();
            sandboxId = sandbox.sandboxId;
            previewUrl = sandbox.previewUrl;
            console.log(`Sandbox created: ${sandboxId}`);
        } else {
            // Get existing sandbox URL
            previewUrl = await getSandboxPreviewUrl(sandboxId);
        }

        // Build system prompt
        const systemPrompt = buildSystemPrompt(brandContext);

        // Build conversation
        const contents = [
            { role: "user", parts: [{ text: systemPrompt }] },
            {
                role: "model",
                parts: [{ text: `I'll build the ${brandContext.name} landing page using your brand colors and addressing your target audience's pain points. What would you like me to create?` }]
            },
            { role: "user", parts: [{ text: message }] },
        ];

        // Generate code with Gemini
        const response = await genAI.models.generateContent({
            model: MODELS.PRO,
            contents,
            config: {
                temperature: 0.7,
                maxOutputTokens: 16384,
            },
        });

        const responseText = response.text || "";

        // Extract files from JSON
        let files: Record<string, string> = {};
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                files = parsed.files || {};
            } catch (e) {
                console.error("JSON parse error:", e);
            }
        }

        // Write files to sandbox
        if (Object.keys(files).length > 0) {
            console.log(`Writing ${Object.keys(files).length} files to sandbox...`);
            await writeFilesToSandbox(sandboxId, files);
            console.log("Files written successfully");
        }

        // Extract message (explanation before JSON)
        let msg = responseText;
        if (jsonMatch) {
            msg = responseText.substring(0, responseText.indexOf("```json")).trim();
        }
        if (!msg) msg = "Updated the code. Check the preview!";

        return NextResponse.json({
            success: true,
            message: msg,
            files: Object.keys(files).length > 0 ? files : undefined,
            sandboxId,
            previewUrl,
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
