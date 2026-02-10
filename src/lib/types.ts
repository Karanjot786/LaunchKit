// Type definitions for LaunchKit

export interface ValidationResult {
    viabilityScore: number;
    marketSize: string;
    competitors: string[];
    trends: string[];
    challenges: string[];
    opportunities: string[];
    verdict: string;
}

export interface BrandName {
    name: string;
    tagline: string;
    reasoning: string;
    domains?: DomainResult[];
}

export interface DomainResult {
    domain: string;
    available: boolean;
    error?: string;
}

export interface BrandKit {
    name: string;
    tagline: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fonts: {
        heading: string;
        body: string;
    };
    logo?: string; // Base64 or URL
}

export interface LandingContent {
    hero: {
        headline: string;
        subheadline: string;
        cta: string;
    };
    features: {
        title: string;
        description: string;
        icon: string;
    }[];
    benefits: string[];
    testimonialPlaceholder: string;
    faq: {
        question: string;
        answer: string;
    }[];
    footer: {
        tagline: string;
        copyright: string;
    };
}

export interface AppSchema {
    appName: string;
    description: string;
    collections: {
        name: string;
        fields: {
            name: string;
            type: string;
            required: boolean;
        }[];
    }[];
    authProviders: string[];
    pages: {
        path: string;
        name: string;
        requiresAuth: boolean;
        description: string;
    }[];
    apiEndpoints: {
        method: string;
        path: string;
        description: string;
    }[];
}

export interface GeneratedProject {
    id: string;
    idea: string;
    status: "validating" | "branding" | "generating" | "deploying" | "complete" | "error";
    validation?: ValidationResult;
    brand?: BrandKit;
    names?: BrandName[];
    selectedName?: BrandName;
    content?: LandingContent;
    appSchema?: AppSchema;
    deployUrl?: string;
    createdAt: Date;
    error?: string;
}

export type GenerationStep =
    | "idea"
    | "validation"
    | "naming"
    | "branding"
    | "content"
    | "app-schema"
    | "deploy"
    | "complete";

export interface GenerationProgress {
    currentStep: GenerationStep;
    steps: {
        id: GenerationStep;
        label: string;
        status: "pending" | "active" | "complete" | "error";
    }[];
}
