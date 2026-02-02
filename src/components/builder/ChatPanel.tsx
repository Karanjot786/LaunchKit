"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    files?: Record<string, string>;
    thinking?: number;
}

interface ChatPanelProps {
    messages: Message[];
    onSend: (message: string) => void;
    isLoading: boolean;
    thinkingTime: number;
    brandName: string;
}

export function ChatPanel({ messages, onSend, isLoading, thinkingTime, brandName }: ChatPanelProps) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        onSend(input);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-zinc-900 text-white">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                        <span className="text-sm font-bold">{brandName.charAt(0)}</span>
                    </div>
                    <div>
                        <h2 className="font-semibold">{brandName}</h2>
                        <p className="text-xs text-zinc-400">Building your app</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={msg.role === "user" ? "ml-8" : "mr-8"}
                    >
                        <div
                            className={`rounded-2xl p-4 ${msg.role === "user" ? "bg-zinc-800 ml-auto" : "bg-zinc-800/50"
                                }`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {msg.files && Object.keys(msg.files).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {Object.keys(msg.files).map((file) => (
                                        <Badge key={file} variant="secondary" className="text-xs bg-zinc-700">
                                            {file.split("/").pop()}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {/* Thinking indicator */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col gap-2 text-sm text-zinc-400"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            Thought for {thinkingTime}s
                        </div>
                        <div className="flex items-center gap-2">
                            <span>✨</span>
                            Generating code...
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-zinc-800">
                <div className="relative">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a follow-up..."
                        disabled={isLoading}
                        className="min-h-[80px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none pr-12"
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        size="sm"
                        className="absolute bottom-3 right-3 bg-white text-black hover:bg-zinc-200"
                    >
                        ↑
                    </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                    <button className="hover:text-white">+ Add context</button>
                    <button className="hover:text-white">📎 Attach</button>
                </div>
            </div>
        </div>
    );
}
