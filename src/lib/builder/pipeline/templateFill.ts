import { ThinkingLevel } from "@google/genai";
import type { GoogleGenAI } from "@google/genai";
import type { BrandContext, DesignTokens, GenerationQuality } from "./types";

interface TemplateFillInput {
    ai: GoogleGenAI;
    model: string;
    message: string;
    brandContext: BrandContext;
    quality: GenerationQuality;
    templateId?: string;
}

interface TemplateSections {
    hero: {
        title: string;
        subtitle: string;
        primaryCta: string;
        secondaryCta: string;
    };
    services: Array<{ title: string; description: string }>;
    about: {
        title: string;
        body: string;
    };
    contact: {
        title: string;
        email: string;
        phone: string;
        address: string;
    };
    faq: Array<{ question: string; answer: string }>;
    footer: {
        copyright: string;
        links: string[];
    };
}

interface TemplateFillOutput {
    files: Record<string, string>;
    message: string;
    designTokens: DesignTokens;
}

function extractBalancedJson(text: string): string | null {
    const firstOpen = text.indexOf("{");
    if (firstOpen === -1) return null;

    let inString = false;
    let escapeNext = false;
    let depth = 0;

    for (let i = firstOpen; i < text.length; i++) {
        const char = text[i];
        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === "\\") {
            if (inString) escapeNext = true;
            continue;
        }

        if (char === "\"") {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === "{") depth++;
            if (char === "}") {
                depth--;
                if (depth === 0) return text.slice(firstOpen, i + 1);
            }
        }
    }

    return null;
}

function getTemplateThinkingLevel(quality: GenerationQuality): ThinkingLevel {
    if (quality === "high") return ThinkingLevel.MEDIUM;
    if (quality === "balanced") return ThinkingLevel.LOW;
    return ThinkingLevel.MINIMAL;
}

function getTemplateTokens(quality: GenerationQuality): number {
    if (quality === "high") return 8192;
    if (quality === "balanced") return 4096;
    return 2048;
}

function fallbackSections(brand: BrandContext): TemplateSections {
    const name = brand.name || "Your Brand";
    const tagline = brand.tagline || "A better way to grow your business.";
    const audience = brand.validation.category?.targetAudience || "modern teams";
    const category = brand.validation.category?.primary || "services";

    return {
        hero: {
            title: `${name} helps ${audience} move faster`,
            subtitle: tagline,
            primaryCta: "Book a Demo",
            secondaryCta: "See How It Works",
        },
        services: [
            {
                title: `Strategy for ${category}`,
                description: `We map your goals to a measurable ${category} roadmap.`,
            },
            {
                title: "Execution and Delivery",
                description: "From kickoff to launch, we deliver reliable outcomes with clear milestones.",
            },
            {
                title: "Optimization",
                description: "Continuous improvements based on feedback, analytics, and market signals.",
            },
        ],
        about: {
            title: `Why teams choose ${name}`,
            body: `${name} combines practical strategy, modern design, and speed. We partner closely with clients to ship outcomes they can measure.`,
        },
        contact: {
            title: "Contact Us",
            email: "hello@example.com",
            phone: "+1 (555) 123-4567",
            address: "San Francisco, CA",
        },
        faq: [
            {
                question: "How quickly can we launch?",
                answer: "Most projects launch in 2-6 weeks depending on scope and content readiness.",
            },
            {
                question: "Do you support revisions?",
                answer: "Yes. We work in iterative cycles with review checkpoints for each milestone.",
            },
            {
                question: "Can this scale with growth?",
                answer: "Yes. The architecture is modular so you can expand features over time.",
            },
        ],
        footer: {
            copyright: `${new Date().getFullYear()} ${name}. All rights reserved.`,
            links: ["Privacy", "Terms", "Contact"],
        },
    };
}

