/**
 * Enhanced Validation Pipeline
 * Multi-step validation with AI categorization, Reddit data, and Google Search grounding
 */

import { generateJSON, genAI, MODELS } from "./gemini";
import { searchReddit, getSubredditsForCategory, type RedditPost } from "./reddit";

// Types
export interface CategoryResult {
    primary: string;
    secondary: string[];
    confidence: number;
    targetAudience: string;
    keywords: string[];
    relevantSubreddits: string[];
}

export interface CommunityData {
    posts: RedditPost[];
    totalEngagement: number;
    sentiment: "positive" | "mixed" | "negative";
    painPoints: string[];
    quotes: { text: string; source: string; score: number }[];
}

export interface MarketData {
    size: string;
    growth: string;
    competitors: { name: string; description: string }[];
    trends: string[];
    sources: { title: string; url: string }[];
}

export interface ValidationScores {
    viability: number;
    painPointStrength: number;
    demandLevel: number;
    competitionIntensity: number;
}

export interface EnhancedValidationResult {
    category: CategoryResult;
    community: CommunityData;
    market: MarketData;
    scores: ValidationScores;
    verdict: string;
    recommendation: "proceed" | "pivot" | "reconsider";
    opportunities: string[];
    risks: string[];
    proposedFeatures: {
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
    }[];
}

/**
 * Step 1: Categorize the idea using AI
 */
export async function categorizeIdea(idea: string): Promise<CategoryResult> {
    const prompt = `Analyze this startup idea and categorize it:

"${idea}"

Available categories: fitness, health, fintech, entertainment, AI/ML, SaaS, e-commerce, education, gaming, social, productivity, developer-tools, travel, food, real-estate, crypto/web3

Return JSON:
{
  "primary": "<main category>",
  "secondary": ["<category2>", "<category3>"],
  "confidence": <0.0-1.0>,
  "targetAudience": "<describe target users>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>", "<keyword4>", "<keyword5>"],
  "relevantSubreddits": ["<subreddit1>", "<subreddit2>", "<subreddit3>"]
}`;

    const result = await generateJSON<CategoryResult>(
        prompt,
        "You are a startup analyst classifying business ideas."
    );

    // Ensure we have subreddits from our mapping too
    const mappedSubreddits = getSubredditsForCategory(result.primary);
    result.relevantSubreddits = [
        ...new Set([...result.relevantSubreddits, ...mappedSubreddits]),
    ].slice(0, 5);

    return result;
}

/**
 * Step 2: Fetch and analyze Reddit community data
 */
export async function analyzeRedditCommunity(
    idea: string,
    category: CategoryResult
): Promise<CommunityData> {
    // Build search query from keywords
    const query = category.keywords.slice(0, 3).join(" ");

    // Search Reddit
    const posts = await searchReddit(query, category.relevantSubreddits, 5);

    // Calculate engagement
    const totalEngagement = posts.reduce(
        (sum, p) => sum + p.score + p.numComments,
        0
    );

    // If no posts found, return empty data
    if (posts.length === 0) {
        return {
            posts: [],
            totalEngagement: 0,
            sentiment: "mixed",
            painPoints: [],
            quotes: [],
        };
    }

    // Use AI to analyze the Reddit posts
    const redditContext = posts
        .map(
            (p) =>
                `[r/${p.subreddit}] "${p.title}" (${p.score}↑, ${p.numComments} comments)\n${p.selftext.slice(0, 300)}`
        )
        .join("\n\n");

    const analysisPrompt = `Analyze these Reddit discussions related to the idea "${idea}":

${redditContext}

Extract:
1. Overall sentiment (positive/mixed/negative)
2. Pain points users mention
3. Notable quotes (with source subreddit)

Return JSON:
{
  "sentiment": "positive" | "mixed" | "negative",
  "painPoints": ["<pain1>", "<pain2>", "<pain3>"],
  "quotes": [
    {"text": "<quote>", "source": "<subreddit>", "score": <upvotes>}
  ]
}`;

    const analysis = await generateJSON<{
        sentiment: "positive" | "mixed" | "negative";
        painPoints: string[];
        quotes: { text: string; source: string; score: number }[];
    }>(analysisPrompt, "You are analyzing community sentiment from Reddit discussions.");

    return {
        posts,
        totalEngagement,
        sentiment: analysis.sentiment,
        painPoints: analysis.painPoints,
        quotes: analysis.quotes,
    };
}

