/**
 * Export Panel
 * 
 * UI for exporting and deploying projects.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { downloadProject, deployToVercel, pushToGitHub } from "@/lib/export-utils";

interface ExportPanelProps {
    files: Record<string, string>;
    projectName: string;
    isOpen: boolean;
    onClose: () => void;
}

type ExportStep = "menu" | "vercel" | "github" | "deploying";

export function ExportPanel({ files, projectName, isOpen, onClose }: ExportPanelProps) {
    const [step, setStep] = useState<ExportStep>("menu");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

    // Form state
    const [vercelToken, setVercelToken] = useState("");
    const [githubToken, setGithubToken] = useState("");
    const [repoName, setRepoName] = useState(projectName.toLowerCase().replace(/\s+/g, "-"));
    const [isPrivateRepo, setIsPrivateRepo] = useState(false);

    const handleDownloadZip = async () => {
        setIsLoading(true);
        try {
            await downloadProject(files, projectName);
            onClose();
        } catch (error) {
            console.error("Download failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVercelDeploy = async () => {
        if (!vercelToken.trim()) return;

        setStep("deploying");
        setIsLoading(true);

        try {
            const result = await deployToVercel(files, projectName, { token: vercelToken });
            setResult(result);
        } catch (error) {
            setResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGitHubPush = async () => {
        if (!githubToken.trim() || !repoName.trim()) return;

        setStep("deploying");
        setIsLoading(true);

        try {
            const result = await pushToGitHub(files, {
                token: githubToken,
                repoName,
                isPrivate: isPrivateRepo,
                description: `${projectName} - Created with LaunchKit`,
            });
            setResult(result);
        } catch (error) {
            setResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
        } finally {
            setIsLoading(false);
        }
    };

    const resetPanel = () => {
        setStep("menu");
        setResult(null);
        setVercelToken("");
        setGithubToken("");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => { resetPanel(); onClose(); }}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-900 rounded-xl border border-zinc-800 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">
                                {step === "menu" && "Export Project"}
                                {step === "vercel" && "Deploy to Vercel"}
                                {step === "github" && "Push to GitHub"}
                                {step === "deploying" && (isLoading ? "Deploying..." : result?.success ? "Success!" : "Failed")}
                            </h2>
                            <button
                                onClick={() => { resetPanel(); onClose(); }}
                                className="text-zinc-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <AnimatePresence mode="wait">
                                {/* Main menu */}
                                {step === "menu" && (
                                    <motion.div
                                        key="menu"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-3"
                                    >
                                        <button
                                            onClick={handleDownloadZip}
                                            disabled={isLoading}
                                            className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-500/30">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">Download ZIP</div>
                                                    <div className="text-sm text-zinc-400">Get all files as a zip archive</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setStep("vercel")}
                                            className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white group-hover:bg-white/20">
                                                    <svg className="w-5 h-5" viewBox="0 0 116 100" fill="currentColor">
                                                        <path d="M57.5 0L115 100H0L57.5 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">Deploy to Vercel</div>
                                                    <div className="text-sm text-zinc-400">Instantly deploy to production</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setStep("github")}
                                            className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 group-hover:bg-purple-500/30">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">Push to GitHub</div>
                                                    <div className="text-sm text-zinc-400">Create a new repository</div>
                                                </div>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}

                                {/* Vercel form */}
                                {step === "vercel" && (
                                    <motion.div
                                        key="vercel"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-2">Vercel Token</label>
                                            <input
                                                type="password"
                                                value={vercelToken}
                                                onChange={(e) => setVercelToken(e.target.value)}
                                                placeholder="Enter your Vercel API token"
                                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                            />
                                            <p className="mt-1 text-xs text-zinc-500">
                                                Get your token from vercel.com/account/tokens
                                            </p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep("menu")}
                                                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={handleVercelDeploy}
                                                disabled={!vercelToken.trim()}
                                                className="flex-1 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Deploy
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* GitHub form */}
                                {step === "github" && (
                                    <motion.div
                                        key="github"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-2">GitHub Token</label>
                                            <input
                                                type="password"
                                                value={githubToken}
                                                onChange={(e) => setGithubToken(e.target.value)}
                                                placeholder="Enter your GitHub personal access token"
                                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm text-zinc-400 mb-2">Repository Name</label>
                                            <input
                                                type="text"
                                                value={repoName}
                                                onChange={(e) => setRepoName(e.target.value)}
                                                placeholder="my-project"
                                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                                            />
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isPrivateRepo}
                                                onChange={(e) => setIsPrivateRepo(e.target.checked)}
                                                className="w-4 h-4 rounded border-zinc-600"
                                            />
                                            <span className="text-sm text-zinc-400">Make repository private</span>
                                        </label>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep("menu")}
                                                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={handleGitHubPush}
                                                disabled={!githubToken.trim() || !repoName.trim()}
                                                className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Push
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Deploying/Result */}
                                {step === "deploying" && (
                                    <motion.div
                                        key="deploying"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="text-center py-8"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
                                                <p className="text-zinc-400">Deploying your project...</p>
                                            </>
                                        ) : result?.success ? (
                                            <>
                                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <p className="text-white font-medium mb-2">Deployed successfully!</p>
                                                {result.url && (
                                                    <a
                                                        href={result.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                    >
                                                        {result.url} →
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => { resetPanel(); onClose(); }}
                                                    className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                                >
                                                    Close
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </div>
                                                <p className="text-white font-medium mb-2">Deployment failed</p>
                                                <p className="text-sm text-zinc-400 mb-4">{result?.error}</p>
                                                <button
                                                    onClick={resetPanel}
                                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                                                >
                                                    Try Again
                                                </button>
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
