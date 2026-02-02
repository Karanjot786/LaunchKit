"use client";

import { useState, useCallback } from "react";
import { ChatPanel } from "./ChatPanel";
import { PreviewTab } from "./PreviewTab";
import { CodeTab } from "./CodeTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        category: { primary: string; targetAudience: string; keywords: string[] };
        community: { painPoints: string[] };
        opportunities: string[];
    };
    idea?: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    files?: Record<string, string>;
    thinking?: number;
}

interface BuilderLayoutProps {
    brandContext: BrandContext;
    projectId?: string;
}

export function BuilderLayout({ brandContext, projectId }: BuilderLayoutProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "initial",
            role: "assistant",
            content: `I'm ready to help you build the ${brandContext.name} landing page with E2B cloud sandbox!\n\nI know:\n• Target: ${brandContext.validation.category.targetAudience}\n• Pain points: ${brandContext.validation.community.painPoints.slice(0, 2).join(", ")}\n\nSay "build my landing page" to get started!`,
        },
    ]);
    const [files, setFiles] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
    const [activeFile, setActiveFile] = useState("app/page.tsx");
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingTime, setThinkingTime] = useState(0);

    // E2B sandbox state
    const [sandboxId, setSandboxId] = useState<string | null>(null);
    const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);

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

        try {
            const response = await fetch("/api/builder/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content,
                    brandContext,
                    currentFiles: files,
                    sandboxId, // Pass existing sandbox ID if available
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Update sandbox state
                if (data.sandboxId && !sandboxId) {
                    setSandboxId(data.sandboxId);
                }
                if (data.previewUrl) {
                    setSandboxUrl(data.previewUrl);
                }

                // Update files
                if (data.files) {
                    setFiles((prev) => ({ ...prev, ...data.files }));
                }

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: data.message,
                    files: data.files,
                    thinking: Math.round((Date.now() - startTime) / 1000),
                };

                setMessages((prev) => [...prev, assistantMessage]);
            } else {
                throw new Error(data.error || "Generation failed");
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
    }, [brandContext, files, sandboxId]);

    const handleFileChange = (file: string, content: string) => {
        setFiles((prev) => ({ ...prev, [file]: content }));
    };

    return (
        <div className="flex flex-col h-screen bg-zinc-950">
            {/* Header */}
            <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: brandContext.colorPalette.primary }}
                        >
                            {brandContext.name.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{brandContext.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                        {sandboxId ? "🟢 E2B Connected" : "⚪ Ready"}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    {sandboxUrl && (
                        <a
                            href={sandboxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-400 hover:text-white text-sm"
                        >
                            Open Preview ↗
                        </a>
                    )}
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                        Share
                    </Button>
                    <Button size="sm" className="bg-white text-black hover:bg-zinc-200">
                        Publish
                    </Button>
                </div>
            </header>

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Chat Panel - Left */}
                <div className="w-[380px] border-r border-zinc-800">
                    <ChatPanel
                        messages={messages}
                        onSend={handleSendMessage}
                        isLoading={isLoading}
                        thinkingTime={thinkingTime}
                        brandName={brandContext.name}
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
                        {sandboxId && (
                            <span className="ml-auto text-xs text-zinc-500">
                                Sandbox: {sandboxId.slice(0, 8)}...
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    {activeTab === "preview" ? (
                        <PreviewTab
                            sandboxUrl={sandboxUrl}
                            isLoading={isLoading && !sandboxUrl}
                        />
                    ) : (
                        <CodeTab
                            files={files}
                            activeFile={activeFile}
                            onFileSelect={setActiveFile}
                            onFileChange={handleFileChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
