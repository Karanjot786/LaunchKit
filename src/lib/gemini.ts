import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Models - use correct API names from docs
export const MODELS = {
  PRO: "gemini-3-pro-preview",        // Text generation
  IMAGE: "gemini-3-pro-image-preview", // Image generation
  FLASH: "gemini-3-flash-preview",    // Fast option
} as const;

// Generate text with Gemini 3 Pro
export async function generateText(prompt: string, systemPrompt?: string) {
  const model = genAI.models;

  const response = await model.generateContent({
    model: MODELS.PRO,
    contents: systemPrompt
      ? [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + prompt }] }]
      : prompt,
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Generate JSON response
export async function generateJSON<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const fullPrompt = `${systemPrompt || ""}\n\n${prompt}\n\nRespond ONLY with valid JSON, no markdown or explanation.`;

  const response = await generateText(fullPrompt);

  // Clean response and parse JSON
  const cleaned = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

// Generate JSON with Flash model (faster)
export async function generateJSONFast<T>(prompt: string, systemPrompt?: string): Promise<T> {
  const model = genAI.models;
  const fullPrompt = `${systemPrompt || ""}\n\n${prompt}\n\nRespond ONLY with valid JSON, no markdown or explanation.`;

  const response = await model.generateContent({
    model: MODELS.FLASH,
    contents: fullPrompt,
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

// Generate image with Gemini 3 Pro Image Preview
export async function generateImage(prompt: string): Promise<Buffer | null> {
  const model = genAI.models;

  const response = await model.generateContent({
    model: MODELS.IMAGE,
    contents: prompt,
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return Buffer.from(part.inlineData.data as string, "base64");
    }
  }

  return null;
}

// Validate startup idea with Google Search grounding
export async function validateIdea(idea: string) {
  const prompt = `Analyze this startup idea thoroughly:

"${idea}"

Use web search to find:
1. Market size (TAM, SAM, SOM if possible)
2. Top 5 existing competitors
3. Recent trends in this space
4. Potential challenges

Return JSON:
{
  "viabilityScore": <1-10>,
  "marketSize": "<estimated market size>",
  "competitors": ["<competitor1>", "<competitor2>", ...],
  "trends": ["<trend1>", "<trend2>", ...],
  "challenges": ["<challenge1>", "<challenge2>", ...],
  "opportunities": ["<opportunity1>", "<opportunity2>", ...],
  "verdict": "<one sentence summary>"
}`;

  return generateJSON<{
    viabilityScore: number;
    marketSize: string;
    competitors: string[];
    trends: string[];
    challenges: string[];
    opportunities: string[];
    verdict: string;
  }>(prompt, "You are a startup analyst with access to real-time market data.");
}

// Generate brand names
export async function generateNames(idea: string, keywords: string[]) {
  const prompt = `Generate 8 creative startup names for this idea:

"${idea}"

Keywords to consider: ${keywords.join(", ")}

Requirements:
- Short (1-2 words max)
- Memorable and unique
- Modern tech feel
- Easy to pronounce
- Available as .com domain likely

Return JSON array:
{
  "names": [
    { "name": "<name>", "tagline": "<short tagline>", "reasoning": "<why this name>" }
  ]
}`;

  return generateJSON<{
    names: { name: string; tagline: string; reasoning: string }[];
  }>(prompt, "You are a creative branding expert.");
}

// Generate landing page content
export async function generateLandingContent(
  brandName: string,
  idea: string,
  tagline: string
) {
  const prompt = `Generate landing page content for:

Brand: ${brandName}
Tagline: ${tagline}
Idea: ${idea}

Return JSON:
{
  "hero": {
    "headline": "<compelling headline>",
    "subheadline": "<supporting text>",
    "cta": "<call to action button text>"
  },
  "features": [
    { "title": "<feature>", "description": "<description>", "icon": "<emoji>" }
  ],
  "benefits": ["<benefit1>", "<benefit2>", "<benefit3>"],
  "testimonialPlaceholder": "<placeholder testimonial>",
  "faq": [
    { "question": "<q>", "answer": "<a>" }
  ],
  "footer": {
    "tagline": "<footer tagline>",
    "copyright": "<copyright text>"
  }
}`;

  return generateJSON<{
    hero: { headline: string; subheadline: string; cta: string };
    features: { title: string; description: string; icon: string }[];
    benefits: string[];
    testimonialPlaceholder: string;
    faq: { question: string; answer: string }[];
    footer: { tagline: string; copyright: string };
  }>(prompt, "You are an expert copywriter for SaaS landing pages.");
}

// Generate full app schema
export async function generateAppSchema(idea: string, appType: string) {
  const prompt = `Generate a complete application schema for:

Idea: ${idea}
App Type: ${appType}

Return JSON:
{
  "appName": "<name>",
  "description": "<description>",
  "collections": [
    {
      "name": "<collection name>",
      "fields": [
        { "name": "<field>", "type": "string|number|boolean|timestamp|reference", "required": true|false }
      ]
    }
  ],
  "authProviders": ["email", "google"],
  "pages": [
    { "path": "/<path>", "name": "<Page Name>", "requiresAuth": true|false, "description": "<what this page does>" }
  ],
  "apiEndpoints": [
    { "method": "GET|POST|PUT|DELETE", "path": "/api/<path>", "description": "<what it does>" }
  ]
}`;

  return generateJSON<{
    appName: string;
    description: string;
    collections: {
      name: string;
      fields: { name: string; type: string; required: boolean }[];
    }[];
    authProviders: string[];
    pages: { path: string; name: string; requiresAuth: boolean; description: string }[];
    apiEndpoints: { method: string; path: string; description: string }[];
  }>(prompt, "You are a senior full-stack architect designing production applications.");
}

export { genAI };
