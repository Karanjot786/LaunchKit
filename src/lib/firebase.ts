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

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(defaultConfig);
} else {
    app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Auth functions
export async function signInWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
}

export async function signInWithGithub() {
    return signInWithPopup(auth, githubProvider);
}

export async function logout() {
    return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
}

// Firestore helpers
export async function createDocument(
    collectionName: string,
    data: Record<string, unknown>
) {
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function getDocument(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function updateDocument(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
) {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

export async function deleteDocument(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
}

export async function getCollection(collectionName: string) {
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
    const docRef = await addDoc(collection(db, "builder_projects"), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function getProject(projectId: string): Promise<BuilderProject | null> {
    const docSnap = await getDoc(doc(db, "builder_projects", projectId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as BuilderProject : null;
}

export async function updateProjectData(projectId: string, data: Partial<BuilderProject>): Promise<void> {
    await updateDoc(doc(db, "builder_projects", projectId), {
        ...data,
        updatedAt: Timestamp.now(),
    });
}

export async function getUserProjects(userId: string): Promise<BuilderProject[]> {
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
    const q = query(
        collection(db, "builder_projects", projectId, "messages"),
        orderBy("createdAt", "asc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as ChatMessage);
}

export { app };
