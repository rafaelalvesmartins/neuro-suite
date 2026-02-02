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

## 🤖 Gemini 3 API Integration & Hybrid Architecture
We implemented a **Resilient Hybrid Architecture** to ensure zero downtime:
- **Primary Layer (Cloud):** Connects to **Google Gemini 3 Pro Preview** via REST API for deep multimodal analysis with advanced thinking capabilities.
- **Secondary Layer (Edge Fallback):** If the API experiences high latency or Rate Limiting (429), the system seamlessly degrades to a local heuristic algorithm, ensuring the user always receives immediate feedback.

### API Usage Metrics (Real Implementation)
- **Vision Model:** gemini-3-pro-preview (high reasoning for RAG/Vision)
- **Chat Model:** gemini-3-flash-preview (low latency for NeuroCoach)
- **Input:** 10 JPEG frames captured over 1 minute
- **Configuration:** `temperature: 1.0`, `thinkingLevel: high`, `mediaResolution: high`
- **Features:** Temporal facial analysis, stress detection, fatigue progression

### Gemini 3 Migration Notes
- SDK: `@google/genai` v1.0+
- Temperature must be 1.0 (Gemini 3 requirement)
- ThinkingConfig enabled for enhanced reasoning
- MediaResolution set to high for image analysis

## 🛠️ Tech Stack
- **Frontend:** React + TypeScript + Vite + TailwindCSS
- **AI:** Google Gemini 3 Pro/Flash Preview (Vision/Multimodal)
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
