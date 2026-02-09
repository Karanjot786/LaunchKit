"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ChatPanel } from "./ChatPanel";
import { PreviewTab } from "./PreviewTab";
import { V0CodeView } from "./V0CodeView";
import { BrandPanel } from "./BrandPanel";
import { BrandSetupPreview } from "./BrandSetupPreview";
import { StreamingStatus } from "./StreamingStatus";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import { ExportPanel } from "./ExportPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { E2BSandbox, getTemplateFiles } from "@/lib/e2b-client";
import { useVersionHistory } from "@/lib/version-history";
import { useStreamingBuilder } from "@/hooks/useStreamingBuilder";

interface BrandContext {
    name: string;
    tagline: string;
    logo: string | null;
    colorPalette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    validation: {
        category?: { primary: string; targetAudience: string; keywords: string[] };
        community?: { painPoints: string[] };
        opportunities?: string[];
        proposedFeatures?: { title: string; description: string; priority: string }[];
    };
    idea?: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    files?: Record<string, string>;
    thinking?: number;
    suggestions?: Array<{ label: string; action: string }>;
}

interface BuilderLayoutProps {
    brandContext: BrandContext;
    projectId?: string;
    onProjectUpdate?: (updates: Record<string, unknown>) => Promise<void>;
    initialFiles?: Record<string, string>;
}

// Generate smart first message based on project state
function getInitialMessage(brand: BrandContext): Message {
    const hasValidation = brand.validation && Object.keys(brand.validation).length > 0 && brand.validation.category;
    const hasName = brand.name && brand.name !== "Untitled Project";
    const hasColors = brand.colorPalette.primary !== "#6366F1";
    const hasLogo = brand.logo !== null;

    if (!hasValidation) {
        return {
            id: "initial",
            role: "assistant",
            content: `🔍 **Analyzing your idea...**\n\nI'm validating your startup concept. This will take a moment.\n\nOnce complete, I'll suggest brand names that resonate with your target audience.`,
        };
    }

    if (!hasName) {
        const category = brand.validation.category?.primary || "your niche";
        const audience = brand.validation.category?.targetAudience || "your target users";
        return {
            id: "initial",
            role: "assistant",
            content: `✅ **Validation Complete!**\n\nYour idea is in the **${category}** space, targeting **${audience}**.\n\nLet's create your brand! Say **"suggest names"** or describe the vibe you want.`,
            suggestions: [
                { label: "Suggest names", action: "suggest names for my brand" },
                { label: "Modern & minimal", action: "suggest modern minimal brand names" },
                { label: "Fun & playful", action: "suggest fun playful brand names" },
            ],
        };
    }

    if (!hasColors) {
        return {
            id: "initial",
            role: "assistant",
            content: `🎨 Great choice! **${brand.name}** is a strong name.\n\nNow let's pick colors that match your brand personality. Say **"suggest colors"** or tell me your preferences.`,
            suggestions: [
                { label: "Suggest colors", action: "suggest color palettes for my brand" },
                { label: "Professional", action: "suggest professional corporate colors" },
                { label: "Vibrant", action: "suggest vibrant energetic colors" },
            ],
        };
    }

    if (!hasLogo) {
        return {
            id: "initial",
            role: "assistant",
            content: `🖼️ Perfect color palette!\n\nLet's create your logo. Say **"generate logo"** and I'll design options that match your brand.`,
            suggestions: [
                { label: "Generate logo", action: "generate logo options for my brand" },
                { label: "Skip for now", action: "skip logo and build my landing page" },
            ],
        };
    }

    // All brand elements complete
    const painPoints = brand.validation.community?.painPoints?.slice(0, 2).join(", ") || "your users' needs";
    return {
        id: "initial",
        role: "assistant",
        content: `🚀 **${brand.name}** is ready to build!\n\nI know:\n• Target: ${brand.validation.category?.targetAudience || "your audience"}\n• Pain points: ${painPoints}\n\nSay **"build my landing page"** to get started!`,
        suggestions: [
            { label: "Build landing page", action: "build my landing page" },
            { label: "Build full app", action: "build a full featured app" },
        ],
    };
}

