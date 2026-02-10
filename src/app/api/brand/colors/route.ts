import { NextRequest, NextResponse } from "next/server";
import { generateJSONFast } from "@/lib/gemini";

interface ColorPalette {
    id: number;
    name: string;
    description: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    mood: string;
}

export async function POST(request: NextRequest) {
    try {
        const { brandName, category, targetAudience, tagline } = await request.json();

        if (!brandName) {
            return NextResponse.json(
                { error: "Brand name is required" },
                { status: 400 }
            );
        }

        console.log(`Generating color palettes for "${brandName}"...`);

        const prompt = `Generate 5 unique color palettes for a brand called "${brandName}".

Context:
- Category: ${category || "tech startup"}
- Target Audience: ${targetAudience || "modern professionals"}
- Tagline: ${tagline || "innovative solutions"}

Each palette should have a distinct mood and be professionally designed for:
1. Logo design
2. Website/app UI
3. Marketing materials

Return JSON:
{
  "palettes": [
    {
      "id": 1,
      "name": "<creative name like 'Electric Aurora' or 'Midnight Calm'>",
      "description": "<one sentence about the palette feeling>",
      "colors": {
        "primary": "<hex color - main brand color>",
        "secondary": "<hex color - supporting color>",
        "accent": "<hex color - highlight/CTA color>",
        "background": "<hex color - light or dark background>",
        "text": "<hex color - text color for contrast>"
      },
      "mood": "<2-3 words describing mood: e.g., 'Bold & Energetic'>"
    }
  ]
}

Create diverse palettes:
1. Bold & Vibrant (high contrast, energetic)
2. Calm & Professional (muted, trustworthy)
3. Modern & Minimal (monochrome with one accent)
4. Warm & Approachable (friendly, inviting)
5. Dark & Premium (sophisticated, luxury feel)`;

        const result = await generateJSONFast<{ palettes: ColorPalette[] }>(
            prompt,
            "You are a professional brand designer creating color palettes that evoke specific emotions and work well for digital products."
        );

        console.log(`Generated ${result.palettes.length} palettes`);

        return NextResponse.json({
            success: true,
            data: {
                palettes: result.palettes,
            },
        });
    } catch (error) {
        console.error("Color palette generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate color palettes" },
            { status: 500 }
        );
    }
}
