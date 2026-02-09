"use client";

import { useState, useEffect } from "react";

interface PreviewTabProps {
    sandboxUrl: string | null;
    isLoading: boolean;
    statusMessage?: string;
}

export function PreviewTab({ sandboxUrl, isLoading, statusMessage }: PreviewTabProps) {
    const [key, setKey] = useState(0);
    const [showIframe, setShowIframe] = useState(false);
    const [iframeError, setIframeError] = useState(false);

    const handleRefresh = () => {
        setIframeError(false);
        setKey(prev => prev + 1);
    };

    // Add a small delay before showing iframe to let Vite fully compile
    useEffect(() => {
        if (sandboxUrl) {
            setShowIframe(false);
            setIframeError(false);
            const timer = setTimeout(() => {
                setShowIframe(true);
            }, 2000); // 2 second delay to ensure Vite is ready
            return () => clearTimeout(timer);
        }
    }, [sandboxUrl]);

    // Auto-refresh once after initial load
    useEffect(() => {
        if (showIframe && sandboxUrl && key === 0) {
            const timer = setTimeout(() => {
                setKey(1); // Trigger one auto-refresh
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showIframe, sandboxUrl, key]);

    if (isLoading) {
        return (
            <div className="flex-1 bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-zinc-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">{statusMessage || "Initializing WebContainer..."}</p>
                    <p className="text-zinc-500 text-sm mt-2">First load may take 30-60 seconds</p>
                </div>
            </div>
        );
    }

    if (!sandboxUrl) {
        return (
            <div className="flex-1 bg-zinc-900 flex items-center justify-center">
                <div className="text-center text-zinc-400">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-semibold mb-2">Ready to Build</h3>
                    <p className="text-zinc-500">
                        Type a message to start generating your landing page
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-white relative">
            {/* Toolbar */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <button
                    onClick={handleRefresh}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg text-xs flex items-center gap-1"
                    title="Refresh preview"
                >
                    ↻ Refresh
                </button>
                <a
                    href={sandboxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg text-xs flex items-center gap-1"
                    title="Open in new tab"
                >
                    ↗ Open
                </a>
            </div>

            {/* Loading state while waiting for iframe */}
            {!showIframe && (
                <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-10 h-10 border-4 border-zinc-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-zinc-400 text-sm">Loading preview...</p>
                    </div>
                </div>
            )}

            {/* Preview iframe */}
            {showIframe && (
                <iframe
                    key={key}
                    src={sandboxUrl}
                    className="w-full h-full border-0"
                    title="Preview"
                    onError={() => setIframeError(true)}
                />
            )}

            {/* Error state */}
            {iframeError && (
                <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                    <div className="text-center text-zinc-400">
                        <div className="text-4xl mb-3">⚠️</div>
                        <p className="mb-2">Preview failed to load</p>
                        <button
                            onClick={handleRefresh}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
