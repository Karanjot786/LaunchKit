/**
 * Streaming Builder API
 * 
 * Server-Sent Events endpoint for real-time code generation updates.
 * Streams preview updates, tool calls, and file changes as they happen.
 */

import { NextRequest } from "next/server";
import { GoogleGenAI, ThinkingLevel, FunctionCallingConfigMode, Type, Content, Part, FunctionDeclaration } from "@google/genai";
import { ToolExecutor, formatToolResults } from "@/lib/tool-executor";
import { runBuilderPipeline } from "@/lib/builder/pipeline/orchestrator";
import type {
    BuildRequestV2,
    BrandContext,
    GenerationQuality,
    GenerationResult,
    GenerationStrategy,
    StreamEvent,
} from "@/lib/builder/pipeline/types";

// Initialize Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: { timeout: 1200000 },
});

const MODEL = "gemini-3-flash-preview";
const MAX_TURNS = 5;
const PIPELINE_V2_ENABLED = process.env.BUILDER_PIPELINE_V2 === "true";
const DEFAULT_STRATEGY: GenerationStrategy = "fast_json";
const DEFAULT_QUALITY: GenerationQuality = "speed";

// Retry and fallback configuration
const MAX_MODEL_RETRIES = 2;
const RETRY_BACKOFF_MS = [800, 1600];
const MAX_MALFORMED_FAST_RETRIES = 2;
const REDUCED_AGENTIC_TURNS = 2;

// Fallback context types
type FallbackContext = "direct" | "from_fast_malformed" | "from_fast_incomplete";

function normalizeMode(mode: unknown): "fast" | "agentic" {
    return mode === "agentic" ? "agentic" : "fast";
}

function normalizeStrategy(strategy: unknown): GenerationStrategy {
    if (strategy === "plan_driven" || strategy === "template_fill" || strategy === "fast_json") {
        return strategy;
    }
    return DEFAULT_STRATEGY;
}

function normalizeQuality(quality: unknown): GenerationQuality {
    if (quality === "balanced" || quality === "high" || quality === "speed") {
        return quality;
    }
    return DEFAULT_QUALITY;
}

function getFastThinkingLevel(quality: GenerationQuality): ThinkingLevel {
    if (quality === "high") return ThinkingLevel.LOW;
    if (quality === "balanced") return ThinkingLevel.MINIMAL;
    return ThinkingLevel.MINIMAL;
}

function getFastMaxOutputTokens(quality: GenerationQuality): number {
    if (quality === "high") return 49152;
    if (quality === "balanced") return 32768;
    return 24576;
}

// Transient error detection (includes rate limits)
function isTransientModelError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    const transientPatterns = [
        "fetch failed",
        "etimedout",
        "econnreset",
        "enotfound",
        "network",
        "socket hang up",
        "aborted",
        "resource_exhausted", // Quota exceeded
        "429", // Rate limit
        "quota",
        "rate limit",
    ];
    return transientPatterns.some(pattern => message.includes(pattern));
}

// Parse retry delay from error message (e.g., "Please retry in 46.081872059s")
function parseRetryDelay(error: Error): number | null {
    const match = error.message.match(/retry in (\d+\.?\d*)s/i);
    if (match) {
        return Math.ceil(parseFloat(match[1]) * 1000); // Convert to ms
    }
    // Also check for retryDelay in JSON error
    const delayMatch = error.message.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
    if (delayMatch) {
        return parseInt(delayMatch[1], 10) * 1000;
    }
    return null;
}

// Retry wrapper for Gemini API calls
async function generateContentWithRetry(
    ai: GoogleGenAI,
    params: Parameters<typeof ai.models.generateContent>[0],
    label: string,
    send?: (event: StreamEvent) => void,
    opts?: { maxRetries?: number }
): Promise<Awaited<ReturnType<typeof ai.models.generateContent>>> {
    const maxRetries = opts?.maxRetries ?? MAX_MODEL_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await ai.models.generateContent(params);
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (!isTransientModelError(error) || attempt >= maxRetries) {
                throw lastError;
            }

            // Use API-suggested delay for rate limits, otherwise exponential backoff
            const suggestedDelay = parseRetryDelay(lastError);
            const backoffMs = suggestedDelay ?? (RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]);

            const isRateLimit = lastError.message.includes("429") || lastError.message.toLowerCase().includes("quota");
            const retryType = isRateLimit ? "rate limit" : "transient error";

            console.log(`[${label}] ${retryType}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries}):`, lastError.message.slice(0, 100));

            if (send) {
                const statusMsg = isRateLimit
                    ? `coding: Rate limited, waiting ${Math.ceil(backoffMs / 1000)}s before retry...`
                    : `coding: Retrying model call (attempt ${attempt + 2}/${maxRetries + 1})...`;
                send({ type: "status", data: { status: statusMsg } });
            }

            await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
    }

    throw lastError ?? new Error("Unexpected retry exhaustion");
}

// Tool for writing files in fast mode (Gemini CLI style)
const writeFileTool: FunctionDeclaration = {
    name: "write_file",
    description: "Write or create a file with the given content. Call this once per file.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            file_path: {
                type: Type.STRING,
                description: "Path to the file, e.g. src/App.tsx or src/components/Hero.tsx"
            },
            content: {
                type: Type.STRING,
                description: "The complete file content"
            },
        },
        required: ["file_path", "content"],
    },
};

