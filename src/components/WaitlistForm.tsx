"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface WaitlistFormProps {
    brandName?: string;
    onSubmit?: (email: string) => Promise<void>;
}

export function WaitlistForm({ brandName = "LaunchKit", onSubmit }: WaitlistFormProps) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!email.trim() || !email.includes("@")) {
            setStatus("error");
            setMessage("Please enter a valid email address");
            return;
        }

        setStatus("loading");

        try {
            if (onSubmit) {
                await onSubmit(email);
            } else {
                // Default: just simulate success
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            setStatus("success");
            setMessage("You're on the list! We'll notify you when we launch.");
            setEmail("");
        } catch {
            setStatus("error");
            setMessage("Something went wrong. Please try again.");
        }
    }

    return (
        <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-xl shadow-zinc-200/50 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
                <div className="text-center mb-4">
                    <h3 className="font-display font-semibold text-lg text-zinc-800 mb-1">
                        Join the {brandName} Waitlist
                    </h3>
                    <p className="text-sm text-zinc-500">
                        Be the first to know when we launch
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            disabled={status === "loading" || status === "success"}
                            className="flex-1 bg-zinc-50 border-zinc-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl"
                        />
                        <Button
                            type="submit"
                            disabled={status === "loading" || status === "success"}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-6 rounded-xl transition-all"
                        >
                            {status === "loading" ? (
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="inline-block"
                                >
                                    ◌
                                </motion.span>
                            ) : status === "success" ? (
                                "✓"
                            ) : (
                                "Join"
                            )}
                        </Button>
                    </div>

                    {message && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-sm text-center ${status === "success" ? "text-emerald-600" : "text-rose-500"
                                }`}
                        >
                            {message}
                        </motion.p>
                    )}
                </form>

                <p className="text-xs text-zinc-400 text-center mt-4">
                    No spam, ever. Unsubscribe anytime.
                </p>
            </CardContent>
        </Card>
    );
}
