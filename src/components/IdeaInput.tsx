"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IdeaInputProps {
    idea: string;
    setIdea: (idea: string) => void;
    onSubmit: () => void;
    error: string | null;
}

export function IdeaInput({ idea, setIdea, onSubmit, error }: IdeaInputProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl text-center"
        >
            <Badge className="mb-6 bg-indigo-50 text-indigo-600 border-indigo-100">
                AI-Powered Validation
            </Badge>
            <h1 className="font-display text-5xl md:text-6xl font-bold text-zinc-900 leading-[1.1] mb-4">
                Validate your idea<br />
                <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    with real data
                </span>
            </h1>
            <p className="text-lg text-zinc-500 max-w-md mx-auto mb-10">
                We&apos;ll analyze Reddit discussions, market data, and competition to validate your startup idea.
            </p>
            <Card className="glass-card border-0 shadow-xl rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <Textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="Describe your startup idea in detail..."
                        className="min-h-[140px] bg-transparent border-0 text-lg placeholder:text-zinc-400 resize-none focus-visible:ring-0"
                    />
                    {error && <p className="text-rose-500 text-sm mt-2 text-left">{error}</p>}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100">
                        <div className="flex gap-3 text-xs text-zinc-400">
                            <span>🔍 Reddit Analysis</span>
                            <span>📊 Market Data</span>
                            <span>🎯 AI Scoring</span>
                        </div>
                        <Button
                            onClick={onSubmit}
                            disabled={!idea.trim()}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-5 rounded-xl disabled:opacity-40"
                        >
                            Validate →
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