// Tool to signal completion
const completeTool: FunctionDeclaration = {
    name: "complete",
    description: "Signal that all files have been written and the task is complete.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            message: {
                type: Type.STRING,
                description: "Brief summary of what was built, 1-2 sentences"
            },
        },
        required: ["message"],
    },
};

// Tool to install additional shadcn/ui components
const installComponentsTool: FunctionDeclaration = {
    name: "install_components",
    description: "Install shadcn/ui components. Pre-installed: button, card, input, badge, separator. Request additional components here.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            components: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of shadcn/ui components to install, e.g. ['dialog', 'dropdown-menu', 'tabs']"
            },
        },
        required: ["components"],
    },
};

// Tool to install additional npm packages
const installPackagesTool: FunctionDeclaration = {
    name: "install_packages",
    description: `Install npm packages. PRE-INSTALLED packages (do NOT request): react, react-dom, react-router-dom, firebase, lucide-react, framer-motion, clsx, tailwind-merge, class-variance-authority. Only request packages NOT in this list.`,
    parameters: {
        type: Type.OBJECT,
        properties: {
            packages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of npm packages to install, e.g. ['axios', 'date-fns', 'zod']"
            },
        },
        required: ["packages"],
    },
};

// Combined fast mode tools
const fastModeTools: FunctionDeclaration[] = [writeFileTool, completeTool, installComponentsTool, installPackagesTool];
// TOOL DEFINITIONS (SDK-compatible format)
// =============================================================================

const createFilesTool: FunctionDeclaration = {
    name: "create_files",
    description: "Create one or more new files in the project.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            files: {
                type: Type.OBJECT,
                description: "Map of file paths to file contents",
            },
            message: {
                type: Type.STRING,
                description: "Brief explanation of what was created",
            },
        },
        required: ["files", "message"],
    },
};

const editFileTool: FunctionDeclaration = {
    name: "edit_file",
    description: "Make a surgical edit to an existing file.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            file_path: { type: Type.STRING, description: "Path to the file to edit" },
            old_string: { type: Type.STRING, description: "Exact text to find and replace" },
            new_string: { type: Type.STRING, description: "New text to replace with" },
            explanation: { type: Type.STRING, description: "Brief explanation of the change" },
        },
        required: ["file_path", "old_string", "new_string", "explanation"],
    },
};

const readFileTool: FunctionDeclaration = {
    name: "read_file",
    description: "Read the current contents of a file",
    parameters: {
        type: Type.OBJECT,
        properties: {
            file_path: { type: Type.STRING, description: "Path to the file to read" },
        },
        required: ["file_path"],
    },
};

const listFilesTool: FunctionDeclaration = {
    name: "list_files",
    description: "List all files in the project",
    parameters: { type: Type.OBJECT, properties: {} },
};

const codeToolDeclarations: FunctionDeclaration[] = [
    createFilesTool,
    editFileTool,
    readFileTool,
    listFilesTool,
];

// =============================================================================
// SYSTEM PROMPT (OPTIMIZED - reduced from ~4KB to ~1.5KB)
// =============================================================================

import { encodeBrandContext, estimateTokenCount } from "@/lib/toon";