function parseSections(text: string): TemplateSections | null {
    const candidate = extractBalancedJson(text.trim()) ?? text.trim();
    try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const hero = parsed.hero as Record<string, unknown> | undefined;
        const about = parsed.about as Record<string, unknown> | undefined;
        const contact = parsed.contact as Record<string, unknown> | undefined;
        const footer = parsed.footer as Record<string, unknown> | undefined;

        if (!hero || !about || !contact || !footer) return null;

        const services = Array.isArray(parsed.services)
            ? parsed.services
                .filter((s): s is Record<string, unknown> => typeof s === "object" && !!s)
                .map((s) => ({
                    title: String(s.title || ""),
                    description: String(s.description || ""),
                }))
            : [];

        const faq = Array.isArray(parsed.faq)
            ? parsed.faq
                .filter((s): s is Record<string, unknown> => typeof s === "object" && !!s)
                .map((s) => ({
                    question: String(s.question || ""),
                    answer: String(s.answer || ""),
                }))
            : [];

        const out: TemplateSections = {
            hero: {
                title: String(hero.title || ""),
                subtitle: String(hero.subtitle || ""),
                primaryCta: String(hero.primaryCta || "Get Started"),
                secondaryCta: String(hero.secondaryCta || "Learn More"),
            },
            services,
            about: {
                title: String(about.title || ""),
                body: String(about.body || ""),
            },
            contact: {
                title: String(contact.title || "Contact"),
                email: String(contact.email || "hello@example.com"),
                phone: String(contact.phone || ""),
                address: String(contact.address || ""),
            },
            faq,
            footer: {
                copyright: String(footer.copyright || ""),
                links: Array.isArray(footer.links) ? footer.links.map((v) => String(v)) : [],
            },
        };

        if (!out.hero.title || out.services.length === 0 || out.faq.length === 0) {
            return null;
        }

        return out;
    } catch {
        return null;
    }
}

