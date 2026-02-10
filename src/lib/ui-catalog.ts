/**
 * UI Component Catalog for LaunchKit
 * 
 * Defines the component types available for instant preview rendering.
 * Based on Vercel JSON-Render approach for streaming UI generation.
 */

import { z } from "zod";

// =============================================================================
// COMPONENT DEFINITIONS
// =============================================================================

export const landingPageCatalog = {
    name: "LaunchKit-ui",
    components: {
        // =========================================================================
        // LAYOUT COMPONENTS
        // =========================================================================
        Hero: {
            props: z.object({
                headline: z.string().describe("Main heading text"),
                subheadline: z.string().optional().describe("Supporting text below headline"),
                ctaText: z.string().optional().describe("Call-to-action button text"),
                ctaHref: z.string().optional().describe("CTA button link"),
                backgroundStyle: z.enum(["solid", "gradient", "image"]).optional(),
            }),
            hasChildren: false,
            description: "Hero section with headline, subheadline, and CTA",
        },

        Section: {
            props: z.object({
                title: z.string().optional().describe("Section heading"),
                subtitle: z.string().optional().describe("Section description"),
                centered: z.boolean().optional().describe("Center-align content"),
                background: z.enum(["light", "dark", "primary", "gradient"]).optional(),
                padding: z.enum(["sm", "md", "lg"]).optional(),
            }),
            hasChildren: true,
            description: "Generic section container",
        },

        Grid: {
            props: z.object({
                columns: z.enum(["2", "3", "4"]).optional().describe("Number of columns"),
                gap: z.enum(["sm", "md", "lg"]).optional(),
                responsive: z.boolean().optional().describe("Stack on mobile"),
            }),
            hasChildren: true,
            description: "Grid layout container",
        },

        Stack: {
            props: z.object({
                direction: z.enum(["horizontal", "vertical"]).optional(),
                gap: z.enum(["sm", "md", "lg"]).optional(),
                align: z.enum(["start", "center", "end", "stretch"]).optional(),
                justify: z.enum(["start", "center", "end", "between"]).optional(),
            }),
            hasChildren: true,
            description: "Flex container for stacking elements",
        },

        Container: {
            props: z.object({
                maxWidth: z.enum(["sm", "md", "lg", "xl", "full"]).optional(),
                centered: z.boolean().optional(),
            }),
            hasChildren: true,
            description: "Width-constrained container",
        },

        Divider: {
            props: z.object({
                variant: z.enum(["solid", "dashed", "gradient"]).optional(),
                spacing: z.enum(["sm", "md", "lg"]).optional(),
            }),
            hasChildren: false,
            description: "Horizontal separator line",
        },

        // =========================================================================
        // CONTENT COMPONENTS
        // =========================================================================
        FeatureCard: {
            props: z.object({
                title: z.string().describe("Feature title"),
                description: z.string().describe("Feature description"),
                icon: z.string().optional().describe("Icon name (lucide-react) or emoji"),
                highlighted: z.boolean().optional().describe("Add emphasis styling"),
            }),
            hasChildren: false,
            description: "Feature card with icon, title, and description",
        },

        PricingCard: {
            props: z.object({
                name: z.string().describe("Plan name (e.g., 'Starter')"),
                price: z.string().describe("Price (e.g., '$29')"),
                period: z.string().optional().describe("Billing period (e.g., '/month')"),
                features: z.array(z.string()).describe("List of included features"),
                ctaText: z.string().optional().describe("Button text"),
                popular: z.boolean().optional().describe("Mark as popular/recommended"),
            }),
            hasChildren: false,
            description: "Pricing tier card",
        },

        TestimonialCard: {
            props: z.object({
                quote: z.string().describe("Testimonial text"),
                author: z.string().describe("Author name"),
                role: z.string().optional().describe("Author title/role"),
                company: z.string().optional().describe("Company name"),
                avatar: z.string().optional().describe("Avatar URL or initials"),
                rating: z.number().optional().describe("Star rating (1-5)"),
            }),
            hasChildren: false,
            description: "Customer testimonial",
        },

        StatsCard: {
            props: z.object({
                value: z.string().describe("Stat value (e.g., '10M+')"),
                label: z.string().describe("Stat label (e.g., 'Active Users')"),
                icon: z.string().optional(),
                trend: z.enum(["up", "down", "neutral"]).optional(),
            }),
            hasChildren: false,
            description: "Single statistic display",
        },

        FAQItem: {
            props: z.object({
                question: z.string().describe("Question text"),
                answer: z.string().describe("Answer text"),
                defaultOpen: z.boolean().optional(),
            }),
            hasChildren: false,
            description: "FAQ accordion item",
        },

        BenefitItem: {
            props: z.object({
                text: z.string().describe("Benefit description"),
                icon: z.string().optional().describe("Icon or checkmark"),
            }),
            hasChildren: false,
            description: "Single benefit list item with checkmark",
        },

        // =========================================================================
        // ACTION COMPONENTS
        // =========================================================================
        Button: {
            props: z.object({
                label: z.string().describe("Button text"),
                variant: z.enum(["primary", "secondary", "outline", "ghost"]).optional(),
                size: z.enum(["sm", "md", "lg"]).optional(),
                href: z.string().optional().describe("Link destination"),
                fullWidth: z.boolean().optional(),
            }),
            hasChildren: false,
            description: "Call-to-action button",
        },

        EmailCapture: {
            props: z.object({
                placeholder: z.string().optional().describe("Input placeholder"),
                buttonText: z.string().optional().describe("Submit button text"),
                helperText: z.string().optional().describe("Text below input"),
            }),
            hasChildren: false,
            description: "Email capture form with input and button",
        },

        CTABanner: {
            props: z.object({
                headline: z.string().describe("CTA headline"),
                description: z.string().optional(),
                buttonText: z.string().optional(),
                buttonHref: z.string().optional(),
                variant: z.enum(["default", "gradient", "dark"]).optional(),
            }),
            hasChildren: false,
            description: "Full-width call-to-action banner",
        },

        // =========================================================================
        // TYPOGRAPHY COMPONENTS
        // =========================================================================
        Heading: {
            props: z.object({
                text: z.string().describe("Heading text"),
                level: z.enum(["1", "2", "3", "4"]).optional().describe("h1-h4 level"),
                centered: z.boolean().optional(),
                gradient: z.boolean().optional().describe("Use gradient text"),
            }),
            hasChildren: false,
            description: "Heading text",
        },

        Text: {
            props: z.object({
                content: z.string().describe("Text content"),
                variant: z.enum(["body", "lead", "muted", "small"]).optional(),
                centered: z.boolean().optional(),
            }),
            hasChildren: false,
            description: "Paragraph text",
        },

        Badge: {
            props: z.object({
                text: z.string().describe("Badge text"),
                variant: z.enum(["default", "primary", "success", "warning"]).optional(),
            }),
            hasChildren: false,
            description: "Small label/tag badge",
        },

        // =========================================================================
        // NAVIGATION COMPONENTS
        // =========================================================================
        Navbar: {
            props: z.object({
                brandName: z.string().describe("Brand/logo name"),
                logo: z.string().optional().describe("Logo URL"),
                links: z.array(z.object({
                    label: z.string(),
                    href: z.string(),
                })).optional(),
                ctaText: z.string().optional().describe("CTA button text"),
                ctaHref: z.string().optional(),
                sticky: z.boolean().optional(),
            }),
            hasChildren: false,
            description: "Navigation bar",
        },

        Footer: {
            props: z.object({
                brandName: z.string(),
                tagline: z.string().optional(),
                links: z.array(z.object({
                    label: z.string(),
                    href: z.string(),
                })).optional(),
                socials: z.array(z.object({
                    platform: z.enum(["twitter", "github", "linkedin", "instagram", "youtube"]),
                    href: z.string(),
                })).optional(),
                copyright: z.string().optional(),
            }),
            hasChildren: false,
            description: "Page footer",
        },

        // =========================================================================
        // MEDIA COMPONENTS
        // =========================================================================
        Image: {
            props: z.object({
                src: z.string().describe("Image URL"),
                alt: z.string().describe("Alt text"),
                aspectRatio: z.enum(["auto", "square", "video", "wide"]).optional(),
                rounded: z.boolean().optional(),
            }),
            hasChildren: false,
            description: "Image display",
        },

        Logo: {
            props: z.object({
                src: z.string().optional().describe("Logo image URL"),
                name: z.string().describe("Company name for fallback"),
                size: z.enum(["sm", "md", "lg"]).optional(),
            }),
            hasChildren: false,
            description: "Logo image or text fallback",
        },

        Illustration: {
            props: z.object({
                type: z.enum(["hero", "features", "404", "empty", "success"]),
                alt: z.string().optional(),
            }),
            hasChildren: false,
            description: "Decorative illustration placeholder",
        },
    },
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ComponentType = keyof typeof landingPageCatalog.components;

export type ComponentProps<T extends ComponentType> = z.infer<
    typeof landingPageCatalog.components[T]["props"]
>;

export interface UIElement<T extends ComponentType = ComponentType> {
    key: string;
    type: T;
    props: ComponentProps<T>;
    children?: string[];
    parentKey?: string;
}

export interface UITree {
    root: string;
    elements: Record<string, UIElement>;
}

// =============================================================================
// SCHEMA FOR GEMINI STRUCTURED OUTPUT
// =============================================================================

// Element schema for Gemini
export const uiElementSchema = z.object({
    key: z.string().describe("Unique identifier for this element"),
    type: z.enum([
        "Hero", "Section", "Grid", "Stack", "Container", "Divider",
        "FeatureCard", "PricingCard", "TestimonialCard", "StatsCard", "FAQItem", "BenefitItem",
        "Button", "EmailCapture", "CTABanner",
        "Heading", "Text", "Badge",
        "Navbar", "Footer",
        "Image", "Logo", "Illustration"
    ] as const).describe("Component type from the catalog"),
    props: z.record(z.string(), z.unknown()).describe("Props for the component"),
    children: z.array(z.string()).optional().describe("Keys of child elements"),
});

export const uiTreeSchema = z.object({
    root: z.string().describe("Key of the root element"),
    elements: z.record(z.string(), uiElementSchema).describe("Flat map of all elements by key"),
});

// =============================================================================
// CATALOG UTILITIES
// =============================================================================

/**
 * Get component definition by type
 */
export function getComponentDef(type: ComponentType) {
    return landingPageCatalog.components[type];
}

/**
 * Check if component type supports children
 */
export function hasChildren(type: ComponentType): boolean {
    return landingPageCatalog.components[type].hasChildren ?? false;
}

/**
 * Get all component types as array
 */
export function getComponentTypes(): ComponentType[] {
    return Object.keys(landingPageCatalog.components) as ComponentType[];
}

/**
 * Get component descriptions for system prompt
 */
export function getCatalogDescription(): string {
    const components = landingPageCatalog.components;
    const lines: string[] = [];

    for (const [type, def] of Object.entries(components)) {
        // Get props from the Zod schema - Zod v4 compatible
        const propsSchema = def.props;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schemaShape = (propsSchema as any)._zod?.def?.shape || (propsSchema as any).shape || {};
        const propsList = typeof schemaShape === "function"
            ? Object.keys(schemaShape())
            : Object.keys(schemaShape);

        lines.push(`- ${type}: ${def.description}. Props: { ${propsList.join(", ")} }${def.hasChildren ? " [HAS CHILDREN]" : ""}`);
    }

    return lines.join("\n");
}