function buildSystemPrompt(brand: BrandContext): string {
    // Use TOON format for brand context to save tokens
    // NOTE: Logo intentionally excluded - can be huge base64 data URLs

    // Use selectedFeatures if available, otherwise fall back to validation proposedFeatures
    const featuresToUse = brand.selectedFeatures?.length
        ? brand.selectedFeatures.map(f => ({
            title: f.title,
            description: f.description,
            priority: f.category === 'mvp' ? 'high' : f.category === 'stretch' ? 'medium' : 'low'
        }))
        : brand.validation.proposedFeatures;

    const brandToon = encodeBrandContext({
        name: brand.name,
        tagline: brand.tagline,
        logo: "/logo_image.png", // Logo is written to sandbox at public/logo_image.png
        colorPalette: brand.colorPalette,
        category: brand.validation.category?.primary,
        targetAudience: brand.validation.category?.targetAudience,
        painPoints: brand.validation.community?.painPoints,
        features: featuresToUse,
    });

    return `You are an expert React + Firebase full-stack developer. Build complete, production-quality web applications.

═══════════════════════════════════════════════════════════════════════════════
BRAND CONTEXT (TOON format)
═══════════════════════════════════════════════════════════════════════════════
${brandToon}

═══════════════════════════════════════════════════════════════════════════════
AVAILABLE TOOLS
═══════════════════════════════════════════════════════════════════════════════
1. install_packages - Install npm packages NOT in pre-installed list
2. install_components - Install shadcn/ui components NOT in pre-installed list
3. write_file - Create or update a file (path + content)
4. complete - Signal generation is done

═══════════════════════════════════════════════════════════════════════════════
PRE-INSTALLED (DO NOT REQUEST)
═══════════════════════════════════════════════════════════════════════════════
npm: react, react-dom, react-router-dom, firebase, lucide-react, framer-motion, clsx, tailwind-merge, class-variance-authority
shadcn/ui: button, card, input, badge, separator

═══════════════════════════════════════════════════════════════════════════════
PROJECT STRUCTURE
═══════════════════════════════════════════════════════════════════════════════
PRE-BUILT FILES (already exist, do NOT create):
├── public/logo_image.png        - Brand logo image (USE THIS for logo display!)
├── src/main.tsx                 - App entry point (DO NOT CREATE)
├── src/index.css                - Base CSS with Tailwind + CSS variables (DO NOT CREATE)
├── src/ErrorBoundary.tsx        - Error boundary wrapper (DO NOT CREATE)
├── src/lib/firebase.ts          - Firebase app initialization
├── src/lib/utils.ts             - cn() utility function
├── src/contexts/AuthContext.tsx - { useAuth, AuthProvider }
├── src/hooks/useFirestore.ts    - Firestore CRUD operations
├── src/hooks/useStorage.ts      - Firebase Storage uploads
├── src/components/ui/*.tsx      - shadcn/ui components
└── src/components/auth/         - { LoginForm, SignupForm, ProtectedRoute, UserMenu }

★ BRAND LOGO ★
The brand logo is available at: /logo_image.png
Use it in components like: <img src="/logo_image.png" alt="${brand.name} logo" className="h-8 w-auto" />
ALWAYS use the logo image in the Navbar and Footer — never use text-only brand names when the logo exists.

★ FORBIDDEN FILES — DO NOT CREATE THESE ★
- src/index.tsx          ← NEVER create this. src/main.tsx is the entry point.
- src/main.tsx           ← Already exists. Do not overwrite.
- src/index.css          ← Already exists with Tailwind base + CSS variables. Do not overwrite.
- src/styles.css         ← NEVER create this. All custom styles go in component files using Tailwind classes.
- src/globals.css        ← NEVER create this. Use Tailwind utility classes instead.

FILES YOU MUST CREATE:
├── src/App.tsx                  - Main app with routing (REQUIRED)
├── src/components/Navbar.tsx    - Navigation bar (MUST include <img src="/logo_image.png" />)
├── src/components/Hero.tsx      - Hero section (landing pages)
├── src/components/Features.tsx  - Features section
├── src/components/Footer.tsx    - Footer
└── src/pages/*.tsx              - Any page you reference in routes

═══════════════════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════════════════
★ EVERY IMPORT NEEDS A FILE ★
If you import a file, you MUST create it with write_file. Example:
  - import Dashboard from './pages/Dashboard' → MUST write_file("src/pages/Dashboard.tsx")
  - import Navbar from './components/Navbar' → MUST write_file("src/components/Navbar.tsx")

DO NOT import files from ./pages/ or ./components/ without creating them first!
Exception: Pre-built files listed above (src/lib/*, src/contexts/*, src/hooks/*, src/components/ui/*, src/components/auth/*)

★ IMPORTS & EXPORTS ★
- ALWAYS: import React from 'react' (first line of every component)
- ALWAYS: export default function ComponentName() {} (default exports)
- NEVER: import from './file.tsx' (no file extensions in imports)
- For shadcn: import { Button } from "@/components/ui/button"
- For utils: import { cn } from "@/lib/utils"
- For auth: import { useAuth } from "@/contexts/AuthContext"
- For router: import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom"

★ APP.TSX STRUCTURE ★
main.tsx already wraps with BrowserRouter and AuthProvider. Your App.tsx should NOT include these wrappers.
Just use Routes directly:
\`\`\`tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
// Import ONLY components you will create with write_file
import Home from './pages/Home';
// ...other page imports

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Add routes only for pages you create */}
    </Routes>
  );
}
\`\`\`
DO NOT wrap with BrowserRouter or AuthProvider - main.tsx handles this!

═══════════════════════════════════════════════════════════════════════════════
FIREBASE INTEGRATION (pre-configured)
═══════════════════════════════════════════════════════════════════════════════
Authentication:
  import { useAuth } from "@/contexts/AuthContext"
  const { user, loading, signIn, signUp, signInWithGoogle, logout, isConfigured } = useAuth()

Firestore Database:
  import { useFirestore } from "@/hooks/useFirestore"
  const { data, loading, fetchAll, getById, add, update, remove, subscribe } = useFirestore<Type>("collection")

Storage (File Uploads):
  import { useStorage } from "@/hooks/useStorage"
  const { upload, remove, uploading } = useStorage()

Pre-built Auth Components:
  import { LoginForm, SignupForm, ProtectedRoute, UserMenu } from "@/components/auth"

═══════════════════════════════════════════════════════════════════════════════
DESIGN GUIDELINES (CRITICAL — follow every rule strictly)
═══════════════════════════════════════════════════════════════════════════════

★ DESIGN PHILOSOPHY ★
Build distinctive, production-grade interfaces that avoid generic "AI slop"
aesthetics. Every interface should feel intentionally designed, memorable,
and polished. Bold maximalism and refined minimalism both work — the key is
INTENTIONALITY, not intensity.

Before coding each component, commit to:
- A clear aesthetic direction (luxury/refined, bold/modern, playful, editorial, brutalist, etc.)
- A memorable differentiator — what will someone remember about this site?
- Cohesive execution — every element should reinforce the chosen direction

★ ICONS (MANDATORY — never skip) ★
Every feature card, service item, or benefit MUST have a lucide-react icon.
  import { Shield, Zap, BarChart3, Users, Globe, Lock, Rocket, Star, Heart, Target } from "lucide-react"

Render icons inside a styled container — NEVER as raw icons or empty circles:
  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
    <Zap className="w-6 h-6 text-primary" />
  </div>

ABSOLUTE RULE: NEVER render empty colored divs/circles as icon placeholders.
If you mention an icon, you MUST import and render it from lucide-react.

★ TYPOGRAPHY HIERARCHY ★
Use Google Fonts or system fonts with clear weight/size differentiation:
  - Hero title: text-5xl md:text-7xl font-bold tracking-tight
    Consider gradient text: bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent
  - Section titles: text-3xl md:text-4xl font-bold — add one colored ACCENT word
  - Section subtitles: text-lg text-muted-foreground max-w-2xl mx-auto text-center
  - Card titles: text-xl font-semibold
  - Body text: text-base leading-relaxed text-muted-foreground

★ STATS/SOCIAL PROOF BAR (REQUIRED — always include) ★
Add a stats bar between hero and features with 3-4 impressive metrics:
  <section className="border-y bg-muted/30 py-12">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div><p className="text-3xl md:text-4xl font-bold text-primary">2.4M+</p><p className="text-sm text-muted-foreground">Active Users</p></div>
      ...
    </div>
  </section>

★ CARDS & FEATURE GRIDS ★
Every card MUST have: icon (lucide-react) + title + description
  - Use Card component or styled divs with: rounded-xl border bg-card shadow-sm
  - Add hover effects: hover:shadow-lg hover:-translate-y-1 transition-all duration-300
  - Grid layout: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
  - Cards should feel tangible — border, shadow, background differentiation

★ HERO SECTION ★
The hero is the first impression — make it unforgettable:
  - Large bold title with strong visual weight
  - Clear subtitle explaining the value proposition
  - Two CTAs: primary (filled) and secondary (outline)
  - Visual element: gradient background, illustration, or brand imagery
  - Generous padding: py-20 md:py-32

★ CTA SECTION (REQUIRED — before footer) ★
Full-width call-to-action section:
  - Gradient or brand-colored background
  - Bold headline + supporting text + prominent CTA button
  - Add subtle pattern or texture for depth

★ COLORS & THEME (CRITICAL — MUST READ) ★

THEME: LIGHT MODE ONLY. Background is WHITE. Text must be DARK.
CSS variables use HSL in index.css: :root { --primary: H S% L%; }.
A .dark class variant exists — DO NOT USE IT EVER.

██████████████████████████████████████████████████████████████
██  TEXT VISIBILITY RULE #1: ALL HEADINGS MUST BE DARK      ██
██  On white/light backgrounds, EVERY heading must use:     ██
██  text-gray-900 or text-slate-900 or text-foreground      ██
██  NEVER use text-primary or text-blue-* for headings —    ██
██  brand color is too light to read on white backgrounds!  ██
██████████████████████████████████████████████████████████████

MANDATORY TEXT COLOR RULES (violating these = broken site):
  1. HEADINGS (h1, h2, h3): ALWAYS className="text-gray-900" or "text-slate-900"
     - Hero title: text-gray-900 (on light bg) or text-white (on dark/gradient bg)
     - Section titles: text-gray-900 — NEVER text-primary, NEVER text-blue-*
     - Card titles: text-gray-900
  2. BODY TEXT / DESCRIPTIONS: text-gray-600 or text-gray-700 or text-muted-foreground
     - Subtitles: text-gray-600 text-lg
     - Card descriptions: text-gray-600 or text-muted-foreground
     - Feature descriptions: text-gray-600
  3. BRAND COLOR TEXT: ONLY for small accent elements:
     - Badge labels, tag text, icon containers, small labels
     - NEVER for headings, NEVER for paragraph text
  4. ON GRADIENT/DARK BACKGROUNDS (hero with gradient, CTA sections):
     - ALL text must be text-white — headings AND body text
     - Do NOT use text-gray-900 on dark backgrounds
  5. NAVBAR TEXT: text-gray-700 hover:text-gray-900 (on white navbar bg)
  6. FOOTER: If dark bg → text-gray-300 for body, text-white for headings
            If light bg → text-gray-900 for headings, text-gray-600 for body

HERO SECTION PATTERN (choose ONE):
  Option A — Light hero (white/light gray bg):
    bg-white or bg-gradient-to-b from-blue-50 to-white
    Title: text-gray-900 text-4xl md:text-6xl font-bold
    Subtitle: text-gray-600 text-xl
    → Accent: A single word can be text-primary, e.g. "Train <span className='text-primary'>Smarter</span>"
  
  Option B — Dark hero (gradient bg):
    bg-gradient-to-br from-primary to-primary/80
    Title: text-white text-4xl md:text-6xl font-bold
    Subtitle: text-white/80 text-xl

CHECKLIST — verify EVERY section before finishing:
  □ Hero heading → text-gray-900 or text-white (NOT text-primary)
  □ Hero subtitle → text-gray-600 or text-white/80 (NOT text-primary/60)
  □ Stats numbers → text-gray-900 font-bold (labels: text-gray-500)
  □ Section headings → text-gray-900 (NOT text-primary)
  □ Feature card titles → text-gray-900
  □ Feature card descriptions → text-gray-600
  □ CTA heading → text-white (on gradient bg)
  □ Navbar links → text-gray-700
  □ Footer text → text-gray-300 (dark bg) or text-gray-600 (light bg)

SEMANTIC TAILWIND COLORS:
  - bg-primary = brand color (for buttons, badges, accents)
  - text-primary-foreground = white (text ON primary-colored elements)
  - bg-card = white, text-card-foreground = dark text
  - bg-muted/50 = light gray section background
  - text-muted-foreground = gray-500/600 equivalent

★ SPACING & LAYOUT ★
  - Section padding: py-20 md:py-32 for generous vertical rhythm
  - Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
  - Element spacing: space-y-4 for stacked text, gap-6 for grids
  - Use negative space intentionally — don't cram content

★ ANIMATIONS & MOTION ★
  - Use framer-motion for page load reveals and hover interactions
  - Hero entrance: motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
  - Card hover: whileHover={{ y: -4 }} transition={{ duration: 0.2 }}
  - Stagger children for grid reveals using transition={{ delay: index * 0.1 }}
  - Focus on high-impact moments — one great page load beats scattered effects

★ FOOTER ★
  - Multi-column layout: Brand info, Product links, Company links, Resources
  - Include brand logo: <img src="/logo_image.png" alt="${brand.name}" className="h-8" />
  - Bottom bar with copyright and legal links
  - Responsive: stack on mobile, columns on desktop

★ RESPONSIVE DESIGN ★
  - Mobile-first: base styles, then sm:, md:, lg:, xl:
  - Navigation: hamburger menu on mobile, horizontal on desktop
  - Grids: single column on mobile, multi-column on desktop
  - Text sizes: smaller base, larger on md: and lg:

★ ANTI-PATTERNS (NEVER DO THESE) ★
  - ❌ Using text-primary or text-blue-* for headings on white backgrounds — INVISIBLE TEXT
  - ❌ Using light-colored text (text-primary/60, text-blue-400) for descriptions
  - ❌ Headings without explicit text-gray-900 class
  - ❌ Empty colored circles/divs as icon placeholders
  - ❌ Skipping the stats/social-proof section
  - ❌ Generic/boring hero with just text and no visual impact
  - ❌ Cards without icons
  - ❌ Uniform text sizes (no visual hierarchy)
  - ❌ Missing hover/focus states on interactive elements
  - ❌ Placeholder "Lorem ipsum" or fake content — use real ${brand.name} content
  - ❌ Cookie-cutter layouts that lack context-specific character
  - ❌ Using class="dark" or dark mode
  - ❌ Forgetting to set explicit text color on every text element

═══════════════════════════════════════════════════════════════════════════════
EXECUTION ORDER
═══════════════════════════════════════════════════════════════════════════════
1. install_components (if needed beyond pre-installed)
2. install_packages (if needed beyond pre-installed)
3. write_file for EACH component/page (create ALL files you import)
4. complete (with summary message)

REMEMBER: Create files in dependency order - create imported files BEFORE the files that import them, OR create all files ensuring every import has a corresponding write_file call.`;
}

