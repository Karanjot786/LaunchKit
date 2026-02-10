"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { createProject } from "@/lib/firebase";
import { AuthModal } from "@/components/landing/AuthModal";
import { Zap, Sparkles, Globe, Palette, Code, Rocket } from "lucide-react";
import HeroSection from "@/components/sections/HeroSection";
import Header from "@/components/sections/Header";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationData, setValidationData] = useState<Record<string, unknown> | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [validationMode, setValidationMode] = useState<"quick" | "deep">("quick");
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");

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
          body: JSON.stringify({ idea, mode: validationMode, model: selectedModel }),
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
        validationMode,
        selectedModel,
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
      <Header
        user={user}
        onSignIn={() => setShowAuthModal(true)}
        onDashboard={() => router.push("/dashboard")}
      />

      {/* Hero Section */}
      <HeroSection
        idea={idea}
        setIdea={setIdea}
        validating={validating}
        validationData={validationData}
        creating={creating}
        onStartBuilding={handleStartBuilding}
        validationMode={validationMode}
        setValidationMode={setValidationMode}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

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
              Join thousands of entrepreneurs who&apos;ve turned their ideas into reality with LaunchKit.
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
            <span className="font-medium">LaunchKit</span>
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
    </main >
  );
}
