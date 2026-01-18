# 🧠 NeuroHealth - AI Stress Detection Platform
> A proactive mental health platform combining Neuroscience and Multimodal AI to prevent corporate burnout.

## 🎯 The Problem
- **70% of professionals** suffer from chronic stress globally.
- Companies are **reactive**: they only detect burnout *after* the employee crashes.
- Current tools rely on subjective self-reporting (surveys), which are often inaccurate.

## 💡 The Solution
NeuroHealth monitors non-invasive vital signs via webcam in real-time:
1.  **NeuroScore:** Real-time blink rate analysis based on neuroscience markers.
2.  **Gemini Multimodal Analysis:** Captures temporal frame sequences (video) to detect progressive facial micro-expressions of fatigue.
3.  **NeuroCoach:** Provides instant NLP-based recommendations to lower stress.

## 🤖 Gemini API Integration & Hybrid Architecture
We implemented a **Resilient Hybrid Architecture** to ensure zero downtime:
- **Primary Layer (Cloud):** Attempts to connect to **Google Gemini 1.5 Flash** via REST API for deep multimodal analysis of 3 temporal frames.
- **Secondary Layer (Edge Fallback):** If the API experiences high latency or Rate Limiting (429), the system seamlessly degrades to a local heuristic algorithm, ensuring the user always receives immediate feedback.

## 🛠️ Tech Stack
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **AI:** Google Gemini 1.5 Flash (Vision/Multimodal)
- **Backend:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## 🚀 How to Run
1. Clone the repo.
2. Create a `.env` file with `VITE_GEMINI_KEY`.
3. Run `npm run dev`.
