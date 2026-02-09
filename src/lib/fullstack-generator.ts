/**
 * Full-Stack Generation Utilities
 * 
 * Tools and templates for generating backend code, database schemas, and auth.
 */

import { z } from "zod";

// =============================================================================
// SCHEMAS
// =============================================================================

export const apiRouteSchema = z.object({
    path: z.string().describe("API route path (e.g., /api/users)"),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    description: z.string(),
    auth: z.boolean().describe("Whether route requires authentication"),
    requestBody: z.record(z.string(), z.string()).optional().describe("Request body fields and types"),
    responseType: z.string().describe("Response type description"),
});

export const databaseTableSchema = z.object({
    name: z.string().describe("Table/model name in PascalCase"),
    fields: z.array(z.object({
        name: z.string(),
        type: z.enum(["String", "Int", "Float", "Boolean", "DateTime", "Json", "Relation"]),
        optional: z.boolean().optional(),
        unique: z.boolean().optional(),
        default: z.string().optional(),
        relation: z.object({
            model: z.string(),
            type: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
        }).optional(),
    })),
});

export const fullStackSchema = z.object({
    // Frontend
    pages: z.array(z.object({
        path: z.string(),
        component: z.string(),
        auth: z.boolean().optional(),
    })).optional(),

    // API Routes
    apiRoutes: z.array(apiRouteSchema).optional(),

    // Database
    database: z.object({
        provider: z.enum(["supabase", "prisma", "firebase"]),
        tables: z.array(databaseTableSchema),
    }).optional(),

    // Auth
    auth: z.object({
        provider: z.enum(["supabase", "firebase", "next-auth"]),
        methods: z.array(z.enum(["email", "google", "github", "apple"])),
    }).optional(),
});

export type FullStackConfig = z.infer<typeof fullStackSchema>;
export type ApiRoute = z.infer<typeof apiRouteSchema>;
export type DatabaseTable = z.infer<typeof databaseTableSchema>;

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * Generate Prisma schema from database config
 */
export function generatePrismaSchema(tables: DatabaseTable[], provider: string = "postgresql"): string {
    const datasource = provider === "supabase" ? "postgresql" : provider;

    let schema = `// Prisma Schema - Auto-generated

datasource db {
  provider = "${datasource}"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

`;

    for (const table of tables) {
        schema += `model ${table.name} {\n`;
        schema += `  id        String   @id @default(cuid())\n`;

        for (const field of table.fields) {
            if (field.name === "id") continue;

            let line = `  ${field.name.padEnd(10)} ${field.type}`;
            if (field.optional) line += "?";
            if (field.unique) line += " @unique";
            if (field.default) line += ` @default(${field.default})`;
            schema += line + "\n";
        }

        schema += `  createdAt DateTime @default(now())\n`;
        schema += `  updatedAt DateTime @updatedAt\n`;
        schema += `}\n\n`;
    }

    return schema;
}

/**
 * Generate Supabase SQL schema
 */
export function generateSupabaseSchema(tables: DatabaseTable[]): string {
    let sql = `-- Supabase SQL Schema - Auto-generated\n\n`;

    const typeMap: Record<string, string> = {
        String: "TEXT",
        Int: "INTEGER",
        Float: "REAL",
        Boolean: "BOOLEAN",
        DateTime: "TIMESTAMPTZ",
        Json: "JSONB",
    };

    for (const table of tables) {
        const tableName = table.name.toLowerCase() + "s";
        sql += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
        sql += `  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n`;

        for (const field of table.fields) {
            if (field.name === "id") continue;
            const sqlType = typeMap[field.type] || "TEXT";
            const nullable = field.optional ? "" : " NOT NULL";
            const defaultVal = field.default ? ` DEFAULT ${field.default}` : "";
            sql += `  ${field.name} ${sqlType}${nullable}${defaultVal},\n`;
        }

        sql += `  created_at TIMESTAMPTZ DEFAULT NOW(),\n`;
        sql += `  updated_at TIMESTAMPTZ DEFAULT NOW()\n`;
        sql += `);\n\n`;

        // Add RLS policies
        sql += `-- Enable RLS\n`;
        sql += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
    }

    return sql;
}

