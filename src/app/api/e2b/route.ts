import { NextRequest, NextResponse } from "next/server";
import { Sandbox } from "@e2b/code-interpreter";

// Store active sandboxes by session ID
const activeSandboxes = new Map<string, Sandbox>();

// Default timeout for sandbox (5 minutes)
const SANDBOX_TIMEOUT = 5 * 60 * 1000;

// =============================================================================
// DEFAULT REACT+VITE+TAILWIND TEMPLATE
// =============================================================================

const DEFAULT_TEMPLATE_FILES: Record<string, string> = {
  "package.json": JSON.stringify({
    name: "launchpad-app",
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite --host",
      build: "vite build",
      preview: "vite preview",
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.20.0",
      firebase: "^10.7.0",
      "lucide-react": "^0.400.0",
      "framer-motion": "^11.0.0",
      clsx: "^2.0.0",
      "tailwind-merge": "^2.0.0",
      "class-variance-authority": "^0.7.0",
      "@radix-ui/react-slot": "^1.0.0",
      "@radix-ui/react-dialog": "^1.0.0",
      "@radix-ui/react-dropdown-menu": "^2.0.0",
      "@radix-ui/react-avatar": "^1.0.0",
      "@radix-ui/react-label": "^2.0.0",
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.2.0",
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      typescript: "^5.3.0",
      vite: "^5.0.0",
      tailwindcss: "^3.4.0",
      postcss: "^8.4.0",
      autoprefixer: "^10.4.0",
      "tailwindcss-animate": "^1.0.0",
    },
  }, null, 2),

  "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      clientPort: 443,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
})`,

  "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}`,

  "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

  "tsconfig.json": JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noFallthroughCasesInSwitch: true,
      baseUrl: ".",
      paths: { "@/*": ["./src/*"] }
    },
    include: ["src"]
  }, null, 2),

  "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LaunchPad App</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script>
      // Capture browser errors for debugging
      window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('Browser Error:', msg, url, lineNo, columnNo, error);
        var errorDiv = document.createElement('div');
        errorDiv.style = 'color:red;padding:20px;background:white;position:fixed;top:0;left:0;right:0;z-index:9999;font-family:monospace;font-size:12px;border-bottom:3px solid red';
        errorDiv.innerHTML = '<strong>Error:</strong> ' + msg + '<br>' +
          '<strong>File:</strong> ' + url + '<br>' +
          '<strong>Line:</strong> ' + lineNo + ':' + columnNo + '<br>' +
          '<strong>Stack:</strong><br><pre>' + (error && error.stack || 'No stack trace') + '</pre>';
        document.body.appendChild(errorDiv);
        return false;
      };
    </script>
  </body>
</html>`,

  "src/main.tsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)`,

  "src/ErrorBoundary.tsx": `import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          maxWidth: '800px', 
          margin: '0 auto',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '20px' }}>⚠️ Something went wrong</h1>
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h2 style={{ fontSize: '16px', marginBottom: '10px' }}>Error Details:</h2>
            <pre style={{ 
              overflow: 'auto', 
              background: 'white',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px'
            }}>{this.state.error?.toString()}</pre>
          </div>
          {this.state.error?.stack && (
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Stack Trace</summary>
              <pre style={{ 
                overflow: 'auto', 
                background: '#f3f4f6',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '11px',
                marginTop: '10px'
              }}>{this.state.error.stack}</pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}`,

  "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}`,

  "src/lib/utils.ts": `import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,

  // ========== SHADCN/UI COMPONENTS ==========

  "src/components/ui/button.tsx": `import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }`,

  "src/components/ui/card.tsx": `import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }`,

  "src/components/ui/input.tsx": `import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }`,

  "src/components/ui/badge.tsx": `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }`,

  "src/components/ui/separator.tsx": `import * as React from "react"
import { cn } from "@/lib/utils"

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }`,

  "src/components/ui/index.ts": `export { Button, buttonVariants } from "./button"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./card"
export { Input } from "./input"
export { Badge, badgeVariants } from "./badge"
export { Separator } from "./separator"`,

  "src/App.tsx": `import { Button } from "./components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card"