export function BuilderLayout({ brandContext, projectId, onProjectUpdate, initialFiles = {} }: BuilderLayoutProps) {
    const [messages, setMessages] = useState<Message[]>([getInitialMessage(brandContext)]);
    const [files, setFiles] = useState<Record<string, string>>(initialFiles);
    const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
    const [activeFile, setActiveFile] = useState("src/App.jsx");
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingTime, setThinkingTime] = useState(0);

    // Load template files on mount so code view shows the base template
    useEffect(() => {
        async function loadTemplateFiles() {
            try {
                const templateFiles = await getTemplateFiles();
                if (Object.keys(templateFiles).length > 0) {
                    // Merge template files with existing files (existing files take priority)
                    setFiles(prev => ({ ...templateFiles, ...prev }));
                }
            } catch (error) {
                console.error("[BuilderLayout] Error loading template files:", error);
            }
        }
        loadTemplateFiles();
    }, []);

    // Brand Panel state
    const [brandPanelCollapsed, setBrandPanelCollapsed] = useState(false);
    const [currentBrand, setCurrentBrand] = useState(brandContext);

    // Brand suggestions state (for preview area)
    const [brandSuggestions, setBrandSuggestions] = useState<{
        type: "names" | "colors" | "logos" | null;
        data: unknown[];
    }>({ type: null, data: [] });

    // WebContainer state
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [containerStatus, setContainerStatus] = useState<string>("Initializing...");
    const [isContainerReady, setIsContainerReady] = useState(false);
    const containerInitialized = useRef(false);
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    // E2B Sandbox ref
    const e2bSandboxRef = useRef<E2BSandbox | null>(null);
    const [useE2B, setUseE2B] = useState(true); // Try E2B first
    const [isSandboxReady, setIsSandboxReady] = useState(false); // Track sandbox readiness
    const e2bServerStartedRef = useRef(false); // Prevent multiple startDevServer calls

    // Streaming state
    const streaming = useStreamingBuilder(initialFiles);
    const lastUpdateCountRef = useRef(0);

    // Sync streaming files to local state and sandbox (E2B or WebContainer)
    useEffect(() => {
        if (streaming.fileUpdates.length > lastUpdateCountRef.current) {
            const newUpdates = streaming.fileUpdates.slice(lastUpdateCountRef.current);
            lastUpdateCountRef.current = streaming.fileUpdates.length;

            const updatesToApply: Record<string, string> = {};
            newUpdates.forEach((u) => {
                if (streaming.files[u.path] !== undefined) {
                    updatesToApply[u.path] = streaming.files[u.path];
                }
            });

            if (Object.keys(updatesToApply).length > 0) {
                setFiles((prev) => ({ ...prev, ...updatesToApply }));
                // Files are written to E2B in the startE2BServer effect after streaming completes
            }
        }
    }, [streaming.fileUpdates, streaming.files, isContainerReady, useE2B]);

    // Start E2B dev server after streaming completes
    useEffect(() => {
        // Only run when: streaming done, E2B enabled, sandbox ready, have files, server not started yet
        if (
            !streaming.isStreaming &&
            useE2B &&
            isSandboxReady &&
            Object.keys(files).length > 0 &&
            !e2bServerStartedRef.current
        ) {
            const startE2BServer = async () => {
                const sandbox = e2bSandboxRef.current;
                if (!sandbox || !sandbox.isReady) {
                    console.log("[E2B] Sandbox not ready yet, waiting...");
                    return;
                }

                // Mark as started to prevent duplicate calls
                e2bServerStartedRef.current = true;

                console.log("[E2B] Writing files to sandbox...", Object.keys(files));
                setContainerStatus("Writing files to E2B...");

                const filesWritten = await sandbox.writeFiles(files);

                if (filesWritten) {
                    console.log("[E2B] Files written, starting dev server...");
                    setContainerStatus("Installing dependencies...");

                    const url = await sandbox.startDevServer();

                    if (url) {
                        console.log(`[E2B] Preview ready: ${url}`);
                        setPreviewUrl(url);
                        setIsContainerReady(true);
                        setContainerStatus("Ready");
                    } else {
                        console.error("[E2B] Failed to start dev server");
                        setContainerStatus("Error starting server");
                        e2bServerStartedRef.current = false; // Allow retry
                    }
                } else {
                    console.error("[E2B] Failed to write files");
                    setContainerStatus("Error writing files");
                    e2bServerStartedRef.current = false; // Allow retry
                }
            };

            startE2BServer();
        }
    }, [streaming.isStreaming, useE2B, isSandboxReady, files]);

    // Version history with Firebase persistence
    const { snapshots, canUndo, canRedo, isLoading: historyLoading, createSnapshot, clearHistory, undoChanges, redoChanges, restoreSnapshot } = useVersionHistory(files, { projectId });

    // Panel state
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);

    // Auto-save to Firestore when files change
    useEffect(() => {
        if (!onProjectUpdate || Object.keys(files).length === 0) return;

        setSaveStatus("unsaved");

        // Debounce save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            setSaveStatus("saving");
            try {
                await onProjectUpdate({ files, updatedAt: new Date() });
                setSaveStatus("saved");
            } catch (error) {
                console.error("Auto-save failed:", error);
                setSaveStatus("unsaved");
            }
        }, 2000);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [files, onProjectUpdate]);

    // Initialize sandbox on mount (E2B first, WebContainer fallback)
    useEffect(() => {
        if (containerInitialized.current) return;
        containerInitialized.current = true;

        const init = async () => {
            // Try E2B first
            if (useE2B) {
                try {
                    setContainerStatus("Creating E2B sandbox...");
                    console.log("[LaunchPad] Creating E2B cloud sandbox...");

                    const sandbox = new E2BSandbox({
                        onStatusChange: setContainerStatus,
                        onUrlChange: (url) => {
                            if (url) {
                                console.log("[E2B] URL received:", url);
                                setPreviewUrl(url);
                                setIsContainerReady(true);
                            }
                        },
                        onOutput: (msg) => {
                            console.log("[E2B]", msg);
                        },
                    });

                    e2bSandboxRef.current = sandbox;

                    const success = await sandbox.initialize();
                    if (success) {
                        console.log("[LaunchPad] E2B sandbox ready! Setting isSandboxReady=true");
                        setIsSandboxReady(true); // This triggers the file writing effect
                        setContainerStatus("Sandbox ready, waiting for code...");
                        return;
                    }
                } catch (error) {
                    console.error("E2B init error:", error);
                    setUseE2B(false);
                }
            }

            // Skip WebContainer fallback - E2B is the only supported runtime now
            // WebContainer requires COOP/COEP headers which break E2B iframes
            if (!useE2B) {
                setContainerStatus("E2B failed, no fallback available");
                console.error("E2B failed and WebContainer fallback is disabled");
            }
        };

        init();
    }, [useE2B]);

    // Initial files are handled by E2B sandbox creation

    // Auto-trigger validation if no validation data exists
    const validationTriggered = useRef(false);
    useEffect(() => {
        if (validationTriggered.current) return;

        const hasValidation = currentBrand.validation &&
            Object.keys(currentBrand.validation).length > 0 &&
            currentBrand.validation.category;

        const hasIdea = currentBrand.idea && currentBrand.idea.trim().length > 10;

        if (!hasValidation && hasIdea) {
            validationTriggered.current = true;

            // Trigger validation
            (async () => {
                setIsLoading(true);
                const startTime = Date.now();

                try {
                    const res = await fetch("/api/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ idea: currentBrand.idea }),
                    });
                    const data = await res.json();

                    if (data.success) {
                        // Update brand with validation
                        const validationData = data.data;
                        setCurrentBrand(prev => ({
                            ...prev,
                            validation: validationData
                        }));

                        // Save to Firestore
                        if (onProjectUpdate) {
                            onProjectUpdate({ validation: validationData });
                        }

                        // Add success message with name suggestions prompt
                        const category = validationData.category?.primary || "your niche";
                        const audience = validationData.category?.targetAudience || "your target users";

                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: "assistant" as const,
                            content: `✅ **Validation Complete!**\n\nYour idea is in the **${category}** space, targeting **${audience}**.\n\nLet's create your brand! Say **"suggest names"** or describe the vibe you want.`,
                            thinking: Math.round((Date.now() - startTime) / 1000),
                            suggestions: [
                                { label: "Suggest names", action: "suggest names for my brand" },
                                { label: "Modern & minimal", action: "suggest modern minimal brand names" },
                                { label: "Fun & playful", action: "suggest fun playful brand names" },
                            ],
                        }]);
                    } else {
                        throw new Error(data.error || "Validation failed");
                    }
                } catch (error) {
                    console.error("Auto-validation error:", error);
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: "assistant" as const,
                        content: `I couldn't validate your idea automatically. Please type **"validate my idea"** to try again.`,
                    }]);
                } finally {
                    setIsLoading(false);
                }
            })();
        } else if (!hasValidation && !hasIdea) {
            // No idea saved - prompt user to describe it
            setMessages([{
                id: "no-idea",
                role: "assistant",
                content: `👋 **Welcome to the Builder!**\n\nI notice you haven't described your idea yet. Tell me about your startup and I'll help validate it and create your brand.\n\nFor example: *"A fitness app that uses AI to create personalized workout plans"*`,
            }]);
        }
    }, [currentBrand.validation, currentBrand.idea, onProjectUpdate]);

    // Handle brand step trigger from panel
    const handleTriggerBrandStep = useCallback((step: "name" | "colors" | "logo") => {
        const prompts: Record<string, string> = {
            name: "suggest new brand names for my project",
            colors: "suggest different color palettes for my brand",
            logo: "generate new logo options for my brand",
        };

        // Simulate user sending the request
        handleSendMessage(prompts[step]);
    }, []);

    // Handle brand selection from chat suggestions
    const handleBrandSelect = useCallback((type: string, selection: unknown) => {
        let updates: Partial<BrandContext> = {};

        if (type === "names") {
            const sel = selection as { name: string; tagline: string };
            updates = { name: sel.name, tagline: sel.tagline };
        } else if (type === "colors") {
            const sel = selection as { colors: BrandContext["colorPalette"] };
            updates = { colorPalette: sel.colors };
        } else if (type === "logos") {
            updates = { logo: selection as string };
        }

        // Update local state
        setCurrentBrand((prev) => ({ ...prev, ...updates }));

        // Persist to Firestore
        if (onProjectUpdate) {
            onProjectUpdate(updates);
        }
    }, [onProjectUpdate]);

    const handleSendMessage = useCallback(async (content: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setThinkingTime(0);

        const startTime = Date.now();
        const timer = setInterval(() => {
            setThinkingTime(Math.round((Date.now() - startTime) / 1000));
        }, 1000);

        const lowerContent = content.toLowerCase();

        try {
            // Detect brand-related requests and route to dedicated APIs
            const isNameRequest = lowerContent.includes("name") && (lowerContent.includes("suggest") || lowerContent.includes("generate"));
            const isColorRequest = lowerContent.includes("color") && (lowerContent.includes("suggest") || lowerContent.includes("generate") || lowerContent.includes("palette"));
            const isLogoRequest = lowerContent.includes("logo") && (lowerContent.includes("generate") || lowerContent.includes("create"));

            if (isNameRequest) {
                // Call names API
                const res = await fetch("/api/brand/names", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        idea: currentBrand.idea || currentBrand.name,
                        keywords: currentBrand.validation?.category?.keywords || [],
                        validation: {
                            category: currentBrand.validation?.category?.primary,
                            targetAudience: currentBrand.validation?.category?.targetAudience,
                            keywords: currentBrand.validation?.category?.keywords,
                            painPoints: currentBrand.validation?.community?.painPoints,
                            opportunities: currentBrand.validation?.opportunities,
                        },
                    }),
                });
                const data = await res.json();

                if (data.success) {
                    setBrandSuggestions({ type: "names", data: data.data });
                    setMessages((prev) => [...prev, {
                        id: Date.now().toString(),
                        role: "assistant" as const,
                        content: `🎯 Here are **${data.data.length} name suggestions** based on your target audience and market positioning!\n\nSelect a name from the preview panel on the right, or tell me if you want a different style.`,
                        thinking: Math.round((Date.now() - startTime) / 1000),
                        suggestions: [
                            { label: "More techy names", action: "suggest more technical brand names" },
                            { label: "More playful names", action: "suggest fun playful brand names" },
                        ],
                    }]);
                } else {
                    throw new Error(data.error || "Failed to generate names");
                }
            } else if (isColorRequest) {
                // Call colors API (works even without brand name - uses category/idea as context)
                const brandNameOrFallback = currentBrand.name !== "Untitled Project"
                    ? currentBrand.name
                    : currentBrand.validation?.category?.primary || "Your Brand";

                const res = await fetch("/api/brand/colors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        brandName: brandNameOrFallback,
                        category: currentBrand.validation?.category?.primary,
                        targetAudience: currentBrand.validation?.category?.targetAudience,
                        tagline: currentBrand.tagline,
                    }),
                });
                const data = await res.json();

                if (data.success) {
                    setBrandSuggestions({ type: "colors", data: data.data.palettes });
                    setMessages((prev) => [...prev, {
                        id: Date.now().toString(),
                        role: "assistant" as const,
                        content: `🎨 Here are **${data.data.palettes.length} color palettes** designed for your brand!\n\nEach palette has a unique mood. Select one from the preview panel.`,
                        thinking: Math.round((Date.now() - startTime) / 1000),
                    }]);
                } else {
                    throw new Error(data.error || "Failed to generate colors");
                }
            } else if (isLogoRequest) {
                // Call logo API
                const brandNameForLogo = currentBrand.name !== "Untitled Project"
                    ? currentBrand.name
                    : currentBrand.validation?.category?.primary || "Brand";

                const res = await fetch("/api/brand/logo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        brandName: brandNameForLogo,
                        tagline: currentBrand.tagline,
                        colors: currentBrand.colorPalette,
                        category: currentBrand.validation?.category?.primary,
                        projectId,
                    }),
                });
                const data = await res.json();

                if (data.success) {
                    setBrandSuggestions({ type: "logos", data: data.data.logos || [data.data.url] });
                    setMessages((prev) => [...prev, {
                        id: Date.now().toString(),
                        role: "assistant" as const,
                        content: `🖼️ I've generated logo options for your brand!\n\nSelect your favorite from the preview panel.`,
                        thinking: Math.round((Date.now() - startTime) / 1000),
                    }]);
                } else {
                    throw new Error(data.error || "Failed to generate logo");
                }
            } else {
                // Default: Use streaming builder for code generation
                // Clear version history for fresh generation (prevents file accumulation)
                await clearHistory();

                // Reset E2B server started flag for new generation
                e2bServerStartedRef.current = false;

                await streaming.generate(content, currentBrand, { mode: "fast" });

                // After streaming completes
                const finalFiles = streaming.files;

                // Ensure everything is synced
                setFiles(finalFiles);
                if (onProjectUpdate) {
                    onProjectUpdate({ files: finalFiles, updatedAt: new Date() });
                }

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: streaming.message || "Code generation complete!",
                    files: finalFiles,
                    thinking: Math.round((Date.now() - startTime) / 1000),
                };

                setMessages((prev) => [...prev, assistantMessage]);
            }
        } catch (error) {
            console.error("Builder chat error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            clearInterval(timer);
            setIsLoading(false);
        }
    }, [currentBrand, files, isContainerReady, onProjectUpdate, streaming]);

    const handleFileChange = async (file: string, content: string) => {
        setFiles((prev) => ({ ...prev, [file]: content }));
        streaming.updateFile(file, content);

        // Write to E2B sandbox if available
        const sandbox = e2bSandboxRef.current;
        if (sandbox && sandbox.isReady) {
            await sandbox.writeFiles({ [file]: content });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-zinc-950">
            {/* Header */}
            <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    {projectId && (
                        <a
                            href="/dashboard"
                            className="text-zinc-500 hover:text-white transition-colors"
                            title="Back to Dashboard"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </a>
                    )}
                    <div className="flex items-center gap-2">
                        {currentBrand.logo ? (
                            <img src={currentBrand.logo} alt="" className="w-8 h-8 rounded-lg" />
                        ) : (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: currentBrand.colorPalette.primary }}
                            >
                                {currentBrand.name.charAt(0)}
                            </div>
                        )}
                        <span className="text-white font-medium">{currentBrand.name}</span>
                    </div>
                    {projectId && (
                        <span className={`text-xs px-2 py-1 rounded ${saveStatus === "saved" ? "text-green-400" :
                            saveStatus === "saving" ? "text-yellow-400" : "text-orange-400"
                            }`}>
                            {saveStatus === "saved" ? "✓ Saved" :
                                saveStatus === "saving" ? "Saving..." : "Unsaved"}
                        </span>
                    )}
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                        {isContainerReady ? "🟢 Ready" : `⏳ ${containerStatus}`}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    {/* Undo/Redo buttons */}
                    <div className="flex items-center border-r border-zinc-700 pr-2 mr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`text-zinc-400 hover:text-white ${!canUndo ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={async () => {
                                const restored = undoChanges();
                                if (restored) {
                                    setFiles(restored);
                                    const sandbox = e2bSandboxRef.current;
                                    if (sandbox?.isReady) sandbox.writeFiles(restored);
                                }
                            }}
                            disabled={!canUndo}
                            title="Undo (⌘Z)"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`text-zinc-400 hover:text-white ${!canRedo ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={async () => {
                                const restored = redoChanges();
                                if (restored) {
                                    setFiles(restored);
                                    const sandbox = e2bSandboxRef.current;
                                    if (sandbox?.isReady) sandbox.writeFiles(restored);
                                }
                            }}
                            disabled={!canRedo}
                            title="Redo (⌘⇧Z)"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                            </svg>
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => setIsHistoryPanelOpen(true)}
                        title="Version History"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => setIsExportPanelOpen(true)}
                    >
                        Export
                    </Button>
                    <Button size="sm" className="bg-white text-black hover:bg-zinc-200" onClick={() => setIsExportPanelOpen(true)}>
                        Publish
                    </Button>
                </div>
            </header>

            {/* Main content with Brand Panel */}
            <div className="flex flex-1 overflow-hidden">
                {/* Brand Panel - Left */}
                <BrandPanel
                    project={currentBrand}
                    onTriggerStep={handleTriggerBrandStep}
                    collapsed={brandPanelCollapsed}
                    onToggleCollapse={() => setBrandPanelCollapsed(!brandPanelCollapsed)}
                />

                {/* Chat Panel */}
                <div className="w-[380px] border-r border-zinc-800">
                    <ChatPanel
                        messages={messages}
                        onSend={handleSendMessage}
                        onBrandSelect={handleBrandSelect}
                        isLoading={isLoading}
                        thinkingTime={thinkingTime}
                        brandName={currentBrand.name}
                    />
                </div>

                {/* Preview/Code Panel - Right */}
                <div className="flex-1 flex flex-col">
                    {/* Tab bar */}
                    <div className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
                        <button
                            onClick={() => setActiveTab("preview")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "preview"
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-400 hover:text-white"
                                }`}
                        >
                            ● Preview
                        </button>
                        <button
                            onClick={() => setActiveTab("code")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${activeTab === "code"
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-400 hover:text-white"
                                }`}
                        >
                            {"</>"} Code
                        </button>
                        <span className="ml-auto text-xs text-zinc-500">
                            {containerStatus}
                        </span>
                    </div>

                    {/* Content */}
                    {activeTab === "preview" ? (
                        // Show brand setup preview when no code exists OR when showing brand suggestions
                        Object.keys(files).length === 0 || brandSuggestions.type ? (
                            <BrandSetupPreview
                                brand={currentBrand}
                                isValidating={isLoading && !brandSuggestions.type}
                                suggestions={brandSuggestions}
                                onSelectName={(name) => {
                                    handleBrandSelect("names", name);
                                    setBrandSuggestions({ type: null, data: [] });
                                    setMessages((prev) => [...prev, {
                                        id: Date.now().toString(),
                                        role: "assistant" as const,
                                        content: `✅ Great choice! **${name.name}** is now your brand name.\n\n*"${name.tagline}"*\n\nNow let's pick your colors! Say **"suggest colors"** or describe the vibe you want.`,
                                        suggestions: [
                                            { label: "Suggest colors", action: "suggest color palettes for my brand" },
                                            { label: "Bold & vibrant", action: "suggest bold vibrant color palettes" },
                                            { label: "Minimal & clean", action: "suggest minimal clean color palettes" },
                                        ],
                                    }]);
                                }}
                                onSelectColors={(palette) => {
                                    handleBrandSelect("colors", palette);
                                    setBrandSuggestions({ type: null, data: [] });
                                    setMessages((prev) => [...prev, {
                                        id: Date.now().toString(),
                                        role: "assistant" as const,
                                        content: `🎨 **${palette.name}** palette applied!\n\n*${palette.mood}*\n\nYour brand is taking shape! Want to generate a logo? Say **"generate logo"**.`,
                                        suggestions: [
                                            { label: "Generate logo", action: "generate a logo for my brand" },
                                            { label: "Build landing page", action: "create a landing page for my startup" },
                                        ],
                                    }]);
                                }}
                                onSelectLogo={(logoUrl) => {
                                    handleBrandSelect("logos", logoUrl);
                                    setBrandSuggestions({ type: null, data: [] });
                                    setMessages((prev) => [...prev, {
                                        id: Date.now().toString(),
                                        role: "assistant" as const,
                                        content: `🎉 **Perfect!** Your brand identity is complete!\n\nReady to build your landing page? Just say "create my landing page" and I'll generate it with your brand.`,
                                        suggestions: [
                                            { label: "Build landing page", action: "create a landing page for my startup" },
                                            { label: "Generate social ads", action: "create social media ad designs" },
                                        ],
                                    }]);
                                }}
                            />
                        ) : (
                            <PreviewTab
                                sandboxUrl={previewUrl}
                                isLoading={!isContainerReady}
                                statusMessage={containerStatus}
                            />
                        )
                    ) : (
                        <V0CodeView
                            files={files}
                            onFileSelect={setActiveFile}
                            onFileChange={(path, content) => {
                                setFiles(prev => ({ ...prev, [path]: content }));
                                setSaveStatus("unsaved");
                            }}
                        />
                    )}

                    {/* Streaming Status Overlay */}
                    <StreamingStatus
                        isStreaming={streaming.isStreaming}
                        status={streaming.status}
                        fileUpdates={streaming.fileUpdates}
                        toolCalls={streaming.toolCalls}
                    />


                </div>
            </div>

            {/* Version History Panel */}
            <VersionHistoryPanel
                snapshots={snapshots}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={async () => {
                    const restored = undoChanges();
                    if (restored) {
                        setFiles(restored);
                        streaming.setFiles(restored);
                        const sandbox = e2bSandboxRef.current;
                        if (sandbox?.isReady) sandbox.writeFiles(restored);
                    }
                }}
                onRedo={async () => {
                    const restored = redoChanges();
                    if (restored) {
                        setFiles(restored);
                        streaming.setFiles(restored);
                        const sandbox = e2bSandboxRef.current;
                        if (sandbox?.isReady) sandbox.writeFiles(restored);
                    }
                }}
                onRestore={async (index) => {
                    const restored = restoreSnapshot(index);
                    if (restored) {
                        setFiles(restored);
                        streaming.setFiles(restored);
                        const sandbox = e2bSandboxRef.current;
                        if (sandbox?.isReady) sandbox.writeFiles(restored);
                    }
                }}
                isOpen={isHistoryPanelOpen}
                onClose={() => setIsHistoryPanelOpen(false)}
            />

            {/* Export Panel */}
            <ExportPanel
                files={files}
                projectName={currentBrand.name}
                isOpen={isExportPanelOpen}
                onClose={() => setIsExportPanelOpen(false)}
            />
        </div>
    );
}