/**
 * Generate Next.js API route
 */
export function generateNextApiRoute(route: ApiRoute): string {
    const { path, method, description, auth, requestBody, responseType } = route;

    let code = `/**
 * ${description}
 * ${method} ${path}
 */

import { NextRequest, NextResponse } from "next/server";
${auth ? 'import { getServerSession } from "next-auth";\nimport { authOptions } from "@/lib/auth";' : ""}

export async function ${method}(request: NextRequest) {
  try {
`;

    if (auth) {
        code += `    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

`;
    }

    if (requestBody && Object.keys(requestBody).length > 0) {
        code += `    // Parse request body
    const body = await request.json();
    const { ${Object.keys(requestBody).join(", ")} } = body;

    // TODO: Validate and process ${Object.keys(requestBody).join(", ")}

`;
    }

    code += `    // TODO: Implement ${description.toLowerCase()}

    return NextResponse.json({
      success: true,
      data: null, // Replace with actual response
    });
  } catch (error) {
    console.error("${path} error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
`;

    return code;
}

/**
 * Generate Supabase client setup
 */
export function generateSupabaseClient(): Record<string, string> {
    return {
        "src/lib/supabase.ts": `/**
 * Supabase Client
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Server-side client (for API routes)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
`,
        ".env.local.example": `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`,
    };
}

/**
 * Generate Next-Auth configuration
 */
export function generateNextAuth(providers: string[]): Record<string, string> {
    const providerImports = providers.map(p => {
        switch (p) {
            case "google": return 'import GoogleProvider from "next-auth/providers/google";';
            case "github": return 'import GitHubProvider from "next-auth/providers/github";';
            case "email": return 'import EmailProvider from "next-auth/providers/email";';
            default: return "";
        }
    }).filter(Boolean).join("\n");

    const providerConfigs = providers.map(p => {
        switch (p) {
            case "google": return `    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),`;
            case "github": return `    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),`;
            case "email": return `    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),`;
            default: return "";
        }
    }).filter(Boolean).join("\n");

    return {
        "src/lib/auth.ts": `/**
 * NextAuth Configuration
 */

import { NextAuthOptions } from "next-auth";
${providerImports}

export const authOptions: NextAuthOptions = {
  providers: [
${providerConfigs}
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },
};
`,
        "src/app/api/auth/[...nextauth]/route.ts": `import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
`,
    };
}

// =============================================================================
// TOOL DEFINITIONS FOR GEMINI
// =============================================================================

export const fullStackToolDefinitions = [
    {
        name: "create_api_route",
        description: "Create a Next.js API route with the specified configuration",
        parameters: {
            type: "object" as const,
            properties: {
                path: { type: "string" as const, description: "API route path (e.g., /api/users)" },
                method: { type: "string" as const, enum: ["GET", "POST", "PUT", "DELETE"] },
                description: { type: "string" as const, description: "What this route does" },
                auth: { type: "boolean" as const, description: "Requires authentication" },
                requestBody: {
                    type: "object" as const,
                    description: "Request body schema",
                    additionalProperties: { type: "string" as const },
                },
            },
            required: ["path", "method", "description"],
        },
    },
    {
        name: "create_database_table",
        description: "Create a database table/model with fields",
        parameters: {
            type: "object" as const,
            properties: {
                name: { type: "string" as const, description: "Table name in PascalCase" },
                provider: { type: "string" as const, enum: ["supabase", "prisma"] },
                fields: {
                    type: "array" as const,
                    items: {
                        type: "object" as const,
                        properties: {
                            name: { type: "string" as const },
                            type: { type: "string" as const, enum: ["String", "Int", "Float", "Boolean", "DateTime", "Json"] },
                            optional: { type: "boolean" as const },
                            unique: { type: "boolean" as const },
                        },
                        required: ["name", "type"],
                    },
                },
            },
            required: ["name", "provider", "fields"],
        },
    },
    {
        name: "setup_auth",
        description: "Set up authentication with the specified providers",
        parameters: {
            type: "object" as const,
            properties: {
                provider: { type: "string" as const, enum: ["supabase", "next-auth"] },
                methods: {
                    type: "array" as const,
                    items: { type: "string" as const, enum: ["email", "google", "github"] },
                },
            },
            required: ["provider", "methods"],
        },
    },
    {
        name: "setup_database",
        description: "Initialize database configuration for the project",
        parameters: {
            type: "object" as const,
            properties: {
                provider: { type: "string" as const, enum: ["supabase", "prisma"] },
            },
            required: ["provider"],
        },
    },
];

