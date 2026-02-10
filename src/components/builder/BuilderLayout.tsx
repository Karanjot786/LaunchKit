"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, Redo2, Clock, Download, Rocket, ChevronLeft, Plus, MessageSquare } from "lucide-react";
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
import {
    ChatSession,
    ChatMessage as FirebaseChatMessage,
    getChatSessions,
    createChatSession,
    getSessionMessages,
    addSessionMessage
} from "@/lib/firebase";

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
    validationMode?: "quick" | "deep";
    selectedModel?: string;
    selectedFeatures?: { id?: string; title: string; description?: string; category?: string }[];
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

    // Chat session state
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [sessionsLoaded, setSessionsLoaded] = useState(false);

    // Brand Panel state (must be before session effects that reference it)
    const [brandPanelCollapsed, setBrandPanelCollapsed] = useState(false);
    const [currentBrand, setCurrentBrand] = useState(brandContext);

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

    // Load chat sessions on mount
    useEffect(() => {
        if (!projectId || sessionsLoaded) return;

        const currentProjectId = projectId; // Capture for closure

        async function loadSessions() {
            try {
                const sessions = await getChatSessions(currentProjectId);

                if (sessions.length === 0) {
                    // Create first chat session
                    const sessionId = await createChatSession(currentProjectId, "Chat 1");
                    setChatSessions([{ id: sessionId, projectId: currentProjectId, name: "Chat 1" }]);
                    setActiveSessionId(sessionId);
                } else {
                    setChatSessions(sessions);
                    const firstSessionId = sessions[0].id;
                    setActiveSessionId(firstSessionId || null);

                    if (firstSessionId) {
                        const sessionMessages = await getSessionMessages(currentProjectId, firstSessionId);
                        if (sessionMessages.length > 0) {
                            const loadedMessages: Message[] = sessionMessages.map(m => ({
                                id: m.id || crypto.randomUUID(),
                                role: m.role,
                                content: m.content,
                                files: m.files,
                                suggestions: m.suggestions,
                                brandSuggestions: m.brandSuggestions,
                            }));
                            setMessages(loadedMessages);
                        }
                    }
                }
                setSessionsLoaded(true);
            } catch (error) {
                console.error("[BuilderLayout] Error loading chat sessions:", error);
                setSessionsLoaded(true);
            }
        }

        loadSessions();
    }, [projectId, sessionsLoaded]);

    // Handle switching chat sessions
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (!projectId || sessionId === activeSessionId) return;

        setActiveSessionId(sessionId);
        setIsLoading(true);

        try {
            const sessionMessages = await getSessionMessages(projectId, sessionId);
            if (sessionMessages.length > 0) {
                const loadedMessages: Message[] = sessionMessages.map(m => ({
                    id: m.id || crypto.randomUUID(),
                    role: m.role,
                    content: m.content,
                    files: m.files,
                    suggestions: m.suggestions,
                    brandSuggestions: m.brandSuggestions,
                }));
                setMessages(loadedMessages);
            } else {
                // Empty session - show initial message
                setMessages([getInitialMessage(currentBrand)]);
            }
        } catch (error) {
            console.error("[BuilderLayout] Error loading session messages:", error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, activeSessionId, currentBrand]);

    // Handle creating new chat session
    const handleNewChat = useCallback(async () => {
        if (!projectId) return;

        try {
            const newSessionName = `Chat ${chatSessions.length + 1}`;
            const sessionId = await createChatSession(projectId, newSessionName);
            const newSession: ChatSession = { id: sessionId, projectId, name: newSessionName };

            setChatSessions(prev => [...prev, newSession]);
            setActiveSessionId(sessionId);
            setMessages([getInitialMessage(currentBrand)]);
        } catch (error) {
            console.error("[BuilderLayout] Error creating new chat session:", error);
        }
    }, [projectId, chatSessions.length, currentBrand]);

    // Brand suggestions state (for preview area)
    const [brandSuggestions, setBrandSuggestions] = useState<{
        type: "names" | "colors" | "logos" | "features" | null;
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

    // Initialize sandbox only after brand prerequisites are complete
    const hasValidation = currentBrand.validation && Object.keys(currentBrand.validation).length > 0 && currentBrand.validation.category;
    const hasName = currentBrand.name && currentBrand.name !== "Untitled Project";
    const hasColors = currentBrand.colorPalette.primary !== "#6366F1";
    const hasLogo = currentBrand.logo && currentBrand.logo.length > 0;
    const isBrandReady = hasValidation && hasName && hasColors && hasLogo;

    useEffect(() => {
        if (containerInitialized.current) return;

        // Don't initialize sandbox until brand is ready (validation + name + colors + logo)
        if (!isBrandReady) {
            console.log("[LaunchKit] Waiting for brand prerequisites (validation, name, colors, logo)...");
            return;
        }

        containerInitialized.current = true;

        const init = async () => {
            // Try E2B first
            if (useE2B) {
                try {
                    setContainerStatus("Creating E2B sandbox...");
                    console.log("[LaunchKit] Brand ready! Creating E2B cloud sandbox...");

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
                        console.log("[LaunchKit] E2B sandbox ready! Setting isSandboxReady=true");
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
    }, [useE2B, isBrandReady]);

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
                        body: JSON.stringify({
                            idea: currentBrand.idea,
                            mode: currentBrand.validationMode || "quick",
                            model: currentBrand.selectedModel || "gemini-3-flash-preview"
                        }),
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

                        // Add success message with feature suggestions prompt
                        const category = validationData.category?.primary || "your niche";
                        const audience = validationData.category?.targetAudience || "your target users";
                        const proposedFeatures = validationData.proposedFeatures?.slice(0, 3) || [];

                        setMessages(prev => [...prev, {
                            id: Date.now().toString(),
                            role: "assistant" as const,
                            content: `✅ **Validation Complete!**\n\nYour idea is in the **${category}** space, targeting **${audience}**.\n\n${proposedFeatures.length > 0 ? `**Suggested Features:**\n${proposedFeatures.map((f: { title: string; description: string }) => `• **${f.title}** - ${f.description}`).join('\n')}\n\n` : ''}Let's pick your features! Say **"suggest features"** or select from below.`,
                            thinking: Math.round((Date.now() - startTime) / 1000),
                            suggestions: [
                                { label: "Suggest features", action: "suggest features for my startup" },
                                { label: "Core MVP features", action: "suggest essential MVP features only" },
                                { label: "Skip to branding", action: "skip features and suggest brand names" },
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
    const handleTriggerBrandStep = useCallback((step: "name" | "colors" | "logo" | "features") => {
        const prompts: Record<string, string> = {
            name: "suggest new brand names for my project",
            colors: "suggest different color palettes for my brand",
            logo: "generate new logo options for my brand",
            features: "brainstorm innovative features for my product based on the validation",
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

        // Persist user message to Firestore
        if (projectId && activeSessionId) {
            try {
                await addSessionMessage(projectId, activeSessionId, {
                    role: "user",
                    content,
                });
            } catch (error) {
                console.error("[BuilderLayout] Error saving user message:", error);
            }
        }

        const startTime = Date.now();
        const timer = setInterval(() => {
            setThinkingTime(Math.round((Date.now() - startTime) / 1000));
        }, 1000);

        const lowerContent = content.toLowerCase();

        try {
            // Detect brand-related requests and route to dedicated APIs
            const isFeatureRequest = lowerContent.includes("feature") && (lowerContent.includes("suggest") || lowerContent.includes("brainstorm") || lowerContent.includes("mvp"));
            const isNameRequest = lowerContent.includes("name") && (lowerContent.includes("suggest") || lowerContent.includes("generate"));
            const isColorRequest = lowerContent.includes("color") && (lowerContent.includes("suggest") || lowerContent.includes("generate") || lowerContent.includes("palette"));
            const isLogoRequest = lowerContent.includes("logo") && (lowerContent.includes("generate") || lowerContent.includes("create"));

            if (isFeatureRequest) {
                // Call features API
                const res = await fetch("/api/features", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "brainstorm",
                        validationData: currentBrand.validation,
                        model: currentBrand.selectedModel || "gemini-3-flash-preview",
                    }),
                });
                const data = await res.json();

                if (data.success) {
                    const { mvp, stretch, moonshots } = data.data;
                    const allFeatures = [...mvp, ...stretch, ...moonshots];

                    // Set brand suggestions to show features in preview
                    setBrandSuggestions({ type: "features", data: allFeatures });

                    setMessages((prev) => [...prev, {
                        id: Date.now().toString(),
                        role: "assistant" as const,
                        content: `🚀 **Feature Brainstorm Complete!**\n\n**MVP Features (${mvp.length}):**\n${mvp.slice(0, 3).map((f: { title: string }) => `• ${f.title}`).join('\n')}\n\n**Nice-to-Have (${stretch.length}):**\n${stretch.slice(0, 2).map((f: { title: string }) => `• ${f.title}`).join('\n')}\n\n**Moonshots (${moonshots.length}):**\n${moonshots.slice(0, 2).map((f: { title: string }) => `• ${f.title}`).join('\n')}\n\nSelect features from the preview panel, then say **"suggest names"** to continue!`,
                        thinking: Math.round((Date.now() - startTime) / 1000),
                        suggestions: [
                            { label: "Suggest names", action: "suggest names for my brand" },
                            { label: "More features", action: "suggest more innovative features" },
                        ],
                    }]);

                    // Store features in brand context
                    setCurrentBrand(prev => ({
                        ...prev,
                        selectedFeatures: mvp.map((f: { title: string; description: string }, i: number) => ({
                            id: `mvp-${i}`,
                            title: f.title,
                            description: f.description,
                            category: "MVP"
                        }))
                    }));
                } else {
                    throw new Error(data.error || "Failed to brainstorm features");
                }
            } else if (isNameRequest) {
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

            // Persist new assistant messages to Firestore
            if (projectId && activeSessionId) {
                setMessages((currentMessages) => {
                    // Find all messages after the user's message that haven't been persisted
                    const userMsgIndex = currentMessages.findIndex(m => m.id === userMessage.id);
                    if (userMsgIndex >= 0) {
                        const newAssistantMessages = currentMessages.slice(userMsgIndex + 1).filter(m => m.role === "assistant");
                        for (const msg of newAssistantMessages) {
                            const messageData: { role: "assistant"; content: string; suggestions?: Array<{ label: string; action: string }> } = {
                                role: "assistant",
                                content: msg.content,
                            };
                            if (msg.suggestions) {
                                messageData.suggestions = msg.suggestions;
                            }
                            addSessionMessage(projectId, activeSessionId!, messageData)
                                .catch(err => console.error("[BuilderLayout] Error saving assistant message:", err));
                        }
                    }
                    return currentMessages; // Don't modify state
                });
            }
        }
    }, [currentBrand, files, isContainerReady, onProjectUpdate, streaming, projectId, activeSessionId]);

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
        <div className="flex flex-col h-screen bg-[#0a0a0a] relative">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-amber-500/5 via-orange-500/3 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-zinc-800/30 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Header - Glassmorphic Command Bar */}
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-14 border-b border-zinc-800/80 flex items-center justify-between px-4 backdrop-blur-xl bg-zinc-950/70"
            >
                {/* Left section */}
                <div className="flex items-center gap-3">
                    {/* Back button */}
                    {projectId && (
                        <motion.a
                            href="/dashboard"
                            whileHover={{ scale: 1.05, x: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800/50"
                            title="Back to Dashboard"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </motion.a>
                    )}

                    {/* Divider */}
                    {projectId && <div className="w-px h-6 bg-zinc-800" />}

                    {/* Brand Identity */}
                    <div className="flex items-center gap-3">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative"
                        >
                            {currentBrand.logo ? (
                                <img src={currentBrand.logo} alt="" className="w-9 h-9 rounded-xl border border-zinc-700/50" />
                            ) : (
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm border border-white/10"
                                    style={{ background: `linear-gradient(135deg, ${currentBrand.colorPalette.primary}, ${currentBrand.colorPalette.secondary})` }}
                                >
                                    {currentBrand.name.charAt(0)}
                                </div>
                            )}
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="text-white font-semibold text-sm leading-tight">{currentBrand.name}</span>
                            <span className="text-zinc-500 text-xs">Building your app</span>
                        </div>
                    </div>

                    {/* Save Status - Animated Pill */}
                    {projectId && (
                        <motion.div
                            key={saveStatus}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${saveStatus === "saved"
                                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                : saveStatus === "saving"
                                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                                    : "text-orange-400 bg-orange-500/10 border-orange-500/20"
                                }`}
                        >
                            <motion.div
                                className={`w-1.5 h-1.5 rounded-full ${saveStatus === "saved" ? "bg-emerald-400"
                                    : saveStatus === "saving" ? "bg-amber-400"
                                        : "bg-orange-400"
                                    }`}
                                animate={saveStatus === "saving" ? { scale: [1, 1.2, 1], opacity: [1, 0.6, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 1 }}
                            />
                            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving..." : "Unsaved"}
                        </motion.div>
                    )}

                    {/* Container Status Badge */}
                    <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${isContainerReady
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isContainerReady ? "bg-emerald-400" : "bg-zinc-500 animate-pulse"}`} />
                        {isContainerReady ? "Ready" : containerStatus.slice(0, 20)}
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-1">
                    {/* Undo/Redo Group */}
                    <div className="flex items-center bg-zinc-800/50 rounded-lg p-0.5 mr-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                                const restored = undoChanges();
                                if (restored) {
                                    setFiles(restored);
                                    const sandbox = e2bSandboxRef.current;
                                    if (sandbox?.isReady) sandbox.writeFiles(restored);
                                }
                            }}
                            disabled={!canUndo}
                            className={`p-2 rounded-md transition-colors ${!canUndo ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-700 text-zinc-400 hover:text-white"}`}
                            title="Undo (⌘Z)"
                        >
                            <Undo2 className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                                const restored = redoChanges();
                                if (restored) {
                                    setFiles(restored);
                                    const sandbox = e2bSandboxRef.current;
                                    if (sandbox?.isReady) sandbox.writeFiles(restored);
                                }
                            }}
                            disabled={!canRedo}
                            className={`p-2 rounded-md transition-colors ${!canRedo ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-700 text-zinc-400 hover:text-white"}`}
                            title="Redo (⌘⇧Z)"
                        >
                            <Redo2 className="w-4 h-4" />
                        </motion.button>
                    </div>

                    {/* Action Buttons */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsHistoryPanelOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm"
                    >
                        <Clock className="w-4 h-4" />
                        <span className="hidden sm:inline">History</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsExportPanelOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </motion.button>

                    {/* Publish Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsExportPanelOpen(true)}
                        className="group relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm overflow-hidden ml-2"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 transition-all" />
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Rocket className="w-4 h-4 text-black relative z-10" />
                        <span className="text-black relative z-10">Publish</span>
                    </motion.button>
                </div>
            </motion.header>

            {/* Main content with Brand Panel */}
            <div className="flex flex-1 overflow-hidden">
                {/* Brand Panel - Left */}
                <BrandPanel
                    project={{
                        ...currentBrand,
                        features: currentBrand.selectedFeatures?.map((f: { id?: string; title: string }) => ({
                            id: f.id || f.title,
                            title: f.title,
                            selected: true
                        })) || []
                    }}
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
                        sessions={chatSessions}
                        activeSessionId={activeSessionId}
                        onNewChat={handleNewChat}
                        onSwitchSession={handleSwitchSession}
                    />
                </div>

                {/* Preview/Code Panel - Right */}
                <div className="flex-1 flex flex-col bg-[#0a0a0a]">
                    {/* Premium Tab bar */}
                    <div className="h-12 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center justify-between px-4">
                        <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-xl">
                            <motion.button
                                onClick={() => setActiveTab("preview")}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "preview"
                                    ? "text-white"
                                    : "text-zinc-400 hover:text-zinc-300"
                                    }`}
                            >
                                {activeTab === "preview" && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-zinc-700 rounded-lg"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="relative flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${activeTab === "preview" ? "bg-amber-400" : "bg-zinc-500"}`} />
                                    Preview
                                </span>
                            </motion.button>
                            <motion.button
                                onClick={() => setActiveTab("code")}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === "code"
                                    ? "text-white"
                                    : "text-zinc-400 hover:text-zinc-300"
                                    }`}
                            >
                                {activeTab === "code" && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-zinc-700 rounded-lg"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <span className="relative">{"</>"} Code</span>
                            </motion.button>
                        </div>

                        {/* Status indicator */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${containerStatus === "Ready"
                            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                            : "text-zinc-400 bg-zinc-800/50 border-zinc-700/50"
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${containerStatus === "Ready" ? "bg-emerald-400" : "bg-zinc-500 animate-pulse"
                                }`} />
                            <span className="hidden sm:inline">{containerStatus}</span>
                        </div>
                    </div>

                    {/* Content */}
                    {activeTab === "preview" ? (
                        // Show brand setup preview when brand is not ready OR when showing brand suggestions
                        !isBrandReady || brandSuggestions.type ? (
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
                                onSelectLogo={async (logoUrl) => {
                                    handleBrandSelect("logos", logoUrl);
                                    setBrandSuggestions({ type: null, data: [] });

                                    // Upload only the selected logo to Storage
                                    if (projectId) {
                                        try {
                                            const res = await fetch("/api/brand/logo/upload", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ projectId, logoDataUrl: logoUrl }),
                                            });
                                            const data = await res.json();
                                            if (data.success && data.url !== logoUrl) {
                                                // Update with the Storage URL
                                                handleBrandSelect("logos", data.url);
                                            }
                                        } catch (err) {
                                            console.error("[BuilderLayout] Error uploading selected logo:", err);
                                        }
                                    }

                                    // Write logo to sandbox as a reusable asset
                                    const sandbox = e2bSandboxRef.current;
                                    if (sandbox && sandbox.isReady) {
                                        try {
                                            // Write an SVG wrapper or CSS that embeds the logo
                                            const logoCSS = `/* Brand Logo - Auto-generated */\n.brand-logo {\n  background-image: url("${logoUrl}");\n  background-size: contain;\n  background-repeat: no-repeat;\n  background-position: center;\n}\n`;
                                            await sandbox.writeFiles({
                                                "src/assets/brand-logo.css": logoCSS,
                                            });
                                            // Also update local files state
                                            setFiles(prev => ({
                                                ...prev,
                                                "src/assets/brand-logo.css": logoCSS,
                                            }));
                                            console.log("[BuilderLayout] Logo written to sandbox");
                                        } catch (err) {
                                            console.error("[BuilderLayout] Error writing logo to sandbox:", err);
                                        }
                                    }

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
                                onSelectFeatures={(features) => {
                                    setCurrentBrand(prev => ({
                                        ...prev,
                                        selectedFeatures: features
                                    }));
                                    setBrandSuggestions({ type: null, data: [] });
                                    if (onProjectUpdate) {
                                        onProjectUpdate({ selectedFeatures: features });
                                    }
                                    setMessages((prev) => [...prev, {
                                        id: Date.now().toString(),
                                        role: "assistant" as const,
                                        content: `✅ **${features.length} features selected!**\n\n${features.slice(0, 3).map((f: { title: string }) => "• " + f.title).join("\n")}${features.length > 3 ? "\n• ...and " + (features.length - 3) + " more" : ""}\n\nNow let's name your brand! Say **"suggest names"** or describe the vibe you want.`,
                                        suggestions: [
                                            { label: "Suggest names", action: "suggest names for my brand" },
                                            { label: "Modern & minimal", action: "suggest modern minimal brand names" },
                                            { label: "Fun & playful", action: "suggest fun playful brand names" },
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
