"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Components
import { IdeaInput } from "@/components/IdeaInput";
import { LoadingState } from "@/components/LoadingState";
import { ValidationResults } from "@/components/ValidationResults";
import { NameSelector } from "@/components/NameSelector";
import { ColorPaletteSelector } from "@/components/ColorPaletteSelector";
import { LogoSelector } from "@/components/LogoSelector";
import { LaunchReady } from "@/components/LaunchReady";

type Step =
  | "idea"
  | "validating"
  | "validation-complete"
  | "naming"
  | "names-ready"
  | "generating-colors"
  | "colors-ready"
  | "generating-logos"
  | "logos-ready"
  | "generating-content"
  | "complete";

interface ValidationResult {
  category: {
    primary: string;
    secondary: string[];
    targetAudience: string;
    keywords: string[];
  };
  community: {
    posts: { title: string; subreddit: string; score: number; numComments: number }[];
    totalEngagement: number;
    sentiment: "positive" | "mixed" | "negative";
    painPoints: string[];
  };
  market: {
    size: string;
    growth: string;
    competitors: { name: string; description: string }[];
  };
  scores: {
    viability: number;
    painPointStrength: number;
    demandLevel: number;
    competitionIntensity: number;
  };
  verdict: string;
  recommendation: "proceed" | "pivot" | "reconsider";
  opportunities: string[];
  risks: string[];
}

interface BrandName {
  name: string;
  tagline: string;
  reasoning: string;
  domains?: { domain: string; available: boolean }[];
}

interface ColorPalette {
  id: number;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  mood: string;
}

interface Logo {
  id: number;
  style: string;
  image: string;
}

interface LandingContent {
  hero: { headline: string; subheadline: string; cta: string };
  features: { title: string; description: string; icon: string }[];
  footer: { tagline: string; copyright: string };
}