import { Badge } from "./components/ui/badge"

export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
        <CardHeader>
          <Badge className="w-fit mb-2">Ready</Badge>
          <CardTitle className="text-white">🚀 LaunchPad</CardTitle>
          <CardDescription>Your app template is ready. Start chatting to build!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            This template includes React, Vite, Tailwind CSS, and shadcn/ui components.
          </p>
          <Button className="w-full">Get Started</Button>
        </CardContent>
      </Card>
    </main>
  )
}`,
};

// Firebase template files - Auth, Firestore, Storage
const FIREBASE_TEMPLATE_FILES: Record<string, string> = {
  "src/lib/firebase.ts": `import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Check if Firebase is configured
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
  }
}

export { auth, googleProvider, db, storage };
export default app;
`,

  "src/contexts/AuthContext.tsx": `import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const requireAuth = () => {
    if (!auth) throw new Error("Firebase not configured. Add VITE_FIREBASE_* env variables.");
  };

  const signIn = async (email: string, password: string) => {
    requireAuth();
    try { setError(null); await signInWithEmailAndPassword(auth!, email, password); }
    catch (err: any) { setError(err.message); throw err; }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    requireAuth();
    try {
      setError(null);
      const result = await createUserWithEmailAndPassword(auth!, email, password);
      if (displayName && result.user) await updateProfile(result.user, { displayName });
    } catch (err: any) { setError(err.message); throw err; }
  };

  const signInWithGoogle = async () => {
    requireAuth();
    if (!googleProvider) throw new Error("Google provider not configured");
    try { setError(null); await signInWithPopup(auth!, googleProvider); }
    catch (err: any) { setError(err.message); throw err; }
  };

  const logout = async () => { if (auth) await signOut(auth); };
  const resetPassword = async (email: string) => {
    requireAuth();
    try { setError(null); await sendPasswordResetEmail(auth!, email); }
    catch (err: any) { setError(err.message); throw err; }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, isConfigured: isFirebaseConfigured, signIn, signUp, signInWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
`,

  "src/hooks/useFirestore.ts": `import { useState, useCallback } from "react";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, DocumentData, QueryConstraint } from "firebase/firestore";
import { db } from "../lib/firebase";

export function useFirestore<T extends DocumentData>(collectionName: string) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (...constraints: QueryConstraint[]) => {
    setLoading(true);
    try {
      const ref = collection(db, collectionName);
      const q = constraints.length > 0 ? query(ref, ...constraints) : ref;
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T & { id: string }));
      setData(docs);
      return docs;
    } catch (err: any) { setError(err.message); return []; }
    finally { setLoading(false); }
  }, [collectionName]);

  const getById = useCallback(async (id: string) => {
    try {
      const snapshot = await getDoc(doc(db, collectionName, id));
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as T & { id: string } : null;
    } catch (err: any) { setError(err.message); return null; }
  }, [collectionName]);

  const add = useCallback(async (data: Omit<T, "id">) => {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  }, [collectionName]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    await updateDoc(doc(db, collectionName, id), data);
  }, [collectionName]);

  const remove = useCallback(async (id: string) => {
    await deleteDoc(doc(db, collectionName, id));
  }, [collectionName]);

  return { data, loading, error, fetchAll, getById, add, update, remove };
}
`,

  "src/hooks/useStorage.ts": `import { useState, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../lib/firebase";

export function useStorage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, path: string) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (err: any) { setError(err.message); throw err; }
    finally { setUploading(false); }
  }, []);

  const remove = useCallback(async (path: string) => {
    await deleteObject(ref(storage, path));
  }, []);

  return { upload, remove, uploading, error };
}
`,

  "src/components/auth/LoginForm.tsx": `import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function LoginForm({ onSuccess, onSignupClick }: { onSuccess?: () => void; onSignupClick?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await signIn(email, password); onSuccess?.(); } catch (err) {}
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
      </form>
      <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div></div>
      <Button variant="outline" className="w-full" onClick={() => signInWithGoogle().then(onSuccess)}>Continue with Google</Button>
      {onSignupClick && <p className="text-center text-sm">No account? <button onClick={onSignupClick} className="text-primary hover:underline">Sign up</button></p>}
    </div>
  );
}
`,

  "src/components/auth/SignupForm.tsx": `import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function SignupForm({ onSuccess, onLoginClick }: { onSuccess?: () => void; onLoginClick?: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await signUp(email, password, name); onSuccess?.(); } catch (err) {}
    setLoading(false);
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create account</h2>
        <p className="text-muted-foreground">Get started today</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Sign Up"}</Button>
      </form>
      <Button variant="outline" className="w-full" onClick={() => signInWithGoogle().then(onSuccess)}>Continue with Google</Button>
      {onLoginClick && <p className="text-center text-sm">Have an account? <button onClick={onLoginClick} className="text-primary hover:underline">Sign in</button></p>}
    </div>
  );
}
`,

  "src/components/auth/ProtectedRoute.tsx": `import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
