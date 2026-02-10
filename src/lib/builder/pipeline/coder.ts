import type {
    BrandContext,
    DesignerOutput,
    GenerationHandlers,
    GenerationQuality,
    GenerationResult,
} from "./types";

interface CoderInput {
    message: string;
    brandContext: BrandContext;
    currentFiles: Record<string, string>;
    send: (event: { type: "status" | "preview" | "tool_call" | "file_created" | "file_edited" | "message" | "error" | "done" | "install_packages"; data: unknown }) => void;
    quality: GenerationQuality;
    handlers: GenerationHandlers;
    masterPlan?: Record<string, unknown>;
    design?: DesignerOutput;
}

function buildPlanDrivenPrompt(input: CoderInput): string {
    const sections: string[] = [input.message];

    if (input.masterPlan) {
        sections.push(
            "MASTER PLAN (strictly follow this architecture and acceptance criteria):",
            JSON.stringify(input.masterPlan, null, 2)
        );
    }

    if (input.design) {
        sections.push(
            "DESIGN SPEC (enforce these tokens and style constraints):",
            input.design.designDoc,
            `Design tokens: ${JSON.stringify(input.design.designTokens, null, 2)}`
        );
    }

    sections.push(
        "Implementation requirements:",
        "- Keep components split by section (Navbar, Hero, Features, Stats, CTA, Footer).",
        "- Preserve accessibility and semantic HTML.",
        "- Ensure brand color values are explicitly present in CSS variables.",
        "- EVERY feature/service card MUST include a real lucide-react icon — NEVER empty circles or placeholder divs.",
        "- ALWAYS include a stats/social-proof section with 3-4 impressive metrics between Hero and Features.",
        "- Use framer-motion for card hover effects: whileHover={{ y: -4 }} transition={{ duration: 0.2 }}.",
        "- Hero section: extra-large bold title (text-5xl md:text-7xl), clear subtitle, two CTAs (filled + outline).",
        "- Add hover:shadow-lg hover:-translate-y-1 transition-all duration-300 to all interactive cards.",
        "- Section padding: py-20 md:py-32 for generous vertical rhythm.",
        "- Include a full-width CTA section with gradient background before the footer.",
        "- Footer must be multi-column (Brand, Product, Company, Resources).",
        "- NEVER use generic placeholder text — all content must be specific to the brand.",
        "",
        "TEXT CONTRAST (CRITICAL — light text on light bg = broken site):",
        "- ALL headings (h1, h2, h3) on white/light backgrounds: className='text-gray-900'",
        "- ALL body text / descriptions on white/light backgrounds: className='text-gray-600'",
        "- NEVER use text-primary or text-blue-* for headings — brand color is too light on white!",
        "- Brand color text ONLY for small accent elements: badges, tags, icon labels.",
        "- On gradient/dark backgrounds: ALL text must be text-white.",
        "- Stats numbers: text-gray-900 font-bold. Stats labels: text-gray-500.",
    );

    return sections.join("\n\n");
}

export async function runCoder(input: CoderInput): Promise<GenerationResult> {
    const prompt = input.masterPlan || input.design
        ? buildPlanDrivenPrompt(input)
        : input.message;

    return input.handlers.runFast(
        prompt,
        input.brandContext,
        input.currentFiles,
        input.send,
        input.quality
    );
}
