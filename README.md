# ✦ LaunchKit

**From Startup Idea to Live App in Minutes**

LaunchKit takes a startup idea in plain text and produces a live, deployed web application. One AI pipeline handles market validation, branding, code generation, and deployment. Powered entirely by Gemini 3.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=for-the-badge)](https://launchkit.karanjot.co.in)
[![Gemini 3](https://img.shields.io/badge/Powered%20by-Gemini%203-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

---

## How It Works

1. **Describe your idea** in plain text
2. **Market validation** runs competitor analysis and viability scoring
3. **Feature brainstorming** prioritizes your MVP feature set
4. **Brand generation** creates names, checks domain availability, builds color palettes
5. **Logo design** generates custom logos with AI
6. **Code generation** writes a full React + Tailwind website
7. **Live preview** renders in a cloud sandbox in real-time
8. **Export** to Vercel or GitHub with one click
9. **Version history** tracks every iteration

The entire process takes under five minutes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| AI Models | Gemini 3 Pro (validation, features, code), Gemini 3 Flash (naming, colors, logos) |
| Auth & Data | Firebase Authentication, Firestore |
| Code Sandbox | E2B Cloud Sandbox |
| Deployment | Vercel |
| AI SDK | Google AI SDK (@google/genai) |

---

## Gemini 3 Integration

LaunchKit uses two Gemini 3 models across the entire pipeline. No other LLM is involved.

**Gemini 3 Pro** handles:
- Market validation with structured competitor analysis
- Feature brainstorming with MVP prioritization via function calling
- Full website code generation through streaming function calls
- Agentic mode with tool use and self-repair

**Gemini 3 Flash** handles:
- Brand name generation (sub-second responses)
- Color palette creation based on brand personality
- Logo concept generation

**Key Gemini 3 features used:**
- Streaming function calls for real-time code generation
- Structured output for market data and feature lists
- Multi-turn tool use in agentic mode
- Automatic error recovery with re-prompting

---

## Generation Modes

### Fast Mode
Single-shot generation. One API call produces all files. Best for speed.

### Agentic Mode
Multi-step generation with tool use. The model plans, writes, tests, and repairs code across multiple turns. Best for complex sites.

### Self-Healing Pipeline
If Fast Mode fails, LaunchKit falls back to Agentic Mode. If Agentic Mode encounters errors, it re-prompts with error context. Users see a working result without manual intervention.

---

## Project Structure

```
launchpad/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── builder/stream/    # Main code generation endpoint
│   │   │   ├── brand/             # Brand name generation
│   │   │   ├── colors/            # Color palette generation
│   │   │   ├── features/          # Feature brainstorming
│   │   │   ├── logo/              # Logo generation
│   │   │   ├── market/            # Market validation
│   │   │   └── export/            # Vercel/GitHub export
│   │   ├── auth/                  # Authentication pages
│   │   ├── builder/               # Builder UI (code editor + preview)
│   │   ├── dashboard/             # Project dashboard
│   │   └── page.tsx               # Landing page
│   ├── components/                # Reusable UI components
│   ├── contexts/                  # React contexts (auth, theme)
│   ├── lib/                       # Utilities (Firebase, Gemini client)
│   └── types/                     # TypeScript type definitions
├── public/                        # Static assets
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google AI API key (Gemini 3)
- Firebase project (for auth and data)
- E2B API key (for code sandbox)

### Environment Variables

Create a `.env.local` file:

```env
# Gemini 3
GOOGLE_AI_API_KEY=your_gemini_api_key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# E2B Sandbox
E2B_API_KEY=your_e2b_api_key
```

### Run Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see LaunchKit.

---

## Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Karanjot786/LaunchKit)

1. Click the button above or import the repo on Vercel
2. Add environment variables in the Vercel dashboard
3. Deploy

### Manual

```bash
npm run build
npm start
```

---

## License

MIT

---

Built with Gemini 3 for the [Google DeepMind Gemini 3 Hackathon](https://gemini3.devpost.com).
