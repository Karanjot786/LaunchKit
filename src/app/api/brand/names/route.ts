import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import { checkDomains } from "@/lib/domain";

interface ValidationContext {
    category?: string;
    targetAudience?: string;
    keywords?: string[];
    painPoints?: string[];
    opportunities?: string[];
}

export async function POST(request: NextRequest) {
    try {
        const { idea, keywords = [], validation } = await request.json() as {
            idea: string;
            keywords: string[];
            validation?: ValidationContext;
        };

        if (!idea || typeof idea !== "string") {
            return NextResponse.json(
                { error: "Idea is required" },
                { status: 400 }
            );
        }

        // Build enhanced prompt using validation context
        const contextPrompt = validation ? `
VALIDATION CONTEXT:
- Category: ${validation.category || "general"}
- Target Audience: ${validation.targetAudience || "general users"}
- Keywords: ${validation.keywords?.join(", ") || keywords.join(", ")}
- Pain Points: ${validation.painPoints?.slice(0, 3).join(", ") || "N/A"}
- Opportunities: ${validation.opportunities?.slice(0, 2).join(", ") || "N/A"}

Use these insights to create names that resonate with the target audience and address their pain points.` : "";

        const prompt = `Generate 8 creative startup names for this idea:

"${idea}"
${contextPrompt}

Requirements:
- Short (1-2 words max)
- Memorable and unique
- Modern tech feel
- Easy to pronounce
- Available as .com domain likely
- Should resonate with: ${validation?.targetAudience || "tech-savvy users"}

Return JSON array:
{
  "names": [
    { "name": "<name>", "tagline": "<short tagline>", "reasoning": "<why this name works for this audience>" }
  ]
}`;

        const { names } = await generateJSON<{
            names: { name: string; tagline: string; reasoning: string }[];
        }>(prompt, "You are a creative branding expert who creates names that emotionally connect with target audiences.");

        // Check domain availability for each name
        const namesWithDomains = await Promise.all(
            names.map(async (brandName) => {
                const domains = await checkDomains(brandName.name);
                return {
                    ...brandName,
                    domains,
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: namesWithDomains,
        });
    } catch (error) {
        console.error("Brand names error:", error);
        return NextResponse.json(
            { error: "Failed to generate names" },
            { status: 500 }
        );
    }
}