/**
 * Build optimized system prompt and log token metrics
 */
function buildSystemPromptWithMetrics(brand: BrandContext): { prompt: string; tokenCount: number } {
    const prompt = buildSystemPrompt(brand);
    const tokenCount = estimateTokenCount(prompt);
    console.log(`[Token Metrics] System prompt: ~${tokenCount} tokens (${prompt.length} chars)`);
    return { prompt, tokenCount };
}

// =============================================================================
// SSE ENCODER
// =============================================================================

function encodeSSE(event: StreamEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
    const body = (await request.json()) as BuildRequestV2;
    const message = body.message;
    const brandContext = body.brandContext;
    const currentFiles = body.currentFiles || {};
    const mode = normalizeMode(body.mode);
    const requestedStrategy = normalizeStrategy(body.strategy);
    const quality = normalizeQuality(body.quality);
    const templateId = body.templateId;
    const effectiveStrategy = PIPELINE_V2_ENABLED ? requestedStrategy : DEFAULT_STRATEGY;
    const useLegacyAgenticPath = mode === "agentic" && body.strategy === undefined;

    if (!message || !brandContext) {
        return new Response(JSON.stringify({ error: "Message required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Create a readable stream
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const send = (event: StreamEvent) => {
                controller.enqueue(encoder.encode(encodeSSE(event)));
            };

            try {
                send({ type: "status", data: { status: "planning: Starting generation..." } });

                if (!PIPELINE_V2_ENABLED && requestedStrategy !== DEFAULT_STRATEGY) {
                    send({
                        type: "status",
                        data: { status: "planning: Pipeline V2 is disabled; using fast_json strategy." },
                    });
                }

                let result: GenerationResult;
                if (useLegacyAgenticPath) {
                    send({ type: "status", data: { status: "coding: Running legacy agentic mode..." } });
                    result = await handleAgenticMode(message, brandContext, currentFiles, send, quality);
                } else {
                    result = await runBuilderPipeline({
                        ai,
                        model: MODEL,
                        message,
                        brandContext,
                        currentFiles,
                        mode,
                        strategy: effectiveStrategy,
                        quality,
                        templateId,
                        send,
                        handlers: {
                            runFast: handleFastMode,
                            runAgentic: handleAgenticMode,
                        },
                    });
                }

                console.log("Builder stream metrics:", {
                    strategy: effectiveStrategy,
                    requestedStrategy,
                    mode,
                    quality,
                    finishReason: result.finishReason || "n/a",
                    repairAttempts: result.artifacts.repairAttempts,
                    fallbackPath: result.fallbackPath || "none",
                    parseStage: result.parseStage || "n/a",
                    generationDurationMs: result.generationDurationMs || 0,
                    fileCount: Object.keys(result.files).length,
                });

                send({ type: "done", data: { success: true } });
            } catch (error) {
                console.error("Stream error:", error);
                send({
                    type: "error",
                    data: { message: error instanceof Error ? error.message : "Unknown error" },
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

// =============================================================================
// FAST MODE (Single-turn structured output)
// =============================================================================

async function handleFastMode(
    message: string,
    brandContext: BrandContext,
    currentFiles: Record<string, string>,
    send: (event: StreamEvent) => void,
    quality: GenerationQuality = DEFAULT_QUALITY
): Promise<GenerationResult> {
    send({ type: "status", data: { status: "coding: Generating code with fast tool calls..." } });

    // Use optimized system prompt with token metrics
    const { prompt: systemPrompt, tokenCount: promptTokens } = buildSystemPromptWithMetrics(brandContext);

    let filesCreated = 0;
    let completionMessage = "";
    let isComplete = false;
    const MAX_FAST_TURNS = 15; // Safety limit
    let turn = 0;
    let lastFinishReason = "";
    let malformedRetries = 0;
    let totalInputTokens = 0;
    let componentsInstalled: string[] = [];
    const changedFiles: Record<string, string> = {};

    // Build conversation history for multi-turn
    const contents: Content[] = [
        { role: "user", parts: [{ text: message }] }
    ];

    // Agentic loop: keep calling model until it calls "complete" tool
    // Using ANY mode forces the model to use tools instead of text responses
    while (!isComplete && turn < MAX_FAST_TURNS) {
        turn++;
        send({ type: "status", data: { status: `coding: Generating files (turn ${turn})...` } });

        try {
            // Lower temperature on malformed retries for more deterministic output
            const effectiveTemperature = malformedRetries > 0 ? 0.3 : 0.7;

            const response = await generateContentWithRetry(
                ai,
                {
                    model: MODEL,
                    contents,
                    config: {
                        systemInstruction: systemPrompt,
                        tools: [{ functionDeclarations: fastModeTools }],
                        toolConfig: {
                            functionCallingConfig: {
                                // ANY mode FORCES the model to call a tool (no text-only responses)
                                mode: FunctionCallingConfigMode.ANY,
                                allowedFunctionNames: ["write_file", "install_components", "install_packages", "complete"],
                            },
                        },
                        thinkingConfig: {
                            thinkingLevel: getFastThinkingLevel(quality),
                        },
                        temperature: effectiveTemperature,
                        maxOutputTokens: getFastMaxOutputTokens(quality),
                    },
                },
                `Fast Mode Turn ${turn}`,
                send
            );

            // Get the model's response parts
            const responseParts = response.candidates?.[0]?.content?.parts || [];
            const toolResults: Part[] = [];

            // DEBUG: Log the full response structure
            const finishReason = response.candidates?.[0]?.finishReason;
            if (finishReason) {
                lastFinishReason = finishReason;
            }
            console.log(`[Fast Mode Debug] Turn ${turn}:`);
            console.log(`  - finishReason: ${finishReason}`);
            console.log(`  - candidates count: ${response.candidates?.length || 0}`);
            console.log(`  - parts count: ${responseParts.length}`);
            console.log(`  - parts types: ${responseParts.map(p => p.functionCall ? 'functionCall' : p.text ? 'text' : 'other').join(', ')}`);
            if (responseParts.length > 0 && responseParts[0].text) {
                console.log(`  - first text (100 chars): ${responseParts[0].text.slice(0, 100)}...`);
            }
            if (responseParts.length > 0 && responseParts[0].functionCall) {
                console.log(`  - functionCall name: ${responseParts[0].functionCall.name}`);
            }

            // Add model response to history
            if (responseParts.length > 0) {
                contents.push({ role: "model", parts: responseParts });
            }

            // Process function calls
            for (const part of responseParts) {
                if (part.functionCall) {
                    const { name, args } = part.functionCall;

                    if (name === "write_file" && args) {
                        let filePath = (args.file_path as string || "").trim();
                        const content = args.content as string;

                        // Sanitize file path: strip quotes, backticks, and whitespace the model occasionally adds
                        filePath = filePath.replace(/^['"`]+|['"`]+$/g, "").trim();

                        if (filePath && content) {
                            const isNew = !currentFiles[filePath];
                            // Update currentFiles for future checks
                            currentFiles[filePath] = content;
                            changedFiles[filePath] = content;

                            send({
                                type: isNew ? "file_created" : "file_edited",
                                data: { path: filePath, content, size: content.length },
                            });
                            filesCreated++;
                            send({ type: "status", data: { status: `coding: Created ${filesCreated} files...` } });
                            console.log(`[Fast Mode] write_file: ${filePath} (${content.length} chars)`);

                            // Add tool result to send back
                            toolResults.push({
                                functionResponse: {
                                    name: "write_file",
                                    response: { success: true, path: filePath, message: `File ${filePath} written successfully` },
                                },
                            });
                        }
                    } else if (name === "complete" && args) {
                        completionMessage = (args.message as string) || "Done!";
                        isComplete = true;
                        console.log(`[Fast Mode] complete: ${completionMessage}`);

                        // Add tool result
                        toolResults.push({
                            functionResponse: {
                                name: "complete",
                                response: { success: true, message: completionMessage },
                            },
                        });
                    } else if (name === "install_components" && args) {
                        const requestedComponents = (args.components as string[]) || [];
                        console.log(`[Fast Mode] install_components: ${requestedComponents.join(", ")}`);
                        send({ type: "status", data: { status: `coding: Installing shadcn/ui components: ${requestedComponents.join(", ")}...` } });

                        // Track which components were requested (actual install happens in WebContainer)
                        componentsInstalled.push(...requestedComponents);

                        // Add tool result - components will be installed by WebContainer
                        toolResults.push({
                            functionResponse: {
                                name: "install_components",
                                response: {
                                    success: true,
                                    message: `Components ${requestedComponents.join(", ")} queued for installation`,
                                    components: requestedComponents,
                                },
                            },
                        });
                    } else if (name === "install_packages" && args) {
                        const requestedPackages = (args.packages as string[]) || [];
                        console.log(`[Fast Mode] install_packages: ${requestedPackages.join(", ")}`);
                        send({ type: "status", data: { status: `coding: Installing npm packages: ${requestedPackages.join(", ")}...` } });

                        // Send install event to frontend - frontend will call E2B API to install
                        send({
                            type: "install_packages",
                            data: { packages: requestedPackages }
                        });

                        // Add tool result
                        toolResults.push({
                            functionResponse: {
                                name: "install_packages",
                                response: {
                                    success: true,
                                    message: `Packages ${requestedPackages.join(", ")} queued for installation`,
                                    packages: requestedPackages,
                                },
                            },
                        });
                    }
                }
            }

            // If we have tool results, add them as user turn for next iteration
            if (toolResults.length > 0 && !isComplete) {
                contents.push({ role: "user", parts: toolResults });
            }

            // Safety: if no function calls were made, handle with retries
            const hasFunctionCalls = responseParts.some(p => p.functionCall);
            if (!hasFunctionCalls) {
                const isMalformed = finishReason === "MALFORMED_FUNCTION_CALL";

                if (isMalformed && malformedRetries < MAX_MALFORMED_FAST_RETRIES) {
                    malformedRetries++;
                    console.log(`[Fast Mode] Malformed function call, retrying (attempt ${malformedRetries}/${MAX_MALFORMED_FAST_RETRIES})...`);
                    send({ type: "status", data: { status: `coding: Retrying after malformed response (attempt ${malformedRetries + 1}/${MAX_MALFORMED_FAST_RETRIES + 1})...` } });

                    // Remove the empty model response if added
                    if (contents.length > 0 && contents[contents.length - 1].role === "model") {
                        contents.pop();
                    }

                    // Add corrective user message
                    contents.push({
                        role: "user",
                        parts: [{ text: "Return only a valid tool call (write_file, complete, or install_components) with all required arguments. Do not return text." }]
                    });

                    // Don't increment turn for retry, continue loop
                    turn--;
                    continue;
                }

                console.log(`[Fast Mode] No function calls in response (finishReason: ${finishReason}), breaking loop`);
                break;
            }

        } catch (error) {
            console.error(`[Fast Mode] Error on turn ${turn}:`, error);
            break;
        }
    }

    // If we got files but no completion message, create one
    if (filesCreated > 0 && !completionMessage) {
        completionMessage = `Created ${filesCreated} files successfully.`;
    }

    const shouldFallbackToAgentic = filesCreated === 0 || (lastFinishReason === "MAX_TOKENS" && !isComplete);
    if (shouldFallbackToAgentic) {
        // Determine fallback context for logging and reduced turn budget
        const fallbackContext: FallbackContext = malformedRetries > 0
            ? "from_fast_malformed"
            : (lastFinishReason === "MAX_TOKENS" ? "from_fast_incomplete" : "from_fast_malformed");

        console.error("[Fast Mode] Fast generation incomplete; falling back to agentic mode", {
            filesCreated,
            lastFinishReason,
            isComplete,
            malformedRetries,
            fallbackContext,
        });

        send({ type: "status", data: { status: `coding: Fast mode incomplete, switching to agentic mode (${REDUCED_AGENTIC_TURNS} turns)...` } });
        // Pass empty currentFiles — agentic generates a fresh complete set.
        // currentFiles here already contains fast mode's partial output, which would cause duplication.
        const fallback = await handleAgenticMode(message, brandContext, {}, send, quality, fallbackContext);
        return {
            ...fallback,
            fallbackPath: "agentic_fallback",
            parseStage: "agentic_fallback",
        };
    }

    send({ type: "message", data: { text: completionMessage } });

    // Log token metrics summary
    console.log(`[Token Metrics] Fast Mode Summary:`, {
        systemPromptTokens: promptTokens,
        turns: turn,
        filesCreated,
        componentsInstalled: componentsInstalled.length > 0 ? componentsInstalled : "none",
    });

    console.log(`[Fast Mode] Complete: ${filesCreated} files created in ${turn} turns`);
    return {
        files: { ...changedFiles },
        message: completionMessage,
        artifacts: {
            repairAttempts: 0,
            strategyUsed: "fast_json",
            tokenMetrics: {
                systemPromptTokens: promptTokens,
                turns: turn,
            },
            componentsInstalled,
        },
        finishReason: lastFinishReason || "STOP",
        fallbackPath: "none",
        parseStage: "tool_calling",
    };
}

// =============================================================================
// AGENTIC MODE (Multi-turn with tools)
// =============================================================================

async function handleAgenticMode(
    message: string,
    brandContext: BrandContext,
    currentFiles: Record<string, string>,
    send: (event: StreamEvent) => void,
    quality: GenerationQuality = DEFAULT_QUALITY,
    fallbackContext: FallbackContext = "direct"
): Promise<GenerationResult> {
    const executor = new ToolExecutor(currentFiles);
    const systemPrompt = buildSystemPrompt(brandContext);

    const contents: Content[] = [
        { role: "user", parts: [{ text: message }] },
    ];

    // Use reduced turn budget when called as fallback from fast mode
    const maxTurns = fallbackContext === "direct" ? MAX_TURNS : REDUCED_AGENTIC_TURNS;
    console.log(`[Agentic Mode] Starting with maxTurns=${maxTurns}, fallbackContext=${fallbackContext}`);

    let turn = 0;
    let isComplete = false;
    const changedFiles: Record<string, string> = {};
    let finalMessage = "";
    let lastFinishReason = "";
    let modelRetryCount = 0;

    while (turn < maxTurns && !isComplete) {
        turn++;
        send({ type: "status", data: { status: `coding: Turn ${turn}/${maxTurns}...` } });

        try {
            const response = await generateContentWithRetry(
                ai,
                {
                    model: MODEL,
                    contents,
                    config: {
                        systemInstruction: systemPrompt,
                        tools: [{ functionDeclarations: codeToolDeclarations }],
                        toolConfig: {
                            functionCallingConfig: {
                                mode: FunctionCallingConfigMode.AUTO,
                            },
                        },
                        thinkingConfig: {
                            thinkingLevel: quality === "high"
                                ? (turn === 1 ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW)
                                : ThinkingLevel.LOW,
                        },
                    },
                },
                `Agentic Mode Turn ${turn}`,
                send
            );

            const finishReason = response.candidates?.[0]?.finishReason;
            if (finishReason) {
                lastFinishReason = finishReason;
            }
            const parts = response.candidates?.[0]?.content?.parts || [];

            // Extract function calls
            const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
            for (const part of parts) {
                if ("functionCall" in part && part.functionCall) {
                    functionCalls.push({
                        name: part.functionCall.name || "",
                        args: (part.functionCall.args || {}) as Record<string, unknown>,
                    });
                }
            }

            if (functionCalls.length > 0) {
                // Process each function call
                const results = [];
                for (const call of functionCalls) {
                    send({ type: "tool_call", data: { name: call.name } });

                    const result = await executor.execute(call);
                    results.push(result);

                    // Send file events
                    if (call.name === "create_files" && call.args.files) {
                        const files = call.args.files as Record<string, string>;
                        for (const [path, content] of Object.entries(files)) {
                            currentFiles[path] = content;
                            changedFiles[path] = content;
                            send({ type: "file_created", data: { path, content, size: content.length } });
                        }
                    } else if (call.name === "edit_file") {
                        const editedPath = String(call.args.file_path || "");
                        const latestFiles = executor.getFiles();
                        const editedContent = editedPath ? latestFiles[editedPath] : undefined;
                        if (editedPath && typeof editedContent === "string") {
                            currentFiles[editedPath] = editedContent;
                            changedFiles[editedPath] = editedContent;
                        }
                        send({
                            type: "file_edited",
                            data: {
                                path: call.args.file_path,
                                content: editedContent,
                                explanation: call.args.explanation,
                            },
                        });
                    }
                }

                // Add model response to conversation
                contents.push({
                    role: "model",
                    parts: parts,
                });

                // Add function results
                contents.push({
                    role: "user",
                    parts: formatToolResults(results).map(r => ({
                        functionResponse: r.functionResponse,
                    })) as Part[],
                });
            } else {
                // No function calls - check for text (completion)
                const textPart = parts.find(p => "text" in p && p.text);
                if (textPart && "text" in textPart) {
                    finalMessage = textPart.text || "";
                    send({ type: "message", data: { text: finalMessage } });
                } else {
                    finalMessage = "Agentic generation complete.";
                }
                isComplete = true;
            }
        } catch (error) {
            modelRetryCount++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Agentic Mode] Error on turn ${turn}:`, errorMessage);

            // If we have files changed already, return partial success
            if (Object.keys(changedFiles).length > 0) {
                console.log(`[Agentic Mode] Returning partial success with ${Object.keys(changedFiles).length} files`);
                finalMessage = `Partial generation complete (${Object.keys(changedFiles).length} files created). Some errors occurred.`;
                send({ type: "message", data: { text: finalMessage } });
                break;
            }

            // No files changed, this is a complete failure
            throw new Error(`Agentic fallback failed after retries (${errorMessage})`);
        }
    }

    // Send final status
    const finalFiles = executor.getFiles();
    if (!finalMessage) {
        finalMessage = `Agentic generation complete in ${turn} turns.`;
        send({ type: "message", data: { text: finalMessage } });
    }
    send({
        type: "status",
        data: {
            status: "finalizing: Complete",
            fileCount: Object.keys(finalFiles).length,
            turns: turn,
        },
    });

    return {
        files: finalFiles,
        message: finalMessage,
        artifacts: {
            repairAttempts: 0,
            strategyUsed: "fast_json",
        },
        finishReason: lastFinishReason || "STOP",
        fallbackPath: "none",
        parseStage: "tool_calling",
    };
}

// =============================================================================
// GET handler for EventSource compatibility
// =============================================================================

export async function GET() {
    return new Response(JSON.stringify({ error: "Use POST method" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
    });
}