// =============================================================================
// FULL-STACK TOOL EXECUTOR
// =============================================================================

export class FullStackExecutor {
    private generatedFiles: Record<string, string> = {};
    private tables: DatabaseTable[] = [];

    /**
     * Execute a full-stack tool
     */
    execute(
        name: string,
        args: Record<string, unknown>
    ): { files: Record<string, string>; message: string } {
        switch (name) {
            case "create_api_route":
                return this.createApiRoute(args);
            case "create_database_table":
                return this.createDatabaseTable(args);
            case "setup_auth":
                return this.setupAuth(args);
            case "setup_database":
                return this.setupDatabase(args);
            default:
                return { files: {}, message: `Unknown tool: ${name}` };
        }
    }

    private createApiRoute(args: Record<string, unknown>) {
        const route: ApiRoute = {
            path: args.path as string,
            method: args.method as ApiRoute["method"],
            description: args.description as string,
            auth: (args.auth as boolean) ?? false,
            requestBody: args.requestBody as Record<string, string> | undefined,
            responseType: "JSON",
        };

        const code = generateNextApiRoute(route);
        const filePath = `src/app/api${route.path}/route.ts`;
        this.generatedFiles[filePath] = code;

        return {
            files: { [filePath]: code },
            message: `Created API route: ${route.method} ${route.path}`,
        };
    }

    private createDatabaseTable(args: Record<string, unknown>) {
        const table: DatabaseTable = {
            name: args.name as string,
            fields: args.fields as DatabaseTable["fields"],
        };
        const provider = args.provider as string;

        this.tables.push(table);

        const files: Record<string, string> = {};

        if (provider === "supabase") {
            files["supabase/migrations/create_tables.sql"] = generateSupabaseSchema(this.tables);
        } else {
            files["prisma/schema.prisma"] = generatePrismaSchema(this.tables);
        }

        Object.assign(this.generatedFiles, files);

        return {
            files,
            message: `Created ${table.name} table with ${table.fields.length} fields`,
        };
    }

    private setupAuth(args: Record<string, unknown>) {
        const provider = args.provider as string;
        const methods = args.methods as string[];

        let files: Record<string, string> = {};

        if (provider === "next-auth") {
            files = generateNextAuth(methods);
        } else if (provider === "supabase") {
            // Supabase auth is built-in, just need client setup
            files = generateSupabaseClient();
        }

        Object.assign(this.generatedFiles, files);

        return {
            files,
            message: `Set up ${provider} authentication with: ${methods.join(", ")}`,
        };
    }

    private setupDatabase(args: Record<string, unknown>) {
        const provider = args.provider as string;
        let files: Record<string, string> = {};

        if (provider === "supabase") {
            files = generateSupabaseClient();
        } else if (provider === "prisma") {
            files = {
                "prisma/schema.prisma": generatePrismaSchema([]),
                "src/lib/prisma.ts": `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`,
            };
        }

        Object.assign(this.generatedFiles, files);

        return {
            files,
            message: `Set up ${provider} database integration`,
        };
    }

    getFiles(): Record<string, string> {
        return { ...this.generatedFiles };
    }
}