`,

  "src/components/auth/UserMenu.tsx": `import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";

export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.photoURL ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" /> :
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
            {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
          </div>}
        <span className="text-sm font-medium hidden sm:block">{user.displayName || user.email}</span>
      </div>
      <Button variant="outline" size="sm" onClick={logout}>Sign Out</Button>
    </div>
  );
}
`,

  "src/components/auth/index.ts": `export { LoginForm } from "./LoginForm";
export { SignupForm } from "./SignupForm";
export { ProtectedRoute } from "./ProtectedRoute";
export { UserMenu } from "./UserMenu";
`,
};

/**
 * Write template files to sandbox
 */
async function writeTemplateFiles(sandbox: Sandbox): Promise<void> {
  console.log("[E2B] Writing template files to sandbox...");

  // Create directories first (including Firebase directories)
  const dirs = [
    "/home/user/project",
    "/home/user/project/src",
    "/home/user/project/src/lib",
    "/home/user/project/src/components",
    "/home/user/project/src/components/ui",
    "/home/user/project/src/components/auth",
    "/home/user/project/src/contexts",
    "/home/user/project/src/hooks",
  ];

  for (const dir of dirs) {
    try {
      await sandbox.files.makeDir(dir);
    } catch (e) {
      // Directory might already exist
    }
  }

  // Merge default and Firebase template files
  const allTemplateFiles = { ...DEFAULT_TEMPLATE_FILES, ...FIREBASE_TEMPLATE_FILES };

  // Prepare file array for batch write
  const fileArray: { path: string; data: string }[] = [];

  for (const [path, content] of Object.entries(allTemplateFiles)) {
    const fullPath = `/home/user/project/${path}`;
    fileArray.push({ path: fullPath, data: content });
  }

  // Write all files
  await sandbox.files.write(fileArray);
  console.log(`[E2B] Wrote ${fileArray.length} template files (including Firebase)`);

  // Verify package.json exists
  const verifyResult = await sandbox.commands.run("cat /home/user/project/package.json | head -5", {
    cwd: "/home/user/project",
  });
  console.log("[E2B] package.json verification:", verifyResult.stdout);
}

/**
 * E2B Cloud Sandbox API
 * 
 * POST /api/e2b
 * Actions:
 *   - create: Create a new sandbox
 *   - writeFiles: Write files to sandbox
 *   - runCommand: Run a shell command
 *   - getUrl: Get the preview URL
 *   - destroy: Destroy the sandbox
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, ...params } = body;

    if (!process.env.E2B_API_KEY) {
      return NextResponse.json(
        { error: "E2B_API_KEY not configured" },
        { status: 500 }
      );
    }

    switch (action) {
      case "create":
        return await createSandbox(sessionId);
      case "writeFiles":
        return await writeFiles(sessionId, params.files);
      case "runCommand":
        return await runCommand(sessionId, params.command, params.args);
      case "startDevServer":
        return await startDevServer(sessionId);
      case "getTemplateFiles":
        return getTemplateFiles();
      case "debug":
        return await debugSandbox(sessionId);
      case "destroy":
        return await destroySandbox(sessionId);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[E2B API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * Create a new sandbox
 */
async function createSandbox(sessionId: string) {
  // Destroy existing sandbox if any
  if (activeSandboxes.has(sessionId)) {
    console.log(`[E2B] Destroying existing sandbox for session: ${sessionId}`);
    const existing = activeSandboxes.get(sessionId);
    try {
      await existing?.kill();
    } catch (e) {
      console.log("[E2B] Error killing existing sandbox:", e);
    }
    activeSandboxes.delete(sessionId);
  }

  console.log(`[E2B] Creating sandbox for session: ${sessionId}`);
  console.log(`[E2B] Current active sandboxes before create: ${activeSandboxes.size}`);

  try {
    const sandbox = await Sandbox.create({
      timeoutMs: SANDBOX_TIMEOUT,
    });

    console.log(`[E2B] Sandbox created with ID: ${sandbox.sandboxId}`);

    // Write template files immediately after creating sandbox
    console.log("[E2B] Installing React+Vite+Tailwind template...");
    await writeTemplateFiles(sandbox);
    console.log("[E2B] Template installed successfully!");

    activeSandboxes.set(sessionId, sandbox);
    console.log(`[E2B] Active sandboxes after create: ${activeSandboxes.size}`);
    console.log(`[E2B] Active session IDs: ${Array.from(activeSandboxes.keys()).join(", ")}`);

    // Auto-cleanup after timeout
    setTimeout(async () => {
      if (activeSandboxes.has(sessionId)) {
        console.log(`[E2B] Auto-destroying sandbox: ${sessionId}`);
        try {
          await sandbox.kill();
        } catch (e) {
          console.log("[E2B] Error in auto-destroy:", e);
        }
        activeSandboxes.delete(sessionId);
      }
    }, SANDBOX_TIMEOUT);

    return NextResponse.json({
      success: true,
      sandboxId: sandbox.sandboxId,
      sessionId: sessionId,
      message: "Sandbox created with React+Vite+Tailwind template",
    });
  } catch (error) {
    console.error("[E2B] Error creating sandbox:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create sandbox",
    }, { status: 500 });
  }
}

/**
 * Write files to sandbox using batch API
 */
async function writeFiles(sessionId: string, files: Record<string, string>) {
  const sandbox = activeSandboxes.get(sessionId);
  if (!sandbox) {
    console.error(`[E2B] writeFiles - Sandbox not found for session: ${sessionId}`);
    console.error(`[E2B] Active sandboxes: ${Array.from(activeSandboxes.keys()).join(", ") || "none"}`);
    return NextResponse.json(
      { error: "Sandbox not found. Create one first." },
      { status: 404 }
    );
  }

  const fileCount = Object.keys(files).length;
  console.log(`[E2B] Writing ${fileCount} files to sandbox for session: ${sessionId}`);
  console.log(`[E2B] File paths:`, Object.keys(files));

  try {
    // Create project directory first
    await sandbox.files.makeDir("/home/user/project");
    console.log("[E2B] Created /home/user/project directory");

    // Collect all directories needed
    const dirs = new Set<string>();
    const fileArray: { path: string; data: string }[] = [];

    // Protected files - AI cannot overwrite these (already set up by template)
    const PROTECTED_FILES = new Set([
      // Config files
      "package.json", "/package.json",
      "tailwind.config.js", "/tailwind.config.js",
      "postcss.config.js", "/postcss.config.js",
      "vite.config.js", "/vite.config.js",
      "tsconfig.json", "/tsconfig.json",
      "index.html", "/index.html",
      // Core CSS with Tailwind directives
      "src/index.css", "/src/index.css",
      // Pre-built Firebase/Auth files
      "src/lib/firebase.ts", "/src/lib/firebase.ts",
      "src/lib/utils.ts", "/src/lib/utils.ts",
      "src/contexts/AuthContext.tsx", "/src/contexts/AuthContext.tsx",
      "src/hooks/useFirestore.ts", "/src/hooks/useFirestore.ts",
      "src/hooks/useStorage.ts", "/src/hooks/useStorage.ts",
      "src/components/auth/LoginForm.tsx", "/src/components/auth/LoginForm.tsx",
      "src/components/auth/SignupForm.tsx", "/src/components/auth/SignupForm.tsx",
      "src/components/auth/ProtectedRoute.tsx", "/src/components/auth/ProtectedRoute.tsx",
      "src/components/auth/UserMenu.tsx", "/src/components/auth/UserMenu.tsx",
      "src/components/auth/index.ts", "/src/components/auth/index.ts",
      // UI components
      "src/components/ui/button.tsx", "/src/components/ui/button.tsx",
      "src/components/ui/card.tsx", "/src/components/ui/card.tsx",
      "src/components/ui/input.tsx", "/src/components/ui/input.tsx",
      "src/components/ui/badge.tsx", "/src/components/ui/badge.tsx",
      "src/components/ui/separator.tsx", "/src/components/ui/separator.tsx",
      "src/components/ui/index.ts", "/src/components/ui/index.ts",
      // Entry points
      "src/main.tsx", "/src/main.tsx",
      "src/ErrorBoundary.tsx", "/src/ErrorBoundary.tsx",
    ]);

    for (const [path, content] of Object.entries(files)) {
      // Skip protected files - always use template version
      const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
      if (PROTECTED_FILES.has(path) || PROTECTED_FILES.has(normalizedPath)) {
        console.log(`[E2B] Skipping protected file: ${path}`);
        continue;
      }

      const fullPath = `/home/user/project${path.startsWith("/") ? path : "/" + path}`;

      // Collect parent directories
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir && dir !== "/home/user/project") {
        dirs.add(dir);
      }

      // Sanitize code: remove .tsx/.jsx extensions from imports
      let cleanContent = content;
      cleanContent = cleanContent.replace(/from\s+["'](.+?)\.(tsx|jsx)["']/g, 'from "$1"');

      // Ensure React import exists in component files (but not in ui/ or auth/ which already have it)
      const isComponentFile = fullPath.includes('/components/') && fullPath.endsWith('.tsx');
      const isPrebuiltComponent = fullPath.includes('/components/ui/') || fullPath.includes('/components/auth/');
      const hasReactImport = cleanContent.includes('import React') || cleanContent.includes('import * as React');

      if (isComponentFile && !isPrebuiltComponent && !hasReactImport) {
        cleanContent = `import React from 'react'\n${cleanContent}`;
      }

      fileArray.push({ path: fullPath, data: cleanContent });
    }

    // Create all directories in order (sorted to create parents first)
    const sortedDirs = Array.from(dirs).sort();
    console.log(`[E2B] Creating ${sortedDirs.length} directories:`, sortedDirs);

    for (const dir of sortedDirs) {
      try {
        await sandbox.files.makeDir(dir);
      } catch (e) {
        // Directory might already exist
        console.log(`[E2B] Directory ${dir} may already exist`);
      }
    }

    // Write all files at once using batch API
    console.log(`[E2B] Writing ${fileArray.length} files...`);

    // Log App.tsx content for debugging
    const appFile = fileArray.find(f => f.path.includes('App.tsx'));
    if (appFile) {
      console.log("[E2B] App.tsx content (first 500 chars):", appFile.data.slice(0, 500));
    }

    await sandbox.files.write(fileArray);
    console.log(`[E2B] Successfully wrote ${fileArray.length} files`);

    // === AUTO-GENERATE MISSING PAGES ===
    // Check App.tsx for imports from ./pages/* and create stub pages if missing
    if (appFile) {
      const writtenPaths = new Set(fileArray.map(f => f.path));
      const pageImportRegex = /import\s+(\w+)\s+from\s+["']\.\/pages\/(\w+)["']/g;
      const missingPages: { path: string; name: string }[] = [];

      let match;
      while ((match = pageImportRegex.exec(appFile.data)) !== null) {
        const componentName = match[1];
        const pageName = match[2];
        const pagePath = `/home/user/project/src/pages/${pageName}.tsx`;

        if (!writtenPaths.has(pagePath)) {
          missingPages.push({ path: pagePath, name: componentName });
        }
      }

      if (missingPages.length > 0) {
        console.log(`[E2B] Detected ${missingPages.length} missing pages, auto-generating:`, missingPages.map(p => p.name));

        const stubPages = missingPages.map(({ path, name }) => ({
          path,
          data: `import React from 'react';

