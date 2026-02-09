/**
 * Reddit Data Fetching Library
 * Uses OAuth API endpoints with graceful fallback
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
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000; // refresh token 60s before expiry
const REDDIT_TOKEN_ENDPOINT = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";
const REDDIT_DEBUG = process.env.REDDIT_DEBUG === "true";

type RedditQueryParams = Record<string, string | number | boolean | undefined>;

interface RedditTokenResponse {
    access_token?: string;
    expires_in?: number;
}

interface RedditTokenCache {
    accessToken: string;
    expiresAt: number;
}

let tokenCache: RedditTokenCache | null = null;
let tokenRequestInFlight: Promise<string> | null = null;

export class RedditApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "RedditApiError";
        this.status = status;
    }
}

function getRedditConfig(): {
    clientId: string;
    clientSecret: string;
    userAgent: string;
} {
    return {
        clientId: process.env.REDDIT_CLIENT_ID?.trim() || "",
        clientSecret: process.env.REDDIT_CLIENT_SECRET?.trim() || "",
        userAgent: process.env.REDDIT_USER_AGENT?.trim() || "",
    };
}

export function isRedditConfigured(): boolean {
    const { clientId, clientSecret, userAgent } = getRedditConfig();
    return Boolean(clientId && clientSecret && userAgent);
}

function isTokenValid(): boolean {
    return (
        tokenCache !== null &&
        Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_BUFFER_MS
    );
}

export async function getRedditAccessToken(forceRefresh = false): Promise<string> {
    if (!isRedditConfigured()) {
        throw new RedditApiError("Reddit API is not configured", 0);
    }

    if (!forceRefresh && isTokenValid() && tokenCache) {
        return tokenCache.accessToken;
    }

    if (!forceRefresh && tokenRequestInFlight) {
        return tokenRequestInFlight;
    }

    const { clientId, clientSecret, userAgent } = getRedditConfig();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const body = new URLSearchParams({ grant_type: "client_credentials" });

    const tokenPromise = (async () => {
        const response = await fetch(REDDIT_TOKEN_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": userAgent,
            },
            body,
        });

        if (!response.ok) {
            throw new RedditApiError(
                `Reddit token request failed: ${response.status}`,
                response.status
            );
        }

        const data = (await response.json()) as RedditTokenResponse;
        if (!data.access_token) {
            throw new RedditApiError("Reddit token response missing access token", 500);
        }

        const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
        tokenCache = {
            accessToken: data.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
        };

        return tokenCache.accessToken;
    })();

    tokenRequestInFlight = tokenPromise;

    try {
        return await tokenPromise;
    } finally {
        tokenRequestInFlight = null;
    }
}

function buildOauthUrl(path: string, params: RedditQueryParams = {}): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${REDDIT_API_BASE}${normalizedPath}`);

    for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
    }

    if (!url.searchParams.has("raw_json")) {
        url.searchParams.set("raw_json", "1");
    }

    return url.toString();
}

async function redditFetch<T>(path: string, params: RedditQueryParams = {}): Promise<T> {
    const { userAgent } = getRedditConfig();
    const url = buildOauthUrl(path, params);

    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as T;
    }

    const executeFetch = async (forceRefresh = false) => {
        const accessToken = await getRedditAccessToken(forceRefresh);
        return fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": userAgent,
            },
        });
    };

    let response = await executeFetch(false);

    if (response.status === 401) {
        response = await executeFetch(true);
    }

    if (!response.ok) {
        throw new RedditApiError(`Reddit fetch failed: ${response.status}`, response.status);
    }

    const data = await response.json();
    cache.set(url, { data, timestamp: Date.now() });
    return data as T;
}

function shouldSkipEntireRun(error: unknown): boolean {
    if (!(error instanceof RedditApiError)) {
        return false;
    }

    return (
        error.status === 0 ||
        error.status === 401 ||
        error.status === 403 ||
        error.status === 429 ||
        error.status >= 500
    );
}

function warnOnceFactory() {
    let warned = false;
    return (message: string, error?: unknown) => {
        if (warned) return;
        warned = true;

        if (REDDIT_DEBUG && error) {
            console.warn(`[Reddit] ${message}`, error);
            return;
        }

        console.warn(`[Reddit] ${message}`);
    };
}

export function normalizeSubreddit(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return "";

    return trimmed
        .replace(/^\/?(?:r\/)+/i, "")
        .replace(/^\/+|\/+$/g, "")
        .trim();
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

    const cleanSubreddit = subreddit ? normalizeSubreddit(subreddit) : "";
    const path = cleanSubreddit ? `/r/${cleanSubreddit}/search` : "/search";

    return buildOauthUrl(path, {
        q: query,
        limit,
        sort,
        t: time,
        restrict_sr: cleanSubreddit ? "true" : "false",
        raw_json: "1",
    });
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
    const warnOnce = warnOnceFactory();

    if (!isRedditConfigured()) {
        warnOnce(
            "OAuth credentials are missing; skipping Reddit community fetch for this validation run."
        );
        return [];
    }

    const normalizedSubreddits = subreddits
        .map((subreddit) => normalizeSubreddit(subreddit))
        .filter((subreddit) => Boolean(subreddit));

    for (const subreddit of normalizedSubreddits) {
        try {
            const data = await redditFetch<{
                data: { children: { data: Record<string, unknown> }[] };
            }>(`/r/${subreddit}/search`, {
                q: query,
                limit,
                sort: "relevance",
                t: "year",
                restrict_sr: "true",
                raw_json: "1",
            });

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
            if (shouldSkipEntireRun(error)) {
                warnOnce(
                    "Reddit API unavailable for this validation run; continuing without Reddit data.",
                    error
                );
                return [];
            }

            warnOnce(
                "Some subreddit fetches failed; continuing with partial Reddit data.",
                error
            );
        }
    }

    // Sort by engagement (score + comments)
    return allPosts.sort((a, b) => (b.score + b.numComments) - (a.score + a.numComments));
}

/**
 * Fetch comments from a specific Reddit post
 */
export async function fetchComments(permalink: string, limit = 10): Promise<RedditComment[]> {
    if (!isRedditConfigured()) {
        return [];
    }

    try {
        const normalizedPermalink = (permalink.startsWith("/") ? permalink : `/${permalink}`)
            .replace(/\/$/, "");
        const path = `${normalizedPermalink}.json`;
        const data = await redditFetch<
            [unknown, { data: { children: { kind: string; data: Record<string, unknown> }[] } }]
        >(path, { limit, raw_json: "1" });

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
        if (REDDIT_DEBUG) {
            console.warn(`[Reddit] Failed to fetch comments for ${permalink}`, error);
        }
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
