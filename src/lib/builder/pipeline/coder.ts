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
        "- Keep components split by section.",
        "- Preserve accessibility and semantic HTML.",
        "- Ensure brand color values are explicitly present in CSS variables."
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