/**
 * Step 3: Get market data using Google Search grounding
 */
export async function getMarketData(
    idea: string,
    category: string
): Promise<MarketData> {
    const model = genAI.models;

    const response = await model.generateContent({
        model: MODELS.PRO,
        contents: `Research market data for this startup idea in the ${category} space:

"${idea}"

Find current information on:
1. Market size (TAM, SAM, SOM if available)
2. Market growth rate and projections
3. Top 5 competitors with brief descriptions
4. Recent industry trends (2024-2025)

Format as JSON:
{
  "size": "<market size estimate>",
  "growth": "<growth rate/projection>",
  "competitors": [{"name": "<name>", "description": "<brief desc>"}],
  "trends": ["<trend1>", "<trend2>", "<trend3>"]
}`,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    // Parse the response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(
        (chunk: { web?: { uri?: string; title?: string } }) => ({
            title: chunk.web?.title || "Source",
            url: chunk.web?.uri || "",
        })
    ) || [];

    // Clean and parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsed: Partial<MarketData> = {};

    if (jsonMatch) {
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch {
            console.warn("Failed to parse market data JSON");
        }
    }

    return {
        size: parsed.size || "Market size data unavailable",
        growth: parsed.growth || "Growth data unavailable",
        competitors: parsed.competitors || [],
        trends: parsed.trends || [],
        sources,
    };
}

/**
 * Step 4: Generate final analysis and scores
 */
export async function generateFinalAnalysis(
    idea: string,
    category: CategoryResult,
    community: CommunityData,
    market: MarketData
): Promise<{
    scores: ValidationScores;
    verdict: string;
    recommendation: "proceed" | "pivot" | "reconsider";
    opportunities: string[];
    risks: string[];
    proposedFeatures: {
        title: string;
        description: string;
        priority: "high" | "medium" | "low";
    }[];
}> {
    const prompt = `Based on comprehensive research, analyze this startup idea:

IDEA: "${idea}"

CATEGORY: ${category.primary} (also: ${category.secondary.join(", ")})
TARGET AUDIENCE: ${category.targetAudience}

COMMUNITY DATA:
- Posts analyzed: ${community.posts.length}
- Total engagement: ${community.totalEngagement}
- Sentiment: ${community.sentiment}
- Pain points: ${community.painPoints.join(", ")}

MARKET DATA:
- Market size: ${market.size}
- Growth: ${market.growth}
- Competitors: ${market.competitors.map((c) => c.name).join(", ")}
- Trends: ${market.trends.join(", ")}

Provide comprehensive scores and analysis.

Return JSON:
{
  "scores": {
    "viability": <1-10>,
    "painPointStrength": <1-10>,
    "demandLevel": <1-10>,
    "competitionIntensity": <1-10>
  },
  "verdict": "<2-3 sentence summary>",
  "recommendation": "proceed" | "pivot" | "reconsider",
  "opportunities": ["<opportunity1>", "<opportunity2>", "<opportunity3>"],
  "risks": ["<risk1>", "<risk2>", "<risk3>"],
  "proposedFeatures": [
    { "title": "<feature name>", "description": "<what it does & why>", "priority": "high" }
  ]
}`;

    return generateJSON<{
        scores: ValidationScores;
        verdict: string;
        recommendation: "proceed" | "pivot" | "reconsider";
        opportunities: string[];
        risks: string[];
        proposedFeatures: {
            title: string;
            description: string;
            priority: "high" | "medium" | "low";
        }[];
    }>(prompt, "You are a startup advisor providing data-driven analysis.");
}

/**
 * Full validation pipeline
 */
export async function runValidationPipeline(
    idea: string,
    onProgress?: (step: string, progress: number) => void
): Promise<EnhancedValidationResult> {
    // Step 1: Categorize
    onProgress?.("Categorizing idea...", 10);
    const category = await categorizeIdea(idea);

    // Step 2: Reddit community analysis
    onProgress?.("Analyzing Reddit community...", 30);
    const community = await analyzeRedditCommunity(idea, category);

    // Step 3: Market data with Google Search
    onProgress?.("Researching market data...", 60);
    const market = await getMarketData(idea, category.primary);

    // Step 4: Final analysis
    onProgress?.("Generating final analysis...", 85);
    const analysis = await generateFinalAnalysis(idea, category, community, market);

    onProgress?.("Complete!", 100);

    return {
        category,
        community,
        market,
        ...analysis,
    };
}
