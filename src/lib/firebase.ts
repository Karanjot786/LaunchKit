import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    signOut,
    onAuthStateChanged,
    User,
    Auth,
} from "firebase/auth";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    Firestore,
} from "firebase/firestore";

// Firebase config - will be set dynamically for generated apps
const defaultConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Check if Firebase is configured
const isConfigured = Boolean(defaultConfig.apiKey && defaultConfig.projectId);

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
    if (!getApps().length) {
        app = initializeApp(defaultConfig);
    } else {
        app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
}

// Export with null checks
export { auth, db };

// Helper to check if Firebase is ready
export function isFirebaseReady(): boolean {
    return isConfigured && app !== null;
}

// Auth providers - only create if configured
export const googleProvider = isConfigured ? new GoogleAuthProvider() : null;
export const githubProvider = isConfigured ? new GithubAuthProvider() : null;

// Auth functions with null checks
export async function signInWithEmail(email: string, password: string) {
    if (!auth) throw new Error("Firebase not configured");
    return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
    if (!auth) throw new Error("Firebase not configured");
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
    if (!auth || !googleProvider) throw new Error("Firebase not configured");
    return signInWithPopup(auth, googleProvider);
}

export async function signInWithGithub() {
    if (!auth || !githubProvider) throw new Error("Firebase not configured");
    return signInWithPopup(auth, githubProvider);
}

function getFirebaseAuthErrorCode(error: unknown): string | null {
    if (!error || typeof error !== "object") {
        return null;
    }

    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
        return code;
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
        const match = message.match(/\((auth\/[^)]+)\)/);
        if (match) {
            return match[1];
        }
    }

    return null;
}

export function getAuthErrorMessage(error: unknown): string | null {
    const code = getFirebaseAuthErrorCode(error);

    if (code === "auth/popup-closed-by-user") {
        return null;
    }

    if (code === "auth/popup-blocked") {
        return "Popup was blocked. Please allow popups in your browser and try again.";
    }

    if (code === "auth/unauthorized-domain") {
        return "This domain is not authorized for Firebase sign-in. Add localhost and your deployed domain in Firebase Authentication > Settings > Authorized domains.";
    }

    return "Sign in failed. Please try again.";
}

export async function logout() {
    if (!auth) throw new Error("Firebase not configured");
    return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
    if (!auth) {
        // Return a no-op unsubscribe if not configured
        callback(null);
        return () => { };
    }
    return onAuthStateChanged(auth, callback);
}

// Firestore helpers with null checks
export async function createDocument(
    collectionName: string,
    data: Record<string, unknown>
) {
    if (!db) throw new Error("Firebase not configured");
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function getDocument(collectionName: string, docId: string) {
    if (!db) throw new Error("Firebase not configured");
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function updateDocument(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
) {
    if (!db) throw new Error("Firebase not configured");
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteDocument(collectionName: string, docId: string) {
    if (!db) throw new Error("Firebase not configured");
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
}

export async function getCollection(collectionName: string) {
    if (!db) throw new Error("Firebase not configured");
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Waitlist specific
export async function addToWaitlist(email: string, source?: string) {
    return createDocument("waitlist", {
        email,
        source: source || "direct",
    });
}

// Survey responses
export async function saveSurveyResponse(
    projectId: string,
    responses: Record<string, unknown>
) {
    return createDocument(`projects/${projectId}/surveys`, responses);
}

// Project types for builder
export interface BuilderProject {
    id?: string;
    userId: string;
    name: string;
    tagline: string;
    idea: string;
    logo: string | null;
    colorPalette: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    validation: Record<string, unknown>;
    sandboxId: string | null;
    sandboxUrl: string | null;
    files: Record<string, string>;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface ChatMessage {
    id?: string;
    projectId: string;
    role: "user" | "assistant";
    content: string;
    files?: Record<string, string>;
    createdAt?: Timestamp;
}

// Project CRUD
export async function createProject(data: Omit<BuilderProject, "id" | "createdAt" | "updatedAt">): Promise<string> {
    if (!db) throw new Error("Firebase not configured");
    const docRef = await addDoc(collection(db, "builder_projects"), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function getProject(projectId: string): Promise<BuilderProject | null> {
    if (!db) throw new Error("Firebase not configured");
    const docSnap = await getDoc(doc(db, "builder_projects", projectId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as BuilderProject : null;
}

export async function updateProjectData(projectId: string, data: Partial<BuilderProject>): Promise<void> {
    if (!db) throw new Error("Firebase not configured");
    await updateDoc(doc(db, "builder_projects", projectId), {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

export async function getUserProjects(userId: string): Promise<BuilderProject[]> {
    if (!db) throw new Error("Firebase not configured");
    const q = query(
        collection(db, "builder_projects"),
        where("userId", "==", userId),
        orderBy("updatedAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as BuilderProject);
}

// Message CRUD
export async function addChatMessage(projectId: string, role: "user" | "assistant", content: string, files?: Record<string, string>): Promise<string> {
    if (!db) throw new Error("Firebase not configured");
    const docRef = await addDoc(collection(db, "builder_projects", projectId, "messages"), {
        projectId,
        role,
        content,
        files: files || {},
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function getProjectMessages(projectId: string): Promise<ChatMessage[]> {
    if (!db) throw new Error("Firebase not configured");
    const q = query(
        collection(db, "builder_projects", projectId, "messages"),
        orderBy("createdAt", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as ChatMessage);
}

// Version History types
export interface VersionSnapshot {
    id?: string;
    timestamp: number;
    files: Record<string, string>;
    description: string;
    type: "auto" | "manual" | "generation";
}

// Version History CRUD
export async function saveVersionSnapshot(
    projectId: string,
    snapshot: Omit<VersionSnapshot, "id">
): Promise<string> {
    if (!db) throw new Error("Firebase not configured");
    const docRef = await addDoc(
        collection(db, "builder_projects", projectId, "version_history"),
        {
            ...snapshot,
            createdAt: Timestamp.now(),
        }
    );
    return docRef.id;
}

export async function getVersionSnapshots(
    projectId: string,
    limit: number = 50
): Promise<VersionSnapshot[]> {
    if (!db) throw new Error("Firebase not configured");
    const q = query(
        collection(db, "builder_projects", projectId, "version_history"),
        orderBy("timestamp", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
        .slice(0, limit)
        .map(d => ({ id: d.id, ...d.data() }) as VersionSnapshot)
        .sort((a, b) => a.timestamp - b.timestamp); // Return in chronological order
}

export async function clearVersionHistory(projectId: string): Promise<void> {
    if (!db) throw new Error("Firebase not configured");
    const snapshot = await getDocs(
        collection(db, "builder_projects", projectId, "version_history")
    );
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
}

export { app };
