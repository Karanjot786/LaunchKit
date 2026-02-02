"use client";

import { useState } from "react";

interface PreviewTabProps {
    sandboxUrl: string | null;
    isLoading: boolean;
}

export function PreviewTab({ sandboxUrl, isLoading }: PreviewTabProps) {
    const [key, setKey] = useState(0);

    const handleRefresh = () => setKey(prev => prev + 1);

    if (isLoading) {
        return (
            <div className="flex-1 bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-zinc-700 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400">Creating sandbox environment...</p>
                    <p className="text-zinc-500 text-sm mt-2">This may take a few seconds</p>
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

            {/* Preview iframe */}
            <iframe
                key={key}
                src={sandboxUrl}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
        </div>
    );
}
