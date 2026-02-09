/**
 * Preview Renderer
 * 
 * Renders a UI Tree (JSON) as React components for instant preview.
 * Based on Vercel JSON-Render approach - no compilation needed.
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Check, Star, ChevronDown, ArrowRight,
    Twitter, Github, Linkedin, Instagram, Youtube,
    Sparkles, Zap, Shield, Clock, Users, TrendingUp
} from "lucide-react";
import { UITree, UIElement, ComponentType } from "@/lib/ui-catalog";

// =============================================================================
// TYPES
// =============================================================================

export interface BrandColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

interface ComponentProps {
    element: UIElement;
    children?: React.ReactNode;
    colors: BrandColors;
}

// =============================================================================
// ICON MAPPING
// =============================================================================

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    sparkles: Sparkles,
    zap: Zap,
    shield: Shield,
    clock: Clock,
    users: Users,
    trending: TrendingUp,
    check: Check,
    star: Star,
    arrow: ArrowRight,
};

function getIcon(name?: string, className?: string) {
    if (!name) return null;

    // Check for emoji
    if (/\p{Emoji}/u.test(name)) {
        return <span className={className}>{name}</span>;
    }

    // Check for mapped icon
    const Icon = iconMap[name.toLowerCase()];
    if (Icon) {
        return <Icon className={className} />;
    }

    // Fallback to text
    return <span className={className}>{name}</span>;
}

// =============================================================================
// COMPONENT REGISTRY
// =============================================================================

const componentRegistry: Record<ComponentType, React.FC<ComponentProps>> = {
    // =========================================================================
    // LAYOUT COMPONENTS
    // =========================================================================
    Hero: ({ element, colors }) => {
        const props = element.props as { headline: string; subheadline?: string; ctaText?: string; backgroundStyle?: string };
        return (
            <section
                className="relative py-24 px-6 text-center overflow-hidden"
                style={{
                    background: props.backgroundStyle === "gradient"
                        ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                        : colors.primary,
                    color: "#ffffff"
                }}
            >
                <div className="relative z-10 max-w-4xl mx-auto">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
                    >
                        {props.headline}
                    </motion.h1>
                    {props.subheadline && (
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl md:text-2xl opacity-90 mb-10 max-w-2xl mx-auto"
                        >
                            {props.subheadline}
                        </motion.p>
                    )}
                    {props.ctaText && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-4 rounded-lg font-semibold text-lg shadow-lg"
                            style={{ backgroundColor: colors.accent, color: colors.text }}
                        >
                            {props.ctaText}
                        </motion.button>
                    )}
                </div>
            </section>
        );
    },

    Section: ({ element, children, colors }) => {
        const props = element.props as { title?: string; subtitle?: string; centered?: boolean; background?: string; padding?: string };
        const paddingClass = props.padding === "sm" ? "py-12" : props.padding === "lg" ? "py-24" : "py-16";

        let bgStyle: React.CSSProperties = { backgroundColor: colors.background };
        if (props.background === "primary") bgStyle = { backgroundColor: colors.primary, color: "#fff" };
        if (props.background === "dark") bgStyle = { backgroundColor: "#0a0a0a", color: "#fff" };
        if (props.background === "gradient") bgStyle = { background: `linear-gradient(180deg, ${colors.background} 0%, ${colors.primary}10 100%)` };

        return (
            <section className={`${paddingClass} px-6`} style={bgStyle}>
                <div className={`max-w-6xl mx-auto ${props.centered ? "text-center" : ""}`}>
                    {props.title && (
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">{props.title}</h2>
                    )}
                    {props.subtitle && (
                        <p className="text-lg opacity-80 mb-12 max-w-2xl mx-auto">{props.subtitle}</p>
                    )}
                    {children}
                </div>
            </section>
        );
    },

    Grid: ({ element, children }) => {
        const props = element.props as { columns?: string; gap?: string };
        const cols = props.columns === "2" ? "md:grid-cols-2" : props.columns === "4" ? "md:grid-cols-4" : "md:grid-cols-3";
        const gap = props.gap === "sm" ? "gap-4" : props.gap === "lg" ? "gap-8" : "gap-6";

        return (
            <div className={`grid grid-cols-1 ${cols} ${gap}`}>
                {children}
            </div>
        );
    },

    Stack: ({ element, children }) => {
        const props = element.props as { direction?: string; gap?: string; align?: string; justify?: string };
        const dir = props.direction === "horizontal" ? "flex-row" : "flex-col";
        const gap = props.gap === "sm" ? "gap-2" : props.gap === "lg" ? "gap-6" : "gap-4";
        const align = props.align === "center" ? "items-center" : props.align === "end" ? "items-end" : "items-start";
        const justify = props.justify === "center" ? "justify-center" : props.justify === "between" ? "justify-between" : "justify-start";

        return (
            <div className={`flex ${dir} ${gap} ${align} ${justify}`}>
                {children}
            </div>
        );
    },

    Container: ({ element, children }) => {
        const props = element.props as { maxWidth?: string; centered?: boolean };
        const width = {
            sm: "max-w-2xl",
            md: "max-w-4xl",
            lg: "max-w-6xl",
            xl: "max-w-7xl",
            full: "w-full",
        }[props.maxWidth || "lg"];

        return (
            <div className={`${width} ${props.centered ? "mx-auto" : ""} px-4`}>
                {children}
            </div>
        );
    },

    Divider: ({ element, colors }) => {
        const props = element.props as { variant?: string; spacing?: string };
        const spacing = props.spacing === "sm" ? "my-4" : props.spacing === "lg" ? "my-12" : "my-8";

        return (
            <hr
                className={`${spacing} border-0 h-px`}
                style={{
                    background: props.variant === "gradient"
                        ? `linear-gradient(90deg, transparent, ${colors.primary}40, transparent)`
                        : colors.text + "20"
                }}
            />
        );
    },

    // =========================================================================
    // CONTENT COMPONENTS
    // =========================================================================
    FeatureCard: ({ element, colors }) => {
        const props = element.props as { title: string; description: string; icon?: string; highlighted?: boolean };

        return (
            <motion.div
                whileHover={{ y: -4 }}
                className={`p-6 rounded-xl transition-all ${props.highlighted ? "ring-2" : ""}`}
                style={{
                    backgroundColor: colors.background,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    borderColor: props.highlighted ? colors.accent : "transparent",
                }}
            >
                {props.icon && (
                    <div
                        className="w-12 h-12 mb-4 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: colors.primary + "15", color: colors.primary }}
                    >
                        {getIcon(props.icon)}
                    </div>
                )}
                <h3 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>{props.title}</h3>
                <p className="opacity-70" style={{ color: colors.text }}>{props.description}</p>
            </motion.div>
        );
    },

    PricingCard: ({ element, colors }) => {
        const props = element.props as { name: string; price: string; period?: string; features: string[]; ctaText?: string; popular?: boolean };

        return (
            <motion.div
                whileHover={{ y: -4 }}
                className={`p-8 rounded-2xl relative ${props.popular ? "ring-2 scale-105" : ""}`}
                style={{
                    backgroundColor: colors.background,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                    borderColor: props.popular ? colors.accent : "transparent",
                }}
            >
                {props.popular && (
                    <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-sm font-medium text-white"
                        style={{ backgroundColor: colors.accent }}
                    >
                        Popular
                    </span>
                )}
                <h3 className="text-xl font-semibold mb-2" style={{ color: colors.text }}>{props.name}</h3>
                <div className="mb-6">
                    <span className="text-4xl font-bold" style={{ color: colors.primary }}>{props.price}</span>
                    {props.period && <span className="opacity-60 ml-1">{props.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                    {props.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <Check className="w-5 h-5" style={{ color: colors.accent }} />
                            <span style={{ color: colors.text }}>{feature}</span>
                        </li>
                    ))}
                </ul>
                <button
                    className="w-full py-3 rounded-lg font-semibold transition-colors"
                    style={{
                        backgroundColor: props.popular ? colors.primary : "transparent",
                        color: props.popular ? "#fff" : colors.primary,
                        border: props.popular ? "none" : `2px solid ${colors.primary}`,
                    }}
                >
                    {props.ctaText || "Get Started"}
                </button>
            </motion.div>
        );
    },

    TestimonialCard: ({ element, colors }) => {
        const props = element.props as { quote: string; author: string; role?: string; company?: string; rating?: number };

        return (
            <div
                className="p-6 rounded-xl"
                style={{ backgroundColor: colors.background, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
            >
                {props.rating && (
                    <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className="w-4 h-4"
                                fill={i < props.rating! ? colors.accent : "transparent"}
                                style={{ color: colors.accent }}
                            />
                        ))}
                    </div>
                )}
                <p className="mb-4 italic" style={{ color: colors.text }}>&ldquo;{props.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white"
                        style={{ backgroundColor: colors.primary }}
                    >
                        {props.author[0]}
                    </div>
                    <div>
                        <p className="font-semibold" style={{ color: colors.text }}>{props.author}</p>
                        {(props.role || props.company) && (
                            <p className="text-sm opacity-60">{[props.role, props.company].filter(Boolean).join(" at ")}</p>
                        )}
                    </div>
                </div>
            </div>
        );
    },

    StatsCard: ({ element, colors }) => {
        const props = element.props as { value: string; label: string; icon?: string };

        return (
            <div className="text-center p-4">
                <p className="text-4xl font-bold mb-1" style={{ color: colors.primary }}>{props.value}</p>
                <p className="opacity-70" style={{ color: colors.text }}>{props.label}</p>
            </div>
        );
    },

    FAQItem: ({ element, colors }) => {
        const props = element.props as { question: string; answer: string; defaultOpen?: boolean };
        const [open, setOpen] = React.useState(props.defaultOpen || false);

        return (
            <div
                className="border-b py-4"
                style={{ borderColor: colors.text + "20" }}
            >
                <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex justify-between items-center text-left font-semibold"
                    style={{ color: colors.text }}
                >
                    {props.question}
                    <ChevronDown className={`w-5 h-5 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                    <p className="mt-3 opacity-70" style={{ color: colors.text }}>{props.answer}</p>
                )}
            </div>
        );
    },

    BenefitItem: ({ element, colors }) => {
        const props = element.props as { text: string; icon?: string };

        return (
            <div className="flex items-center gap-3">
                <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.accent + "20", color: colors.accent }}
                >
                    {props.icon ? getIcon(props.icon, "w-4 h-4") : <Check className="w-4 h-4" />}
                </div>
                <span style={{ color: colors.text }}>{props.text}</span>
            </div>
        );
    },

    // =========================================================================
    // ACTION COMPONENTS
    // =========================================================================
    Button: ({ element, colors }) => {
        const props = element.props as { label: string; variant?: string; size?: string; fullWidth?: boolean };
        const sizeClass = props.size === "sm" ? "px-4 py-2 text-sm" : props.size === "lg" ? "px-8 py-4 text-lg" : "px-6 py-3";

        let style: React.CSSProperties = { backgroundColor: colors.primary, color: "#fff" };
        if (props.variant === "secondary") style = { backgroundColor: colors.secondary, color: "#fff" };
        if (props.variant === "outline") style = { backgroundColor: "transparent", color: colors.primary, border: `2px solid ${colors.primary}` };
        if (props.variant === "ghost") style = { backgroundColor: "transparent", color: colors.primary };

        return (
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`${sizeClass} ${props.fullWidth ? "w-full" : ""} rounded-lg font-semibold transition-colors`}
                style={style}
            >
                {props.label}
            </motion.button>
        );
    },

    EmailCapture: ({ element, colors }) => {
        const props = element.props as { placeholder?: string; buttonText?: string; helperText?: string };

        return (
            <div className="w-full max-w-md">
                <div className="flex gap-2">
                    <input
                        type="email"
                        placeholder={props.placeholder || "Enter your email"}
                        className="flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2"
                        style={{
                            borderColor: colors.text + "30",
                            backgroundColor: colors.background,
                            color: colors.text,
                        }}
                    />
                    <button
                        className="px-6 py-3 rounded-lg font-semibold text-white whitespace-nowrap"
                        style={{ backgroundColor: colors.primary }}
                    >
                        {props.buttonText || "Subscribe"}
                    </button>
                </div>
                {props.helperText && (
                    <p className="mt-2 text-sm opacity-60" style={{ color: colors.text }}>{props.helperText}</p>
                )}
            </div>
        );
    },

    CTABanner: ({ element, colors }) => {
        const props = element.props as { headline: string; description?: string; buttonText?: string; variant?: string };

        return (
            <section
                className="py-16 px-6"
                style={{
                    background: props.variant === "gradient"
                        ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
                        : props.variant === "dark" ? "#0a0a0a" : colors.primary,
                    color: "#fff"
                }}
            >
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{props.headline}</h2>
                    {props.description && (
                        <p className="text-xl opacity-90 mb-8">{props.description}</p>
                    )}
                    {props.buttonText && (
                        <button
                            className="px-8 py-4 rounded-lg font-semibold text-lg"
                            style={{ backgroundColor: colors.accent, color: colors.text }}
                        >
                            {props.buttonText}
                        </button>
                    )}
                </div>
            </section>
        );
    },

    // =========================================================================
    // TYPOGRAPHY COMPONENTS
    // =========================================================================
    Heading: ({ element, colors }) => {
        const props = element.props as { text: string; level?: string; centered?: boolean; gradient?: boolean };
        const sizes: Record<string, string> = { "1": "text-5xl", "2": "text-4xl", "3": "text-3xl", "4": "text-2xl" };
        const className = `${sizes[props.level || "2"]} font-bold ${props.centered ? "text-center" : ""}`;
        const style: React.CSSProperties = {
            color: props.gradient ? "transparent" : colors.text,
            backgroundImage: props.gradient ? `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` : undefined,
            WebkitBackgroundClip: props.gradient ? "text" : undefined,
        };

        // Render appropriate heading level
        switch (props.level) {
            case "1":
                return <h1 className={className} style={style}>{props.text}</h1>;
            case "3":
                return <h3 className={className} style={style}>{props.text}</h3>;
            case "4":
                return <h4 className={className} style={style}>{props.text}</h4>;
            default:
                return <h2 className={className} style={style}>{props.text}</h2>;
        }
    },

    Text: ({ element, colors }) => {
        const props = element.props as { content: string; variant?: string; centered?: boolean };
        const variantClass = {
            lead: "text-xl",
            muted: "text-base opacity-60",
            small: "text-sm",
            body: "text-base",
        }[props.variant || "body"];

        return (
            <p
                className={`${variantClass} ${props.centered ? "text-center" : ""}`}
                style={{ color: colors.text }}
            >
                {props.content}
            </p>
        );
    },

    Badge: ({ element, colors }) => {
        const props = element.props as { text: string; variant?: string };

        let style: React.CSSProperties = { backgroundColor: colors.text + "10", color: colors.text };
        if (props.variant === "primary") style = { backgroundColor: colors.primary + "20", color: colors.primary };
        if (props.variant === "success") style = { backgroundColor: "#10b98120", color: "#10b981" };
        if (props.variant === "warning") style = { backgroundColor: "#f59e0b20", color: "#f59e0b" };

        return (
            <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                style={style}
            >
                {props.text}
            </span>
        );
    },

    // =========================================================================
    // NAVIGATION COMPONENTS
    // =========================================================================
    Navbar: ({ element, colors }) => {
        const props = element.props as { brandName: string; logo?: string; links?: { label: string; href: string }[]; ctaText?: string };

        return (
            <nav
                className="py-4 px-6 flex items-center justify-between"
                style={{ backgroundColor: colors.background }}
            >
                <div className="flex items-center gap-2">
                    {props.logo ? (
                        <img src={props.logo} alt={props.brandName} className="h-8" />
                    ) : (
                        <span className="text-xl font-bold" style={{ color: colors.primary }}>{props.brandName}</span>
                    )}
                </div>
                <div className="flex items-center gap-6">
                    {props.links?.map((link, i) => (
                        <a
                            key={i}
                            href={link.href}
                            className="font-medium hover:opacity-80 transition-opacity"
                            style={{ color: colors.text }}
                        >
                            {link.label}
                        </a>
                    ))}
                    {props.ctaText && (
                        <button
                            className="px-4 py-2 rounded-lg font-semibold text-white"
                            style={{ backgroundColor: colors.primary }}
                        >
                            {props.ctaText}
                        </button>
                    )}
                </div>
            </nav>
        );
    },

    Footer: ({ element, colors }) => {
        const props = element.props as { brandName: string; tagline?: string; links?: { label: string; href: string }[]; socials?: { platform: string; href: string }[]; copyright?: string };

        const socialIcons: Record<string, React.FC<{ className?: string }>> = {
            twitter: Twitter,
            github: Github,
            linkedin: Linkedin,
            instagram: Instagram,
            youtube: Youtube,
        };

        return (
            <footer
                className="py-12 px-6"
                style={{ backgroundColor: colors.text, color: colors.background }}
            >
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <p className="text-xl font-bold">{props.brandName}</p>
                            {props.tagline && <p className="opacity-70">{props.tagline}</p>}
                        </div>
                        <div className="flex gap-6">
                            {props.links?.map((link, i) => (
                                <a key={i} href={link.href} className="hover:opacity-80">{link.label}</a>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            {props.socials?.map((social, i) => {
                                const Icon = socialIcons[social.platform.toLowerCase()];
                                return Icon ? (
                                    <a key={i} href={social.href} className="hover:opacity-80">
                                        <Icon className="w-5 h-5" />
                                    </a>
                                ) : null;
                            })}
                        </div>
                    </div>
                    {props.copyright && (
                        <p className="mt-8 text-center text-sm opacity-60">{props.copyright}</p>
                    )}
                </div>
            </footer>
        );
    },

    // =========================================================================
    // MEDIA COMPONENTS
    // =========================================================================
    Image: ({ element }) => {
        const props = element.props as { src: string; alt: string; aspectRatio?: string; rounded?: boolean };
        const aspectClass = {
            square: "aspect-square",
            video: "aspect-video",
            wide: "aspect-[21/9]",
            auto: "",
        }[props.aspectRatio || "auto"];

        return (
            <img
                src={props.src}
                alt={props.alt}
                className={`w-full object-cover ${aspectClass} ${props.rounded ? "rounded-xl" : ""}`}
            />
        );
    },

    Logo: ({ element, colors }) => {
        const props = element.props as { src?: string; name: string; size?: string };
        const sizeClass = props.size === "sm" ? "h-6" : props.size === "lg" ? "h-12" : "h-8";

        if (props.src) {
            return <img src={props.src} alt={props.name} className={sizeClass} />;
        }

        return (
            <span
                className={`font-bold ${props.size === "sm" ? "text-lg" : props.size === "lg" ? "text-3xl" : "text-xl"}`}
                style={{ color: colors.primary }}
            >
                {props.name}
            </span>
        );
    },

    Illustration: ({ element, colors }) => {
        const props = element.props as { type: string };

        return (
            <div
                className="w-full h-64 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: colors.primary + "10" }}
            >
                <span className="text-6xl">
                    {props.type === "hero" ? "🚀" :
                        props.type === "features" ? "✨" :
                            props.type === "404" ? "🔍" :
                                props.type === "empty" ? "📭" :
                                    props.type === "success" ? "🎉" : "🖼️"}
                </span>
            </div>
        );
    },
};

// =============================================================================
// RECURSIVE RENDERER
// =============================================================================

function renderElement(
    tree: UITree,
    elementKey: string,
    colors: BrandColors
): React.ReactNode {
    const element = tree.elements[elementKey];
    if (!element) {
        console.warn(`Element not found: ${elementKey}`);
        return null;
    }

    const Component = componentRegistry[element.type as ComponentType];
    if (!Component) {
        console.warn(`Unknown component type: ${element.type}`);
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                Unknown component: {element.type}
            </div>
        );
    }

    const children = element.children?.map((childKey) =>
        <React.Fragment key={childKey}>
            {renderElement(tree, childKey, colors)}
        </React.Fragment>
    );

    return (
        <Component element={element} colors={colors}>
            {children}
        </Component>
    );
}

// =============================================================================
// MAIN RENDERER COMPONENT
// =============================================================================

export interface PreviewRendererProps {
    tree: UITree | null;
    colors: BrandColors;
    loading?: boolean;
    error?: string;
}

export function PreviewRenderer({
    tree,
    colors,
    loading,
    error,
}: PreviewRendererProps) {
    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="text-center text-red-500">
                    <p className="font-semibold mb-2">Preview Error</p>
                    <p className="text-sm opacity-80">{error}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-3 rounded-full"
                    style={{
                        borderColor: colors.primary + "30",
                        borderTopColor: colors.primary,
                    }}
                />
            </div>
        );
    }

    if (!tree?.root) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start chatting to build your page</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="preview-container min-h-full"
            style={{ backgroundColor: colors.background }}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {renderElement(tree, tree.root, colors)}
            </motion.div>
        </div>
    );
}

export default PreviewRenderer;
