/**
 * Reddit Data Fetching Library
 * Uses public .json endpoints for read-only access
 */

// Types
export interface RedditPost {
    id: string;
    title: string;
    selftext: string;
    score: number;
    upvoteRatio: number;
    numComments: number;
    subreddit: string;
    permalink: string;
    createdUtc: number;
    author: string;
    url: string;
}

export interface RedditComment {
    id: string;
    body: string;
    score: number;
    author: string;
    createdUtc: number;
}

// Cache for rate limiting
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// User agent required by Reddit
const USER_AGENT = "LaunchPad/1.0 (idea-validation-tool)";

/**
 * Cached fetch with User-Agent header
 */
async function cachedFetch<T>(url: string): Promise<T> {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as T;
    }

    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
    });

    if (!response.ok) {
        throw new Error(`Reddit fetch failed: ${response.status}`);
    }

    const data = await response.json();
    cache.set(url, { data, timestamp: Date.now() });
    return data as T;
}

/**
 * Build Reddit search URL
 */
export function buildSearchUrl(
    query: string,
    options: {
        subreddit?: string;
        limit?: number;
        sort?: "relevance" | "hot" | "top" | "new" | "comments";
        time?: "hour" | "day" | "week" | "month" | "year" | "all";
    } = {}
): string {
    const { subreddit, limit = 10, sort = "relevance", time = "year" } = options;

    // Strip "r/" prefix if present (AI sometimes includes it)
    const cleanSubreddit = subreddit?.replace(/^r\//i, "");

    const base = cleanSubreddit
        ? `https://old.reddit.com/r/${cleanSubreddit}/search.json`
        : `https://old.reddit.com/search.json`;

    const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        sort,
        t: time,
        restrict_sr: cleanSubreddit ? "true" : "false",
    });

    return `${base}?${params}`;
}

/**
 * Search Reddit for posts matching a query
 */
export async function searchReddit(
    query: string,
    subreddits: string[],
    limit = 5
): Promise<RedditPost[]> {
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits) {
        try {
            const url = buildSearchUrl(query, { subreddit, limit });
            const data = await cachedFetch<{ data: { children: { data: Record<string, unknown> }[] } }>(url);

            const posts = data.data.children.map((child) => ({
                id: child.data.id as string,
                title: child.data.title as string,
                selftext: child.data.selftext as string,
                score: child.data.score as number,
                upvoteRatio: child.data.upvote_ratio as number,
                numComments: child.data.num_comments as number,
                subreddit: child.data.subreddit as string,
                permalink: child.data.permalink as string,
                createdUtc: child.data.created_utc as number,
                author: child.data.author as string,
                url: child.data.url as string,
            }));

            allPosts.push(...posts);
        } catch (error) {
            console.warn(`Failed to fetch from r/${subreddit}:`, error);
            // Continue with other subreddits
        }
    }

    // Sort by engagement (score + comments)
    return allPosts.sort((a, b) => (b.score + b.numComments) - (a.score + a.numComments));
}

/**
 * Fetch comments from a specific Reddit post
 */
export async function fetchComments(permalink: string, limit = 10): Promise<RedditComment[]> {
    const url = `https://old.reddit.com${permalink}.json?limit=${limit}`;

    try {
        const data = await cachedFetch<[unknown, { data: { children: { kind: string; data: Record<string, unknown> }[] } }]>(url);

        // data[1] contains the comments listing
        const comments = data[1]?.data?.children
            ?.filter((c) => c.kind === "t1")
            ?.map((c) => ({
                id: c.data.id as string,
                body: c.data.body as string,
                score: c.data.score as number,
                author: c.data.author as string,
                createdUtc: c.data.created_utc as number,
            })) || [];

        return comments;
    } catch (error) {
        console.warn(`Failed to fetch comments for ${permalink}:`, error);
        return [];
    }
}

/**
 * Category to subreddit mapping
 */
export const CATEGORY_SUBREDDITS: Record<string, string[]> = {
    fitness: ["fitness", "workout", "gym", "bodybuilding", "loseit"],
    health: ["health", "nutrition", "HealthyFood", "mentalhealth", "selfimprovement"],
    fintech: ["fintech", "personalfinance", "investing", "CryptoCurrency", "stocks"],
    entertainment: ["entertainment", "movies", "gaming", "Music", "television"],
    "AI/ML": ["MachineLearning", "artificial", "OpenAI", "LocalLLaMA", "ChatGPT"],
    SaaS: ["SaaS", "startups", "Entrepreneur", "smallbusiness", "indiehackers"],
    "e-commerce": ["ecommerce", "dropship", "FulfillmentByAmazon", "Etsy", "shopify"],
    education: ["learnprogramming", "edtech", "OnlineEducation", "college", "GetStudying"],
    gaming: ["gaming", "gamedev", "IndieGaming", "pcgaming", "Games"],
    social: ["socialmedia", "Instagram", "TikTok", "Twitter", "youtube"],
    productivity: ["productivity", "getdisciplined", "Notion", "ObsidianMD", "todoist"],
    "developer-tools": ["devops", "programming", "webdev", "SideProject", "selfhosted"],
    travel: ["travel", "solotravel", "digitalnomad", "backpacking", "TravelHacks"],
    food: ["food", "Cooking", "MealPrepSunday", "EatCheapAndHealthy", "FoodStartups"],
    "real-estate": ["realestate", "RealEstateInvesting", "homeowners", "PropertyManagement"],
    "crypto/web3": ["CryptoCurrency", "ethereum", "NFT", "web3", "defi"],
};

/**
 * Get relevant subreddits for a category
 */
export function getSubredditsForCategory(category: string): string[] {
    return CATEGORY_SUBREDDITS[category] || ["startups", "Entrepreneur"];
}

/**
 * Validate an idea using Reddit community data
 */
export async function validateWithReddit(
    idea: string,
    category: string,
    keywords: string[]
): Promise<{
    posts: RedditPost[];
    totalEngagement: number;
    avgScore: number;
    avgComments: number;
}> {
    const subreddits = getSubredditsForCategory(category);

    // Build search query from keywords
    const query = keywords.slice(0, 3).join(" OR ");

    // Search Reddit
    const posts = await searchReddit(query, subreddits, 5);

    // Calculate engagement metrics
    const totalEngagement = posts.reduce((sum, p) => sum + p.score + p.numComments, 0);
    const avgScore = posts.length > 0 ? posts.reduce((sum, p) => sum + p.score, 0) / posts.length : 0;
    const avgComments = posts.length > 0 ? posts.reduce((sum, p) => sum + p.numComments, 0) / posts.length : 0;

    return {
        posts,
        totalEngagement,
        avgScore,
        avgComments,
    };
}
