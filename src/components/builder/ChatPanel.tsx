"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Plus, MessageSquare, ChevronDown } from "lucide-react";
import { BrandSuggestions, QuickActions } from "./BrandSuggestions";
import ReactMarkdown from "react-markdown";

interface ChatSession {
    id?: string;
    name: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    files?: Record<string, string>;
    thinking?: number;
    suggestions?: Array<{ label: string; action: string }>;
    brandSuggestions?: {
        type: "names" | "colors" | "logos";
        data: unknown[];
    };
}

interface ChatPanelProps {
    messages: Message[];
    onSend: (message: string) => void;
    onBrandSelect?: (type: string, selection: unknown) => void;
    isLoading: boolean;
    thinkingTime: number;
    brandName: string;
    // Chat session props
    sessions?: ChatSession[];
    activeSessionId?: string | null;
    onNewChat?: () => void;
    onSwitchSession?: (sessionId: string) => void;
}

export function ChatPanel({
    messages,
    onSend,
    onBrandSelect,
    isLoading,
    thinkingTime,
    brandName,
    sessions = [],
    activeSessionId,
    onNewChat,
    onSwitchSession
}: ChatPanelProps) {
    const [input, setInput] = useState("");
    const [selectedBrand, setSelectedBrand] = useState<Record<string, unknown>>({});
    const [isFocused, setIsFocused] = useState(false);
    const [showSessionMenu, setShowSessionMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [input]);

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

    const handleBrandSelect = (type: string, selection: unknown) => {
        setSelectedBrand((prev) => ({ ...prev, [type]: selection }));
        if (onBrandSelect) {
            onBrandSelect(type, selection);
        }
        const confirmMessages: Record<string, string> = {
            names: `I'll use "${(selection as { name: string }).name}" as my brand name`,
            colors: `I like the "${(selection as { name: string }).name}" color palette`,
            logos: "I'll use this logo",
        };
        if (confirmMessages[type]) {
            onSend(confirmMessages[type]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
            {/* Header with gradient accent */}
            <div className="relative p-4 border-b border-zinc-800/80">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20"
                        >
                            <span className="text-sm font-bold text-black">{brandName.charAt(0)}</span>
                        </motion.div>
                        <div>
                            <h2 className="font-semibold text-white text-sm">{brandName}</h2>
                            <p className="text-xs text-zinc-500">Building your app</p>
                        </div>
                    </div>

                    {/* Session controls */}
                    <div className="flex items-center gap-2">
                        {/* Session dropdown */}
                        {sessions.length > 0 && (
                            <div className="relative">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowSessionMenu(!showSessionMenu)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 text-xs text-zinc-300 border border-zinc-700/50 transition-all"
                                >
                                    <MessageSquare className="w-3 h-3" />
                                    <span className="max-w-[60px] truncate">
                                        {sessions.find(s => s.id === activeSessionId)?.name || "Chat"}
                                    </span>
                                    <ChevronDown className={`w-3 h-3 transition-transform ${showSessionMenu ? "rotate-180" : ""}`} />
                                </motion.button>

                                <AnimatePresence>
                                    {showSessionMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                            className="absolute top-full mt-1 right-0 w-40 bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-xl z-50 overflow-hidden"
                                        >
                                            {sessions.map((session) => (
                                                <button
                                                    key={session.id}
                                                    onClick={() => {
                                                        if (session.id && onSwitchSession) {
                                                            onSwitchSession(session.id);
                                                        }
                                                        setShowSessionMenu(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 transition-colors flex items-center gap-2 ${session.id === activeSessionId ? "bg-zinc-800 text-amber-400" : "text-zinc-300"
                                                        }`}
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span className="truncate">{session.name}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* New chat button */}
                        {onNewChat && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onNewChat}
                                className="w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-400 transition-all"
                                title="New Chat"
                            >
                                <Plus className="w-4 h-4" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence mode="popLayout">
                    {messages.map((msg, index) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
                            className={msg.role === "user" ? "ml-6" : "mr-2"}
                        >
                            <div
                                className={`rounded-2xl p-4 transition-all ${msg.role === "user"
                                    ? "bg-zinc-800 border border-zinc-700/50 ml-auto"
                                    : "bg-zinc-900/80 border border-zinc-800/50"
                                    }`}
                            >
                                {/* Assistant indicator */}
                                {msg.role === "assistant" && (
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <span className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wider">AI</span>
                                    </div>
                                )}

                                {/* Render markdown for messages */}
                                <div className="text-sm prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0 text-zinc-300">{children}</p>,
                                            strong: ({ children }) => <strong className="text-amber-400 font-semibold">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                            li: ({ children }) => <li className="text-zinc-400">{children}</li>,
                                            em: ({ children }) => <em className="text-zinc-500 not-italic">{children}</em>,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>

                                {/* Brand suggestions */}
                                {msg.brandSuggestions && (
                                    <BrandSuggestions
                                        type={msg.brandSuggestions.type}
                                        suggestions={msg.brandSuggestions.data as string[]}
                                        onSelect={(sel) => handleBrandSelect(msg.brandSuggestions!.type, sel)}
                                        selectedId={
                                            selectedBrand[msg.brandSuggestions.type]
                                                ? (selectedBrand[msg.brandSuggestions.type] as { name?: string; id?: number })?.name ||
                                                (selectedBrand[msg.brandSuggestions.type] as { id?: number })?.id ||
                                                (selectedBrand[msg.brandSuggestions.type] as string)
                                                : undefined
                                        }
                                    />
                                )}

                                {/* Quick action suggestions */}
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <QuickActions
                                        actions={msg.suggestions}
                                        onAction={(action) => onSend(action)}
                                    />
                                )}

                                {/* File badges */}
                                {msg.files && Object.keys(msg.files).length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {Object.keys(msg.files).map((file) => (
                                            <motion.span
                                                key={file}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700/50 text-zinc-400"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                {file.split("/").pop()}
                                            </motion.span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Thinking indicator */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex gap-1">
                                    <motion.span
                                        className="w-2 h-2 rounded-full bg-amber-400"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                                    />
                                    <motion.span
                                        className="w-2 h-2 rounded-full bg-orange-400"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                                    />
                                    <motion.span
                                        className="w-2 h-2 rounded-full bg-amber-500"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                                    />
                                </div>
                                <span className="text-sm text-zinc-400">Thinking for {thinkingTime}s</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span>Generating your code...</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* Premium Input Area */}
            <div className="p-4 border-t border-zinc-800/80">
                <motion.div
                    className={`relative rounded-2xl transition-all duration-300 ${isFocused
                        ? "bg-zinc-800/80 border border-amber-500/30 shadow-lg shadow-amber-500/5"
                        : "bg-zinc-800/50 border border-zinc-700/50"
                        }`}
                >
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Ask a follow-up..."
                        disabled={isLoading}
                        rows={1}
                        className="w-full bg-transparent text-white placeholder:text-zinc-500 resize-none p-4 pr-14 text-sm focus:outline-none disabled:opacity-50"
                        style={{ minHeight: "56px", maxHeight: "120px" }}
                    />

                    {/* Send button */}
                    <motion.button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`absolute bottom-3 right-3 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isLoading
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                            : "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                            }`}
                    >
                        <Send className="w-4 h-4" />
                    </motion.button>
                </motion.div>

                {/* Hint text */}
                <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-xs text-zinc-600">
                        Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[10px]">Enter</kbd> to send • <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-mono text-[10px]">Shift+Enter</kbd> for new line
                    </span>
                    <span className="text-xs text-zinc-600">{input.length}/500</span>
                </div>
            </div>
        </div>
    );
}
