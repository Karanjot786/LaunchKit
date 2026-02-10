"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SurveyQuestion {
    id: string;
    type: "rating" | "text" | "choice";
    question: string;
    options?: string[];
}

interface SurveyFormProps {
    brandName?: string;
    questions?: SurveyQuestion[];
    onSubmit?: (responses: Record<string, string | number>) => Promise<void>;
}

const defaultQuestions: SurveyQuestion[] = [
    {
        id: "interest",
        type: "rating",
        question: "How interested are you in this product?",
    },
    {
        id: "problem",
        type: "choice",
        question: "What problem would this solve for you?",
        options: ["Save time", "Save money", "Improve productivity", "Other"],
    },
    {
        id: "feedback",
        type: "text",
        question: "Any additional feedback or features you'd like to see?",
    },
];

export function SurveyForm({
    brandName = "LaunchKit",
    questions = defaultQuestions,
    onSubmit
}: SurveyFormProps) {
    const [responses, setResponses] = useState<Record<string, string | number>>({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [status, setStatus] = useState<"active" | "submitting" | "complete">("active");

    function handleResponse(questionId: string, value: string | number) {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    }

    async function handleNext() {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        } else {
            // Submit
            setStatus("submitting");
            try {
                if (onSubmit) {
                    await onSubmit(responses);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                setStatus("complete");
            } catch {
                setStatus("active");
            }
        }
    }

    const question = questions[currentQuestion];
    const hasAnswer = responses[question?.id] !== undefined;

    if (status === "complete") {
        return (
            <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-xl shadow-zinc-200/50 rounded-2xl overflow-hidden">
                <CardContent className="p-8 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                    >
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-2xl">✓</span>
                        </div>
                        <h3 className="font-display font-semibold text-xl text-zinc-800 mb-2">
                            Thank you!
                        </h3>
                        <p className="text-zinc-500">
                            Your feedback helps us build a better {brandName}.
                        </p>
                    </motion.div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/70 backdrop-blur-xl border-0 shadow-xl shadow-zinc-200/50 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
                {/* Progress */}
                <div className="flex items-center gap-1 mb-6">
                    {questions.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${i <= currentQuestion ? "bg-indigo-500" : "bg-zinc-200"
                                }`}
                        />
                    ))}
                </div>

                {/* Question */}
                <motion.div
                    key={question.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    <Label className="text-base font-medium text-zinc-800 mb-4 block">
                        {question.question}
                    </Label>

                    {/* Rating */}
                    {question.type === "rating" && (
                        <div className="flex gap-2 justify-center my-6">
                            {[1, 2, 3, 4, 5].map(rating => (
                                <button
                                    key={rating}
                                    onClick={() => handleResponse(question.id, rating)}
                                    className={`w-12 h-12 rounded-xl text-lg font-medium transition-all ${responses[question.id] === rating
                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                        }`}
                                >
                                    {rating}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Choice */}
                    {question.type === "choice" && (
                        <div className="space-y-2 my-4">
                            {question.options?.map(option => (
                                <button
                                    key={option}
                                    onClick={() => handleResponse(question.id, option)}
                                    className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-all ${responses[question.id] === option
                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Text */}
                    {question.type === "text" && (
                        <Textarea
                            value={(responses[question.id] as string) || ""}
                            onChange={(e) => handleResponse(question.id, e.target.value)}
                            placeholder="Your thoughts..."
                            className="bg-zinc-50 border-zinc-200 focus:border-indigo-500 rounded-xl min-h-[100px] my-4"
                        />
                    )}
                </motion.div>

                {/* Actions */}
                <div className="flex justify-between items-center mt-6">
                    <span className="text-sm text-zinc-400">
                        {currentQuestion + 1} of {questions.length}
                    </span>
                    <Button
                        onClick={handleNext}
                        disabled={!hasAnswer && question.type !== "text"}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-6 rounded-xl disabled:opacity-40"
                    >
                        {status === "submitting" ? (
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                                ◌
                            </motion.span>
                        ) : currentQuestion < questions.length - 1 ? (
                            "Next →"
                        ) : (
                            "Submit"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