export default function ${name}() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-4">${name}</h1>
        <p className="text-muted-foreground">This page is under construction.</p>
      </div>
    </div>
  );
}
`
        }));

        await sandbox.files.write(stubPages);
        console.log(`[E2B] Auto-generated ${stubPages.length} stub pages`);
      }
    }

    // Verify files were written
    const verifyResult = await sandbox.commands.run("find /home/user/project -type f | head -20", {
      cwd: "/home/user/project",
    });
    console.log("[E2B] Files in sandbox:", verifyResult.stdout);

    return NextResponse.json({
      success: true,
      filesWritten: fileArray.length,
      files: verifyResult.stdout,
    });
  } catch (error) {
    console.error("[E2B] Error writing files:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error writing files",
    }, { status: 500 });
  }
}

/**
 * Run a shell command
 */
async function runCommand(sessionId: string, command: string, args: string[] = []) {
  const sandbox = activeSandboxes.get(sessionId);
  if (!sandbox) {
    return NextResponse.json(
      { error: "Sandbox not found" },
      { status: 404 }
    );
  }

  console.log(`[E2B] Running: ${command} ${args.join(" ")}`);

  const result = await sandbox.commands.run(`${command} ${args.join(" ")}`, {
    cwd: "/home/user/project",
  });

  return NextResponse.json({
    success: result.exitCode === 0,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

/**
 * Start dev server and return URL
 */
async function startDevServer(sessionId: string) {
  const sandbox = activeSandboxes.get(sessionId);
  if (!sandbox) {
    console.error(`[E2B] Sandbox not found for session: ${sessionId}`);
    console.error(`[E2B] Active sandboxes: ${Array.from(activeSandboxes.keys()).join(", ")}`);
    return NextResponse.json(
      { error: "Sandbox not found. It may have expired or been destroyed." },
      { status: 404 }
    );
  }

  try {
    // List files to verify project state
    console.log("[E2B] Verifying files in /home/user/project...");
    const listResult = await sandbox.commands.run("ls -la /home/user/project && echo '---' && ls -la /home/user/project/src 2>/dev/null || echo 'No src dir'", {
      cwd: "/home/user/project",
    });
    console.log("[E2B] Files in project:\n", listResult.stdout);

    // Verify package.json exists (should always exist due to template)
    const packageCheck = await sandbox.commands.run("cat /home/user/project/package.json | head -3", {
      cwd: "/home/user/project",
    });
    console.log("[E2B] package.json:\n", packageCheck.stdout);

    console.log("[E2B] Installing dependencies (this may take a minute)...");

    // Install dependencies with verbose output
    const installResult = await sandbox.commands.run("npm install 2>&1", {
      cwd: "/home/user/project",
      timeoutMs: 180000, // 3 minutes for install
    });

    console.log("[E2B] npm install completed with exit code:", installResult.exitCode);
    if (installResult.stdout) {
      console.log("[E2B] npm install output (last 500 chars):", installResult.stdout.slice(-500));
    }
    if (installResult.stderr && installResult.exitCode !== 0) {
      console.error("[E2B] npm install stderr:", installResult.stderr.slice(-500));
    }

    if (installResult.exitCode !== 0) {
      return NextResponse.json({
        success: false,
        error: "npm install failed",
        stdout: installResult.stdout?.slice(-1000),
        stderr: installResult.stderr?.slice(-1000),
      });
    }

    console.log("[E2B] Dependencies installed, starting dev server...");

    // Start dev server using nohup to keep it running
    // Don't wait for it to complete - use a short timeout and let it run in background
    // DANGEROUSLY_DISABLE_HOST_CHECK bypasses Vite's host verification for E2B dynamic URLs
    sandbox.commands.run(
      "DANGEROUSLY_DISABLE_HOST_CHECK=true nohup npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/vite.log 2>&1 &",
      {
        cwd: "/home/user/project",
        timeoutMs: 2000,
      }
    ).catch(() => {
      // Expected to "fail" because the process runs in background
      console.log("[E2B] Dev server started in background");
    });

    // Wait for server to start
    console.log("[E2B] Waiting for dev server to start...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if server is running
    const psCheck = await sandbox.commands.run("ps aux | grep -E 'vite|node' | grep -v grep || echo 'NO_PROCESS'", {
      cwd: "/home/user/project",
    });
    console.log("[E2B] Running processes:", psCheck.stdout);

    // Check Vite logs for errors
    const viteLogCheck = await sandbox.commands.run("cat /tmp/vite.log 2>/dev/null | tail -50 || echo 'No vite log'", {
      cwd: "/home/user/project",
    });
    console.log("[E2B] Vite log (last 50 lines):\n", viteLogCheck.stdout);

    // Also check for any compilation errors in console
    const errorCheck = await sandbox.commands.run("cat /tmp/vite.log 2>/dev/null | grep -i 'error\\|failed\\|cannot' | head -20 || echo 'No errors found'", {
      cwd: "/home/user/project",
    });
    console.log("[E2B] Vite errors:\n", errorCheck.stdout);

    // Get the public URL
    const host = sandbox.getHost(5173);
    const url = `https://${host}`;
    console.log("[E2B] Preview URL:", url);

    return NextResponse.json({
      success: true,
      url,
      installLogs: installResult.stdout,
      processes: psCheck.stdout,
    });
  } catch (error) {
    console.error("[E2B] Error in startDevServer:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error starting dev server",
    });
  }
}

