"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ExternalLink, Loader2 } from "lucide-react";

interface PreviewTabProps {
    sandboxUrl: string | null;
    isLoading: boolean;
    statusMessage?: string;
}

export function PreviewTab({ sandboxUrl, isLoading, statusMessage }: PreviewTabProps) {
    const [key, setKey] = useState(0);
    const [showIframe, setShowIframe] = useState(false);
    const [iframeError, setIframeError] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setIframeError(false);
        setKey(prev => prev + 1);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // Add a small delay before showing iframe to let Vite fully compile
    useEffect(() => {
        if (sandboxUrl) {
            setShowIframe(false);
            setIframeError(false);
            const timer = setTimeout(() => {
                setShowIframe(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [sandboxUrl]);

    // Auto-refresh once after initial load
    useEffect(() => {
        if (showIframe && sandboxUrl && key === 0) {
            const timer = setTimeout(() => {
                setKey(1);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showIframe, sandboxUrl, key]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
                {/* Ambient background */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center relative z-10"
                >
                    <div className="relative mx-auto mb-6 w-16 h-16">
                        {/* Outer ring */}
                        <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                        {/* Loading spinner */}
                        <motion.div
                            className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        />
                        {/* Inner glow */}
                        <div className="absolute inset-2 bg-amber-500/10 rounded-full" />
                    </div>
                    <p className="text-zinc-400 font-medium">{statusMessage || "Initializing sandbox..."}</p>
                    <p className="text-zinc-600 text-sm mt-2">First load may take 30-60 seconds</p>
                </motion.div>
            </div>
        );
    }

    // No sandbox URL yet
    if (!sandboxUrl) {
        return (
            <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
                {/* Decorative gradients */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-orange-500/5 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center relative z-10"
                >
                    <motion.div
                        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                        <span className="text-4xl">🚀</span>
                    </motion.div>
                    <h3 className="text-xl font-semibold text-white mb-2">Ready to Build</h3>
                    <p className="text-zinc-500 max-w-xs mx-auto">
                        Type a message to start generating your landing page
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-white relative">
            {/* Premium Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-3 right-3 z-10 flex items-center gap-2"
            >
                <motion.button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-medium border border-zinc-700/50 transition-all shadow-lg disabled:opacity-50"
                >
                    <motion.div
                        animate={isRefreshing ? { rotate: 360 } : {}}
                        transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </motion.div>
                    Refresh
                </motion.button>
                <motion.a
                    href={sandboxUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-medium border border-zinc-700/50 transition-all shadow-lg"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open
                </motion.a>
            </motion.div>

            {/* Loading state while waiting for iframe */}
            <AnimatePresence>
                {!showIframe && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center z-5"
                    >
                        <div className="text-center">
                            <div className="relative w-12 h-12 mx-auto mb-4">
                                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full" />
                                <motion.div
                                    className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                />
                            </div>
                            <p className="text-zinc-400 text-sm">Loading preview...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preview iframe */}
            {showIframe && (
                <motion.iframe
                    key={key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    src={sandboxUrl}
                    className="w-full h-full border-0"
                    title="Preview"
                    onError={() => setIframeError(true)}
                />
            )}

            {/* Error state */}
            <AnimatePresence>
                {iframeError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center"
                    >
                        <div className="text-center">
                            <motion.div
                                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                            >
                                <span className="text-3xl">⚠️</span>
                            </motion.div>
                            <p className="text-zinc-400 mb-4">Preview failed to load</p>
                            <motion.button
                                onClick={handleRefresh}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-medium text-sm shadow-lg shadow-amber-500/20"
                            >
                                Try Again
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
