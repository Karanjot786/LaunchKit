"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { createProject } from "@/lib/firebase";
import { AuthModal } from "@/components/landing/AuthModal";
import { Sparkles, Zap, Globe, Palette, Code, Rocket } from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationData, setValidationData] = useState<Record<string, unknown> | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for pending idea from sessionStorage
    const pendingIdea = sessionStorage.getItem("pending_idea");
    if (pendingIdea) {
      setIdea(pendingIdea);
    }
  }, []);

  // Background validation (debounced)
  useEffect(() => {
    if (idea.length < 30) {
      setValidationData(null);
      return;
    }

    const timer = setTimeout(async () => {
      setValidating(true);
      try {
        const res = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idea }),
        });
        const data = await res.json();
        if (data.success) {
          setValidationData(data.data);
        }
      } catch (err) {
        console.error("Background validation error:", err);
      } finally {
        setValidating(false);
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [idea]);

  const handleStartBuilding = useCallback(async () => {
    if (!idea.trim()) return;

    if (!user) {
      // Save state and show auth modal
      sessionStorage.setItem("pending_idea", idea);
      if (validationData) {
        sessionStorage.setItem("pending_validation", JSON.stringify(validationData));
      }
      setShowAuthModal(true);
      return;
    }

    // Create project and redirect
    setCreating(true);
    try {
      const projectId = await createProject({
        userId: user.uid,
        name: "Untitled Project",
        tagline: "",
        idea,
        logo: null,
        colorPalette: {
          primary: "#6366F1",
          secondary: "#818CF8",
          accent: "#A855F7",
          background: "#FAFAFA",
          text: "#18181B",
        },
        validation: validationData || {},
        sandboxId: null,
        sandboxUrl: null,
        files: {},
      });

      // Clear pending data
      sessionStorage.removeItem("pending_idea");
      sessionStorage.removeItem("pending_validation");

      router.push(`/builder/${projectId}`);
    } catch (err) {
      console.error("Failed to create project:", err);
      setCreating(false);
    }
  }, [idea, user, validationData, router]);

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    // Give auth state time to update, then create project
    setTimeout(() => {
      handleStartBuilding();
    }, 500);
  }, [handleStartBuilding]);

  const features = [
    { icon: Sparkles, title: "AI Validation", desc: "Instant market research & validation" },
    { icon: Palette, title: "Brand Generation", desc: "Names, colors, logos in seconds" },
    { icon: Code, title: "Live Builder", desc: "AI-powered code generation" },
    { icon: Globe, title: "One-Click Deploy", desc: "Publish to the web instantly" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Background effects */}
      {mounted && (
        <>
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.1),transparent_50%)]" />
        </>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">LaunchPad</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 hidden sm:block">Powered by Gemini 3</span>
            {user ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Dashboard →
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-400 mb-8">
              <Zap className="w-4 h-4 text-yellow-400" />
              From idea to launch in 10 minutes
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                Turn Your Idea Into a
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Live Website
              </span>
            </h1>

            <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto">
              Describe your startup idea and watch AI validate it, create your brand,
              and build your website — all in one seamless experience.
            </p>
          </motion.div>

          {/* Chat Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your startup idea... e.g., 'A fitness app that uses AI to create personalized workout plans and tracks progress with gamification'"
                className="w-full h-32 bg-transparent text-white placeholder-zinc-500 p-5 resize-none focus:outline-none text-lg"
              />

              <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800/50">
                <div className="flex items-center gap-3">
                  {validating && (
                    <span className="flex items-center gap-2 text-sm text-cyan-400">
                      <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  )}
                  {!validating && validationData && (
                    <span className="flex items-center gap-2 text-sm text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      Validated
                    </span>
                  )}
                  {!validating && !validationData && idea.length > 10 && (
                    <span className="text-sm text-zinc-500">
                      {30 - idea.length > 0 ? `${30 - idea.length} more chars for validation` : ""}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleStartBuilding}
                  disabled={!idea.trim() || creating}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Start Building
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Hint */}
            <p className="mt-4 text-sm text-zinc-600">
              No sign up required to start • Sign in to save your project
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-center mb-16"
          >
            Everything you need to launch
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-500">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-6">
              Ready to launch your idea?
            </h2>
            <p className="text-zinc-400 mb-8">
              Join thousands of entrepreneurs who&apos;ve turned their ideas into reality with LaunchPad.
            </p>
            <button
              onClick={() => document.querySelector("textarea")?.focus()}
              className="inline-flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 font-medium px-8 py-4 rounded-xl transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Get Started — It&apos;s Free
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cyan-400" />
            <span className="font-medium">LaunchPad</span>
          </div>
          <p className="text-sm text-zinc-500">
            Built with Gemini 3 • Google AI Hackathon
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </main>
  );
}