/**
 * Destroy sandbox
 */
async function destroySandbox(sessionId: string) {
  const sandbox = activeSandboxes.get(sessionId);
  if (!sandbox) {
    return NextResponse.json({ success: true, message: "No sandbox to destroy" });
  }

  console.log(`[E2B] Destroying sandbox: ${sessionId}`);
  await sandbox.kill();
  activeSandboxes.delete(sessionId);

  return NextResponse.json({
    success: true,
    message: "Sandbox destroyed",
  });
}

/**
 * Debug sandbox - check health, processes, and logs
 */
async function debugSandbox(sessionId: string) {
  const sandbox = activeSandboxes.get(sessionId);
  if (!sandbox) {
    return NextResponse.json({
      success: false,
      error: "Sandbox not found",
      activeSandboxes: Array.from(activeSandboxes.keys()),
    });
  }

  try {
    // Get running processes
    const psResult = await sandbox.commands.run(
      "ps aux | head -20",
      { cwd: "/home/user/project" }
    );

    // Get Vite log
    const viteLog = await sandbox.commands.run(
      "cat /tmp/vite.log 2>/dev/null || echo 'No vite log'",
      { cwd: "/home/user/project" }
    );

    // Check port 5173
    const portCheck = await sandbox.commands.run(
      "netstat -tlnp 2>/dev/null | grep 5173 || ss -tlnp | grep 5173 || echo 'Port 5173 not listening'",
      { cwd: "/home/user/project" }
    );

    // List project files
    const files = await sandbox.commands.run(
      "find /home/user/project -type f -name '*.ts*' -o -name '*.js*' | head -20",
      { cwd: "/home/user/project" }
    );

    // Check if node_modules exists
    const nodeModules = await sandbox.commands.run(
      "ls /home/user/project/node_modules 2>/dev/null | wc -l || echo '0'",
      { cwd: "/home/user/project" }
    );

    // Try curl to localhost
    const curlTest = await sandbox.commands.run(
      "curl -s http://localhost:5173 2>&1 | head -20 || echo 'curl failed'",
      { cwd: "/home/user/project" }
    );

    const host = sandbox.getHost(5173);

    return NextResponse.json({
      success: true,
      sessionId,
      sandboxId: sandbox.sandboxId,
      previewUrl: `https://${host}`,
      processes: psResult.stdout,
      viteLog: viteLog.stdout,
      portCheck: portCheck.stdout,
      projectFiles: files.stdout,
      nodeModulesCount: nodeModules.stdout?.trim(),
      curlTest: curlTest.stdout,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Debug failed",
    });
  }
}

/**
 * Get template files - returns all default + Firebase template files for display in code view
 */
function getTemplateFiles() {
  const allFiles = { ...DEFAULT_TEMPLATE_FILES, ...FIREBASE_TEMPLATE_FILES };
  return NextResponse.json({
    success: true,
    files: allFiles,
  });
}
