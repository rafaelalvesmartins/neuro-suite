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
- **Primary Layer (Cloud):** Attempts to connect to **Google Gemini 2.0 Flash** via REST API for deep multimodal analysis of 3 temporal frames.
- **Secondary Layer (Edge Fallback):** If the API experiences high latency or Rate Limiting (429), the system seamlessly degrades to a local heuristic algorithm, ensuring the user always receives immediate feedback.

### API Usage Metrics (Real Implementation)
- **Model:** gemini-2.0-flash
- **Input:** 3 JPEG frames (~92KB payload)
- **Token Consumption:** ~806 prompt tokens (32 text + 774 image tokens)
- **Response Time:** ~2.6s average
- **Output:** 62 tokens of AI-generated analysis

## 🛠️ Tech Stack
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **AI:** Google Gemini 2.0 Flash (Vision/Multimodal)
- **Backend:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## 🚀 How to Run

### Prerequisites
- Node.js 18+ 
- Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation
1. Clone the repository:
```bash
git clone https://github.com/rafaelalvesmartins/neuro-suite.git
cd neuro-suite
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
VITE_GEMINI_KEY=your_gemini_api_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:8080](http://localhost:8080)

## 📊 Features Implemented
- [x] Real-time blink rate detection via webcam
- [x] Google Gemini 2.0 Flash multimodal analysis
- [x] Temporal frame sequence analysis (3 frames over 6 seconds)
- [x] Hybrid fallback architecture (API + Local)
- [x] User profile and historical scan data
- [x] NLP-based stress reduction recommendations
- [x] Supabase authentication and database integration

## 🎥 Demo
Live demo available at: [Your Vercel URL]
 
## 📝 License
MIT License - See LICENSE file for details