function escapeJs(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildTemplateFiles(brand: BrandContext, sections: TemplateSections): Record<string, string> {
    const palette = brand.colorPalette;

    const dataFile = [
        "export const siteContent = {",
        `  hero: { title: "${escapeJs(sections.hero.title)}", subtitle: "${escapeJs(sections.hero.subtitle)}", primaryCta: "${escapeJs(sections.hero.primaryCta)}", secondaryCta: "${escapeJs(sections.hero.secondaryCta)}" },`,
        "  services: [",
        ...sections.services.map(
            (service) => `    { title: "${escapeJs(service.title)}", description: "${escapeJs(service.description)}" },`
        ),
        "  ],",
        `  about: { title: "${escapeJs(sections.about.title)}", body: "${escapeJs(sections.about.body)}" },`,
        `  contact: { title: "${escapeJs(sections.contact.title)}", email: "${escapeJs(sections.contact.email)}", phone: "${escapeJs(sections.contact.phone)}", address: "${escapeJs(sections.contact.address)}" },`,
        "  faq: [",
        ...sections.faq.map(
            (item) => `    { question: "${escapeJs(item.question)}", answer: "${escapeJs(item.answer)}" },`
        ),
        "  ],",
        `  footer: { copyright: "${escapeJs(sections.footer.copyright)}", links: ${JSON.stringify(sections.footer.links)} },`,
        "};",
        "",
    ].join("\n");

    const appFile = [
        'import { Hero } from "./components/Hero";',
        'import { Services } from "./components/Services";',
        'import { About } from "./components/About";',
        'import { Contact } from "./components/Contact";',
        'import { FAQ } from "./components/FAQ";',
        'import { Footer } from "./components/Footer";',
        "",
        "export default function App() {",
        "  return (",
        "    <main>",
        "      <Hero />",
        "      <Services />",
        "      <About />",
        "      <Contact />",
        "      <FAQ />",
        "      <Footer />",
        "    </main>",
        "  );",
        "}",
        "",
    ].join("\n");

    const indexFile = [
        'import React from "react";',
        'import ReactDOM from "react-dom/client";',
        'import App from "./App";',
        'import "./styles.css";',
        "",
        'ReactDOM.createRoot(document.getElementById("root")!).render(',
        "  <React.StrictMode>",
        "    <App />",
        "  </React.StrictMode>",
        ");",
        "",
    ].join("\n");

    const heroFile = [
        'import { siteContent } from "../content";',
        "",
        "export function Hero() {",
        "  const { hero } = siteContent;",
        "  return (",
        '    <section className="hero section">',
        '      <div className="container">',
        "        <h1>{hero.title}</h1>",
        "        <p>{hero.subtitle}</p>",
        '        <div className="hero-actions">',
        '          <button className="btn btn-primary">{hero.primaryCta}</button>',
        '          <button className="btn btn-secondary">{hero.secondaryCta}</button>',
        "        </div>",
        "      </div>",
        "    </section>",
        "  );",
        "}",
        "",
    ].join("\n");

    const servicesFile = [
        'import { siteContent } from "../content";',
        "",
        "export function Services() {",
        "  return (",
        '    <section className="section">',
        '      <div className="container">',
        "        <h2>Services</h2>",
        '        <div className="card-grid">',
        "          {siteContent.services.map((service) => (",
        '            <article key={service.title} className="card">',
        "              <h3>{service.title}</h3>",
        "              <p>{service.description}</p>",
        "            </article>",
        "          ))}",
        "        </div>",
        "      </div>",
        "    </section>",
        "  );",
        "}",
        "",
    ].join("\n");

    const aboutFile = [
        'import { siteContent } from "../content";',
        "",
        "export function About() {",
        "  return (",
        '    <section className="section alt">',
        '      <div className="container">',
        "        <h2>{siteContent.about.title}</h2>",
        "        <p>{siteContent.about.body}</p>",
        "      </div>",
        "    </section>",
        "  );",
        "}",
        "",
    ].join("\n");

    const contactFile = [
        'import { siteContent } from "../content";',
        "",
        "export function Contact() {",
        "  const { contact } = siteContent;",
        "  return (",
        '    <section className="section">',
        '      <div className="container">',
        "        <h2>{contact.title}</h2>",
        '        <ul className="contact-list">',
        "          <li>Email: {contact.email}</li>",
        "          <li>Phone: {contact.phone}</li>",
        "          <li>Address: {contact.address}</li>",
        "        </ul>",
        "      </div>",
        "    </section>",
        "  );",
        "}",
        "",
    ].join("\n");

    const faqFile = [
        'import { siteContent } from "../content";',
        "",
        "export function FAQ() {",
        "  return (",
        '    <section className="section alt">',
        '      <div className="container">',
        "        <h2>FAQ</h2>",
        '        <div className="faq-list">',
        "          {siteContent.faq.map((item) => (",
        '            <details key={item.question} className="faq-item">',
        "              <summary>{item.question}</summary>",
        "              <p>{item.answer}</p>",
        "            </details>",
        "          ))}",
        "        </div>",
        "      </div>",
        "    </section>",
        "  );",
        "}",
        "",
    ].join("\n");

    const footerFile = [
        'import { siteContent } from "../content";',
        "",
        "export function Footer() {",
        "  return (",
        '    <footer className="footer">',
        '      <div className="container footer-content">',
        "        <p>{siteContent.footer.copyright}</p>",
        '        <nav aria-label="Footer links">',
        "          {siteContent.footer.links.map((link) => (",
        '            <a key={link} href="#">{link}</a>',
        "          ))}",
        "        </nav>",
        "      </div>",
        "    </footer>",
        "  );",
        "}",
        "",
    ].join("\n");

    const stylesFile = [
        ":root {",
        `  --color-primary: ${palette.primary};`,
        `  --color-secondary: ${palette.secondary};`,
        `  --color-accent: ${palette.accent};`,
        `  --color-background: ${palette.background};`,
        `  --color-text: ${palette.text};`,
        '  --font-heading: "Manrope", sans-serif;',
        '  --font-body: "Space Grotesk", sans-serif;',
        "}",
        "",
        "* { box-sizing: border-box; }",
        "body {",
        "  margin: 0;",
        "  font-family: var(--font-body);",
        "  background: var(--color-background);",
        "  color: var(--color-text);",
        "  line-height: 1.6;",
        "}",
        "h1, h2, h3 { font-family: var(--font-heading); line-height: 1.2; margin: 0 0 0.75rem; }",
        "p { margin: 0; }",
        ".section { padding: 5rem 1.25rem; }",
        ".section.alt { background: color-mix(in srgb, var(--color-primary) 8%, var(--color-background)); }",
        ".container { width: min(1100px, 100%); margin: 0 auto; }",
        ".hero {",
        "  background: linear-gradient(140deg, var(--color-primary), var(--color-secondary));",
        "  color: #fff;",
        "  padding-top: 7rem;",
        "  padding-bottom: 7rem;",
        "}",
        ".hero-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap; }",
        ".btn { border: 0; border-radius: 999px; padding: 0.7rem 1.25rem; font-weight: 700; cursor: pointer; }",
        ".btn-primary { background: var(--color-accent); color: var(--color-text); }",
        ".btn-secondary { background: rgba(255,255,255,0.18); color: #fff; }",
        ".card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }",
        ".card { padding: 1rem; border-radius: 14px; background: #fff; color: #111; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }",
        ".contact-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }",
        ".faq-list { display: grid; gap: 0.75rem; }",
        ".faq-item { border: 1px solid rgba(0,0,0,0.08); border-radius: 10px; padding: 0.75rem 1rem; background: #fff; color: #111; }",
        ".footer { padding: 2rem 1.25rem; border-top: 1px solid rgba(0,0,0,0.08); }",
        ".footer-content { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; }",
        ".footer a { color: var(--color-text); text-decoration: none; margin-right: 0.75rem; }",
        "",
        "@media (max-width: 768px) {",
        "  .section { padding: 3.5rem 1rem; }",
        "  .hero { padding-top: 5rem; padding-bottom: 5rem; }",
        "}",
        "",
    ].join("\n");

    return {
        "src/index.tsx": indexFile,
        "src/App.tsx": appFile,
        "src/content.ts": dataFile,
        "src/components/Hero.tsx": heroFile,
        "src/components/Services.tsx": servicesFile,
        "src/components/About.tsx": aboutFile,
        "src/components/Contact.tsx": contactFile,
        "src/components/FAQ.tsx": faqFile,
        "src/components/Footer.tsx": footerFile,
        "src/styles.css": stylesFile,
    };
}

async function generateSections(input: TemplateFillInput): Promise<TemplateSections> {
    const { ai, model, message, brandContext, quality, templateId } = input;
    const fallback = fallbackSections(brandContext);

    const prompt = [
        "Generate content for a business landing page template.",
        "Return ONLY valid JSON in this shape:",
        "{",
        '  "hero": {"title": string, "subtitle": string, "primaryCta": string, "secondaryCta": string},',
        '  "services": [{"title": string, "description": string}],',
        '  "about": {"title": string, "body": string},',
        '  "contact": {"title": string, "email": string, "phone": string, "address": string},',
        '  "faq": [{"question": string, "answer": string}],',
        '  "footer": {"copyright": string, "links": string[]}',
        "}",
        `Brand context: ${JSON.stringify(brandContext)}`,
        `User prompt: ${message}`,
        `Template ID: ${templateId || "business-default"}`,
        "Constraints: services length 3, faq length 3, no placeholder lorem ipsum.",
    ].join("\n");

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                thinkingConfig: {
                    thinkingLevel: getTemplateThinkingLevel(quality),
                },
                temperature: 0.7,
                maxOutputTokens: getTemplateTokens(quality),
            },
        });

        const parsed = parseSections(response.text || "");
        if (parsed) {
            return parsed;
        }
    } catch (error) {
        console.warn("Template content generation failed, using fallback sections:", error);
    }

    return fallback;
}

export async function runTemplateFill(input: TemplateFillInput): Promise<TemplateFillOutput> {
    const sections = await generateSections(input);
    const files = buildTemplateFiles(input.brandContext, sections);
    const designTokens: DesignTokens = {
        colors: [
            input.brandContext.colorPalette.primary,
            input.brandContext.colorPalette.secondary,
            input.brandContext.colorPalette.accent,
            input.brandContext.colorPalette.background,
            input.brandContext.colorPalette.text,
        ],
        fonts: ["Manrope", "Space Grotesk"],
    };

    return {
        files,
        message: `Created a deterministic ${input.templateId || "business-default"} template with generated content blocks.`,
        designTokens,
    };
}
