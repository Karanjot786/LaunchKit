declare module "whois-json" {
    interface WhoisResult {
        domainName?: string;
        registrar?: string;
        createdDate?: string;
        updatedDate?: string;
        expiresDate?: string;
        nameServer?: string | string[];
        status?: string | string[];
        [key: string]: unknown;
    }

    function whois(domain: string): Promise<WhoisResult>;
    export default whois;
}
