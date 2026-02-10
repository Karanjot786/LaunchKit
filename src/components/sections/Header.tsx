'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ReactNode } from 'react';

// LaunchKit Logo - Custom Image
function Logo() {
    return (
        <div className="relative flex items-center justify-center w-9 h-9">
            <img
                src="/logo.png"
                alt="LaunchKit"
                className="w-full h-full object-contain drop-shadow-lg hover:scale-110 transition-transform duration-300"
            />
        </div>
    );
}

// Export Logo component for use in other places
export { Logo };

interface HeaderProps {
    user?: { email: string | null } | null;
    onSignIn?: () => void;
    onDashboard?: () => void;
    children?: ReactNode; // Custom right-side content
    variant?: 'landing' | 'dashboard'; // Header variant
}

export default function Header({ user, onSignIn, onDashboard, children, variant = 'landing' }: HeaderProps) {
    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={variant === 'landing' ? "fixed top-0 left-0 right-0 z-50" : "border-b border-zinc-800"}
        >
            {/* Glass background with subtle border (landing only) */}
            {variant === 'landing' && (
                <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5" />
            )}

            <nav className={`relative ${variant === 'landing' ? 'max-w-6xl' : 'max-w-7xl'} mx-auto px-6 py-4`}>
                <div className="flex items-center justify-between">
                    {/* Logo + Brand */}
                    <Link href="/" className="group flex items-center gap-3">
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            className="relative"
                        >
                            <Logo />
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:via-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                                LaunchKit
                            </span>
                            <span className="text-[10px] text-zinc-500 -mt-0.5 tracking-widest uppercase font-medium">
                                by Gemini
                            </span>
                        </div>
                    </Link>

                    {/* Right side - Custom children or default actions */}
                    <div className="flex items-center gap-6">
                        {children ? (
                            children
                        ) : (
                            <>
                                {/* Powered by badge */}
                                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs text-zinc-400">Gemini 3 Pro</span>
                                </div>

                                {/* Auth button */}
                                {user ? (
                                    <motion.button
                                        onClick={onDashboard}
                                        whileHover={{ x: 3 }}
                                        className="group flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <span>Dashboard</span>
                                        <svg
                                            className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        onClick={onSignIn}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="relative px-4 py-2 rounded-lg text-sm font-medium text-white overflow-hidden group"
                                    >
                                        {/* Button gradient border */}
                                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-[1px] rounded-[7px] bg-zinc-900" />
                                        <span className="relative z-10 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all">
                                            Sign in
                                        </span>
                                    </motion.button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </motion.header>
    );
}
