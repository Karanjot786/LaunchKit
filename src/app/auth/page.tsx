"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { getAuthErrorMessage } from "@/lib/firebase";

export default function AuthPage() {
    const { user, loading, signInWithGoogle, signInWithGithub } = useAuth();
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user) {
            router.push("/dashboard");
        }
    }, [user, loading, router]);

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsSigningIn(true);
        try {
            await signInWithGoogle();
            router.push("/dashboard");
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleGithubSignIn = async () => {
        setError(null);
        setIsSigningIn(true);
        try {
            await signInWithGithub();
            router.push("/dashboard");
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-400 rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-transparent blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-cyan-600/20 via-blue-500/10 to-transparent blur-3xl"
                />
            </div>

            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                      linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            <div className="relative min-h-screen flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[420px]"
                >
                    {/* Logo & Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                        className="text-center mb-10"
                    >
                        <div className="relative inline-block mb-6">
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 blur-xl opacity-50"
                            />
                            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 p-[2px]">
                                <div className="w-full h-full rounded-2xl bg-[#0a0a0f] flex items-center justify-center overflow-hidden">
                                    <img
                                        src="/logo.png"
                                        alt="LaunchKit Logo"
                                        className="w-14 h-14 object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent tracking-tight">
                            LaunchKit
                        </h1>
                        <p className="text-zinc-500 mt-3 text-lg font-light">
                            From idea to website in minutes
                        </p>
                    </motion.div>

                    {/* Auth Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="relative group"
                    >
                        {/* Card glow effect */}
                        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-violet-600/50 via-fuchsia-500/50 to-cyan-400/50 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />

                        <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-800/80 p-8 shadow-2xl shadow-black/20">
                            <h2 className="text-xl font-semibold text-white text-center mb-2">
                                Welcome back
                            </h2>
                            <p className="text-zinc-500 text-center text-sm mb-8">
                                Sign in to continue building
                            </p>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: "auto" }}
                                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 overflow-hidden"
                                >
                                    <p className="text-red-400 text-sm text-center">{error}</p>
                                </motion.div>
                            )}

                            <div className="space-y-4">
                                {/* Google Sign In */}
                                <motion.button
                                    onHoverStart={() => setHoveredButton("google")}
                                    onHoverEnd={() => setHoveredButton(null)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGoogleSignIn}
                                    disabled={isSigningIn}
                                    className="w-full relative group/btn overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white via-zinc-100 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                    <div className="relative flex items-center justify-center gap-3 bg-white text-zinc-900 font-medium py-4 px-4 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
                                        <motion.div
                                            initial={{ x: -5, opacity: 0 }}
                                            animate={{ x: hoveredButton === "google" ? 0 : -5, opacity: hoveredButton === "google" ? 1 : 0 }}
                                            className="ml-auto"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </motion.div>
                                    </div>
                                </motion.button>

                                {/* GitHub Sign In */}
                                <motion.button
                                    onHoverStart={() => setHoveredButton("github")}
                                    onHoverEnd={() => setHoveredButton(null)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGithubSignIn}
                                    disabled={isSigningIn}
                                    className="w-full relative group/btn overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                                    <div className="relative flex items-center justify-center gap-3 bg-zinc-800 border border-zinc-700/50 text-white font-medium py-4 px-4 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                        </svg>
                                        <span>{isSigningIn ? "Signing in..." : "Continue with GitHub"}</span>
                                        <motion.div
                                            initial={{ x: -5, opacity: 0 }}
                                            animate={{ x: hoveredButton === "github" ? 0 : -5, opacity: hoveredButton === "github" ? 1 : 0 }}
                                            className="ml-auto"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </motion.div>
                                    </div>
                                </motion.button>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-8">
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                                <span className="text-zinc-600 text-xs font-medium uppercase tracking-wider">Secure</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                            </div>

                            {/* Terms */}
                            <p className="text-zinc-500 text-xs text-center leading-relaxed">
                                By signing in, you agree to our{" "}
                                <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Terms of Service</a>
                                {" "}and{" "}
                                <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Privacy Policy</a>
                            </p>
                        </div>
                    </motion.div>

                    {/* Back to home */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        className="text-center mt-8"
                    >
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors group"
                        >
                            <motion.svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                animate={{ x: 0 }}
                                whileHover={{ x: -3 }}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </motion.svg>
                            <span>Back to home</span>
                        </Link>
                    </motion.div>

                    {/* Trust badges */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="flex items-center justify-center gap-6 mt-10"
                    >
                        <div className="flex items-center gap-2 text-zinc-600 text-xs">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>SSL Encrypted</span>
                        </div>
                        <div className="w-px h-4 bg-zinc-800" />
                        <div className="flex items-center gap-2 text-zinc-600 text-xs">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>SOC 2 Compliant</span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
