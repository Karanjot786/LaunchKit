"use client";

import { motion } from "framer-motion";

interface LoadingStateProps {
    step: string;
    message: string;
    icon?: "search" | "sparkle" | "rocket";
}

const icons = {
    search: (
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    sparkle: <span className="text-2xl">✦</span>,
    rocket: <span className="text-2xl">🚀</span>,
};

export function LoadingState({ step, message, icon = "search" }: LoadingStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center max-w-md"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl"
            >
                {icons[icon]}
            </motion.div>
            <h2 className="font-display text-2xl font-semibold text-zinc-800 mb-2">{step}</h2>
            <p className="text-zinc-500 mb-6">{message}</p>
            <div className="flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        className="w-2 h-2 bg-indigo-500 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                ))}
            </div>
        </motion.div>
    );
}
