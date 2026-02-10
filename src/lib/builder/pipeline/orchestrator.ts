import { runCoder } from "./coder";
import { runDesigner } from "./designer";
import { runPlanner } from "./planner";
import { runRepairer, validateSemanticOutput } from "./repairer";
import { runTemplateFill } from "./templateFill";
import type {
    GenerationArtifacts,
    GenerationResult,
    PipelineRunContext,
    PipelineStage,
} from "./types";

function sendStageStatus(
    send: PipelineRunContext["send"],
    stage: PipelineStage,
    details: string
): void {
    send({
        type: "status",
        data: {
            status: `${stage}: ${details}`,
        },
    });
}

function emitFiles(
    files: Record<string, string>,
    currentFiles: Record<string, string>,
    send: PipelineRunContext["send"]
): void {
    for (const [path, content] of Object.entries(files)) {
        const isNew = !currentFiles[path];
        currentFiles[path] = content;
        send({
            type: isNew ? "file_created" : "file_edited",
            data: { path, content, size: content.length },
        });
    }
}

export async function runBuilderPipeline(context: PipelineRunContext): Promise<GenerationResult> {
    const startedAt = Date.now();
    const artifacts: GenerationArtifacts = {
        repairAttempts: 0,
        strategyUsed: context.strategy,
    };

    if (context.strategy === "template_fill") {
        sendStageStatus(context.send, "planning", "Preparing deterministic template flow...");
        sendStageStatus(context.send, "designing", `Building ${context.templateId || "business-default"} content...`);

        const templated = await runTemplateFill({
            ai: context.ai,
            model: context.model,
            message: context.message,
            brandContext: context.brandContext,
            quality: context.quality,
            templateId: context.templateId,
        });

        artifacts.designTokens = templated.designTokens;
        sendStageStatus(context.send, "coding", "Composing template files...");
        emitFiles(templated.files, context.currentFiles, context.send);
        context.send({ type: "message", data: { text: templated.message } });

        const result: GenerationResult = {
            files: templated.files,
            message: templated.message,
            artifacts,
            fallbackPath: "none",
            parseStage: "tool_calling",
            generationDurationMs: Date.now() - startedAt,
        };

        sendStageStatus(context.send, "finalizing", "Template generation complete.");
        return result;
    }

    let masterPlan: Record<string, unknown> | undefined;
    let designDoc: string | undefined;
    let designTokens: GenerationArtifacts["designTokens"];

    if (context.strategy === "plan_driven") {
        sendStageStatus(context.send, "planning", "Creating master implementation plan...");
        const plannerOutput = await runPlanner({
            ai: context.ai,
            model: context.model,
            message: context.message,
            brandContext: context.brandContext,
            quality: context.quality,
        });
        masterPlan = plannerOutput.masterPlan;
        artifacts.masterPlan = masterPlan;

        sendStageStatus(context.send, "designing", "Extracting design tokens and style spec...");
        const designerOutput = await runDesigner({
            ai: context.ai,
            model: context.model,
            message: context.message,
            brandContext: context.brandContext,
            quality: context.quality,
            masterPlan,
        });
        designDoc = designerOutput.designDoc;
        designTokens = designerOutput.designTokens;
        artifacts.designDoc = designDoc;
        artifacts.designTokens = designTokens;
    }

    sendStageStatus(context.send, "coding", "Generating code...");
    let generation = await runCoder({
        message: context.message,
        brandContext: context.brandContext,
        currentFiles: context.currentFiles,
        send: context.send,
        quality: context.quality,
        handlers: context.handlers,
        masterPlan,
        design: designDoc && designTokens ? { designDoc, designTokens } : undefined,
    });

    const semanticCheck = validateSemanticOutput(generation.files, context.brandContext, designTokens);
    if (!semanticCheck.isValid) {
        sendStageStatus(context.send, "repairing", "Detected semantic inconsistencies. Running repair pass...");
        artifacts.repairAttempts += 1;

        const repairedCandidate = await runRepairer({
            ai: context.ai,
            model: context.model,
            message: context.message,
            brandContext: context.brandContext,
            files: generation.files,
            issues: semanticCheck.issues,
            quality: context.quality,
        });

        const repairedCheck = validateSemanticOutput(repairedCandidate.files, context.brandContext, designTokens);
        if (repairedCheck.isValid) {
            emitFiles(repairedCandidate.files, context.currentFiles, context.send);
            context.send({ type: "message", data: { text: repairedCandidate.message } });
            generation = {
                ...generation,
                files: repairedCandidate.files,
                message: repairedCandidate.message,
                fallbackPath: "none",
                parseStage: "repaired",
            };
        } else {
            sendStageStatus(context.send, "repairing", "Repairer was insufficient. Falling back to agentic...");
            // Pass empty currentFiles — agentic mode generates a fresh set.
            // Using context.currentFiles here would merge fast mode's files with agentic's,
            // causing file duplication (e.g., 7 fast + 8 agentic = 15 files).
            const fallback = await context.handlers.runAgentic(
                context.message,
                context.brandContext,
                {},
                context.send,
                context.quality
            );
            generation = {
                ...fallback,
                fallbackPath: "repairer_fallback",
                parseStage: "repairer_fallback",
            };
        }
    }

    const result: GenerationResult = {
        ...generation,
        artifacts: {
            ...generation.artifacts,
            ...artifacts,
        },
        generationDurationMs: Date.now() - startedAt,
    };

    sendStageStatus(context.send, "finalizing", "Generation complete.");
    return result;
}
