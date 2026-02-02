import whois from "whois-json";

interface DomainCheckResult {
    domain: string;
    available: boolean;
    error?: string;
}

// Check single domain availability
export async function checkDomain(domain: string): Promise<DomainCheckResult> {
    try {
        const result = await whois(domain);

        // If no domain name in result, it's likely available
        const available = !result.domainName && !result.registrar;

        return {
            domain,
            available,
        };
    } catch (error) {
        // If WHOIS fails, we can't determine - assume potentially available
        return {
            domain,
            available: true,
            error: "Could not verify",
        };
    }
}

// Check multiple domains
export async function checkDomains(
    baseName: string,
    tlds: string[] = [".com", ".io", ".co", ".app", ".dev"]
): Promise<DomainCheckResult[]> {
    const domains = tlds.map((tld) => `${baseName.toLowerCase().replace(/\s+/g, "")}${tld}`);

    const results = await Promise.all(
        domains.map((domain) => checkDomain(domain))
    );

    return results;
}

// Generate domain suggestions from brand name
export function generateDomainSuggestions(brandName: string): string[] {
    const clean = brandName.toLowerCase().replace(/\s+/g, "");
    const withHyphens = brandName.toLowerCase().replace(/\s+/g, "-");

    return [
        `${clean}.com`,
        `${clean}.io`,
        `${clean}.co`,
        `${clean}.app`,
        `${clean}.dev`,
        `get${clean}.com`,
        `try${clean}.com`,
        `${clean}app.com`,
        `${clean}hq.com`,
        `${withHyphens}.com`,
    ];
}