export default function Home() {
  const [idea, setIdea] = useState("");
  const [step, setStep] = useState<Step>("idea");
  const [progress, setProgress] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [names, setNames] = useState<BrandName[]>([]);
  const [selectedName, setSelectedName] = useState<BrandName | null>(null);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const stepConfig = [
    { id: "idea", label: "Describe", icon: "✦" },
    { id: "validate", label: "Validate", icon: "◎" },
    { id: "brand", label: "Brand", icon: "◇" },
    { id: "colors", label: "Colors", icon: "◆" },
    { id: "design", label: "Design", icon: "□" },
    { id: "launch", label: "Launch", icon: "★" },
  ];

  const getStepIndex = (s: Step): number => {
    const map: Record<Step, number> = {
      "idea": 0,
      "validating": 1,
      "validation-complete": 1,
      "naming": 2,
      "names-ready": 2,
      "generating-colors": 3,
      "colors-ready": 3,
      "generating-logos": 4,
      "logos-ready": 4,
      "generating-content": 5,
      "complete": 5,
    };
    return map[s];
  };

  // Step 1: Validate idea
  async function handleValidate() {
    if (!idea.trim()) return;
    setError(null);
    setStep("validating");
    setProgress(8);
    setLoadingMessage("Analyzing with Reddit & Google Search...");

    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.details);

      setValidation(data.data);
      setProgress(25);
      setStep("validation-complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
      setStep("idea");
    }
  }

  // Step 2: Generate names
  async function handleContinueToNaming() {
    setStep("naming");
    setProgress(35);
    setLoadingMessage("Creating brand names for your audience...");

    try {
      const res = await fetch("/api/brand/names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          keywords: validation?.category.keywords || [],
          validation: validation ? {
            category: validation.category.primary,
            targetAudience: validation.category.targetAudience,
            keywords: validation.category.keywords,
            painPoints: validation.community.painPoints,
            opportunities: validation.opportunities,
          } : undefined
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setNames(data.data);
      setProgress(45);
      setStep("names-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Name generation failed");
    }
  }

  // Step 3: Select name and generate color palettes
  async function handleSelectName(name: BrandName) {
    setSelectedName(name);
    setStep("generating-colors");
    setProgress(50);
    setLoadingMessage("Generating color palettes...");

    try {
      const res = await fetch("/api/brand/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: name.name,
          category: validation?.category.primary,
          targetAudience: validation?.category.targetAudience,
          tagline: name.tagline,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setPalettes(data.data.palettes);
      setProgress(55);
      setStep("colors-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Color generation failed");
    }
  }

  // Step 4: Select palette and generate logos
  async function handleSelectPalette(palette: ColorPalette) {
    setSelectedPalette(palette);
    setStep("generating-logos");
    setProgress(65);
    setLoadingMessage("Generating logos with your colors...");

    try {
      const res = await fetch("/api/brand/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: selectedName!.name,
          category: validation?.category.primary,
          tagline: selectedName!.tagline,
          colorPalette: {
            primary: palette.colors.primary,
            secondary: palette.colors.secondary,
            accent: palette.colors.accent,
          },
          count: 4
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setLogos(data.data.logos);
      setProgress(75);
      setStep("logos-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo generation failed");
    }
  }

  // Step 5: Select logo and navigate to builder
  async function handleSelectLogo(logo: Logo) {
    setSelectedLogo(logo.image);
    setProgress(100);
    setLoadingMessage("Opening builder...");

    // Save brand context to localStorage for builder
    const brandContext = {
      name: selectedName!.name,
      tagline: selectedName!.tagline,
      logo: logo.image,
      colorPalette: selectedPalette?.colors || {
        primary: "#6366F1",
        secondary: "#818CF8",
        accent: "#A855F7",
        background: "#FAFAFA",
        text: "#18181B",
      },
      validation: {
        category: {
          primary: validation?.category.primary || "Tech",
          targetAudience: validation?.category.targetAudience || "General users",
          keywords: validation?.category.keywords || [],
        },
        community: {
          painPoints: validation?.community.painPoints || [],
        },
        opportunities: validation?.opportunities || [],
      },
      idea,
    };

    localStorage.setItem("launchpad_brand_context", JSON.stringify(brandContext));

    // Navigate to builder
    window.location.href = "/builder";
  }

  // Actions
  function handlePreview() {
    if (!selectedName || !content) return;
    const html = generateHTML(selectedName, content, selectedLogo, selectedPalette);
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  function handleDownload() {
    if (!selectedName || !selectedLogo) return;
    const link = document.createElement("a");
    link.href = selectedLogo;
    link.download = `${selectedName.name.toLowerCase()}-logo.png`;
    link.click();
  }

  function handleDeploy() {
    alert("Firebase deploy coming soon!");
  }

  function generateHTML(brand: BrandName, content: LandingContent, logoSrc: string | null, palette: ColorPalette | null): string {
    const primary = palette?.colors.primary || "#6366f1";
    const accent = palette?.colors.accent || "#a855f7";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:#fafafa;color:#18181b;line-height:1.6}.container{max-width:1200px;margin:0 auto;padding:0 24px}header{padding:20px 0;position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);z-index:100}.header-content{display:flex;justify-content:space-between;align-items:center}.logo{display:flex;align-items:center;gap:10px;font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:700;color:${primary};text-decoration:none}.logo img{width:40px;height:40px;border-radius:10px}.nav-cta{background:#18181b;color:#fff;padding:10px 24px;border-radius:10px;text-decoration:none;font-weight:500}.hero{min-height:100vh;display:flex;align-items:center;padding-top:80px}.hero-content{text-align:center;max-width:800px;margin:0 auto}.hero h1{font-family:'Outfit',sans-serif;font-size:clamp(2.5rem,5vw,4rem);font-weight:800;line-height:1.1;margin-bottom:20px;background:linear-gradient(135deg,${primary},${accent});-webkit-background-clip:text;-webkit-text-fill-color:transparent}.hero p{font-size:1.25rem;color:#71717a;margin-bottom:32px}.hero-cta{display:inline-block;background:${primary};color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:600}.features{padding:100px 0;background:#fff}.section-title{font-family:'Outfit',sans-serif;font-size:2.5rem;font-weight:700;text-align:center;margin-bottom:60px}.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:32px}.feature-card{background:#fafafa;padding:32px;border-radius:16px;border-left:4px solid ${primary}}.feature-icon{font-size:2.5rem;margin-bottom:16px}.feature-card h3{font-family:'Outfit',sans-serif;font-size:1.25rem;font-weight:600;margin-bottom:8px}footer{padding:60px 0;background:#18181b;color:#fff;text-align:center}</style>
</head>
<body>
  <header><div class="container header-content"><a href="#" class="logo">${logoSrc ? `<img src="${logoSrc}" alt="${brand.name}">` : ''}${brand.name}</a><a href="#" class="nav-cta">${content.hero.cta}</a></div></header>
  <section class="hero"><div class="container hero-content"><h1>${content.hero.headline}</h1><p>${content.hero.subheadline}</p><a href="#" class="hero-cta">${content.hero.cta}</a></div></section>
  <section class="features"><div class="container"><h2 class="section-title">Features</h2><div class="features-grid">${content.features.map(f => `<div class="feature-card"><div class="feature-icon">${f.icon}</div><h3>${f.title}</h3><p>${f.description}</p></div>`).join('')}</div></div></section>
  <footer><div class="container"><p>${content.footer.tagline}</p></div></footer>
</body>
</html>`;
  }

  const currentStepIndex = getStepIndex(step);

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900 overflow-hidden relative">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        :root { --font-sans: 'DM Sans', system-ui, sans-serif; --font-display: 'Outfit', system-ui, sans-serif; }
        body { font-family: var(--font-sans); }
        .font-display { font-family: var(--font-display); }
        .gradient-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.6; pointer-events: none; }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.8); }
      `}</style>

      {/* Background orbs */}
      {mounted && (
        <>
          <motion.div className="gradient-orb w-[600px] h-[600px] -top-48 -right-48" style={{ background: "radial-gradient(circle, rgba(196,181,253,0.5) 0%, transparent 70%)" }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 12, repeat: Infinity }} />
          <motion.div className="gradient-orb w-[500px] h-[500px] top-1/3 -left-32" style={{ background: "radial-gradient(circle, rgba(165,243,252,0.4) 0%, transparent 70%)" }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 15, repeat: Infinity, delay: 2 }} />
        </>
      )}

      {/* Header */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-sm font-bold">L</span>
            </div>
            <span className="font-display font-semibold text-lg text-zinc-800">LaunchPad</span>
          </div>
          <Badge variant="secondary" className="bg-white border border-zinc-200 text-zinc-600 text-xs">Powered by Gemini 3</Badge>
        </div>
      </motion.header>

      {/* Progress bar */}
      {step !== "idea" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed top-16 left-0 right-0 z-40 px-6 py-3 bg-white/90 backdrop-blur-sm border-b border-zinc-100">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              {stepConfig.map((s, i) => (
                <div key={s.id} className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${i < currentStepIndex ? "bg-indigo-500 text-white" : i === currentStepIndex ? "bg-white border-2 border-indigo-500 text-indigo-500 animate-pulse" : "bg-zinc-100 text-zinc-400"
                    }`}>{i < currentStepIndex ? "✓" : s.icon}</div>
                  <span className={`text-[10px] mt-1 ${i <= currentStepIndex ? "text-zinc-700" : "text-zinc-400"}`}>{s.label}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-1 bg-zinc-100" />
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <div className="relative min-h-screen flex items-center justify-center px-6 py-32">
        <AnimatePresence mode="wait">
          {step === "idea" && (
            <IdeaInput key="idea" idea={idea} setIdea={setIdea} onSubmit={handleValidate} error={error} />
          )}

          {step === "validating" && (
            <LoadingState key="validating" step="Validating Your Idea" message={loadingMessage} icon="search" />
          )}

          {step === "validation-complete" && validation && (
            <ValidationResults key="validation" validation={validation} onContinue={handleContinueToNaming} />
          )}

          {step === "naming" && (
            <LoadingState key="naming" step="Generating Brand Names" message={loadingMessage} icon="sparkle" />
          )}

          {step === "names-ready" && (
            <NameSelector key="names" names={names} onSelect={handleSelectName} />
          )}

          {step === "generating-colors" && (
            <LoadingState key="gen-colors" step="Creating Color Palettes" message={loadingMessage} icon="sparkle" />
          )}

          {step === "colors-ready" && selectedName && (
            <ColorPaletteSelector key="colors" brandName={selectedName.name} palettes={palettes} onSelect={handleSelectPalette} />
          )}

          {step === "generating-logos" && (
            <LoadingState key="gen-logos" step="Designing Your Logos" message={loadingMessage} icon="sparkle" />
          )}

          {step === "logos-ready" && selectedName && (
            <LogoSelector key="logos" brandName={selectedName.name} logos={logos} onSelect={handleSelectLogo} />
          )}

          {step === "generating-content" && (
            <LoadingState key="gen-content" step="Building Your Website" message={loadingMessage} icon="rocket" />
          )}

          {step === "complete" && selectedName && (
            <LaunchReady key="complete" brand={selectedName} logo={selectedLogo} onPreview={handlePreview} onDeploy={handleDeploy} onDownload={handleDownload} />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
