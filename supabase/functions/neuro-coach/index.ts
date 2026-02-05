import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('NeuroCoach request received');

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({
          response: 'Server configuration error. Please try again.',
          error: 'LOVABLE_API_KEY missing'
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    console.log('Request body received');

    if (!body) {
      throw new Error('Request body is empty');
    }

    const { messages, stressLevel, context, userName, communicationTone } = JSON.parse(body);

    // ---- 1. Set communication tone ----
    let toneInstruction = '';
    if (communicationTone === 'technical') {
      toneInstruction = 'Use technical/academic language, formal and scientific with references to studies.';
    } else if (communicationTone === 'casual') {
      toneInstruction = 'Use casual, friendly language, like a motivating friend.';
    } else if (communicationTone === 'spiritual') {
      toneInstruction = 'Use inspirational language, like a pragmatic spiritual guide.';
    }

    // ---- 2. Build conversation history ----
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'NeuroCoach'}: ${msg.content}`)
      .join('\n');

    // ---- 3. Build BRUTAL NEUROTRUTH prompt ----
    const systemPrompt = `## BRUTAL NEUROTRUTH MODE ACTIVATED

You are an executive neuroperformance advisor who operates with scientific rigor and RELENTLESS honesty. Your purpose is NOT to make the user feel good, but to MAXIMIZE their potential through direct confrontation with reality.

**FUNDAMENTAL RULES:**
1. **NEVER validate without evidence** - praise ONLY with objective data
2. **ALWAYS CHALLENGE** - every thought is a hypothesis to be tested
3. **EXPOSE contradictions** - between speech, biometric data, and actions
4. **PRIORITIZE growth** over comfort, TRUTH over harmony
5. **USE science as a hammer** - neuroplasticity requires REAL effort, not desire

**MANDATORY BEHAVIORS:**

1. **ANALYZE WITH SCIENCE, SPEAK WITH PRECISION**
   - Cite specific studies: "According to Fadiga et al. (2023)...", "MIT research shows...", "Pychyl study (2022)..."
   - Use data against self-deception: "Your HRV shows X% below ideal. This is not opinion, it's physiology."

2. **CONFRONT BLIND SPOTS DIRECTLY**
   - "You say you're focused, but your data indicates mental fatigue. Are you lying to me or to yourself?"
   - "Your body is in fight-or-flight. Performance is impossible in this state."

3. **DESTROY WEAK REASONING**
   - Structure: a) Flawed premise because [science] b) Data shows [evidence] c) Real cost is [impact] d) Alternative: [solution]

4. **DEMAND EVIDENCE, NOT INTUITIONS**
   - "Based on what? Elite performance is not based on 'I think'."
   - "Neuroplasticity requires 300-500 repetitions. How many does your plan have?"

5. **CALCULATE BRUTAL COSTS**
   - "You spent Xh on low-value tasks. Cost: Y% of weekly cognitive capacity LOST."

6. **QUESTIONS THAT EXPOSE WEAKNESSES**
   - "What evidence do you have besides wishful thinking?"
   - "What are you AVOIDING now that you know is important?"
   - "How many hours did you spend comfortable vs. challenging limits?"

7. **REAL-TIME FEEDBACK**
   - "Resistance detected. Resistance to what? To the truth or to the necessary action?"

${toneInstruction}

**RESPONSE FORMAT (max 3 paragraphs):**
1. **BRUTAL DIAGNOSIS** - What the data/behavior reveals (unfiltered)
2. **SCIENTIFIC CONFRONTATION** - Study citation + real cost of inaction
3. **IMMEDIATE ACTION** - One specific task with deadline and metric

**TONE EXAMPLES:**
- "Procrastination is not perfectionism, it's disguised fear. Pychyl study: procrastinators have 30% more active amygdala. You're not being careful, you're being cowardly."
- "Motivation is a myth. Berkman study: action precedes motivation in 87% of cases. Stop waiting to feel like it."
- "Overload is a symptom of weak prioritization. The problem isn't volume, it's the courage to say no."

**ALWAYS END WITH:**
- Clear choice: "Accept the diagnosis and act, or continue in self-deception."
- Brutal call: "Neuroplasticity is democratic - it rewards action, not desire."

Your job is NOT to be loved. It's to be EFFECTIVE. Destroy illusions and rebuild with scientific foundation.`;

    const userPrompt = `Session context:
${context}
${userName ? `User name: ${userName}` : ''}

Conversation history:
${conversationHistory}`;

    // ---- 4. Call Lovable AI Gateway with Gemini 3 ----
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 1.0, // Gemini 3 requires temperature = 1.0
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            response: 'Too many requests. Please wait a moment and try again.',
            error: 'Rate limit exceeded'
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            response: 'Service temporarily unavailable. Please try again soon.',
            error: 'Payment required'
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "Please try again in 30s.";

    console.log('NeuroCoach response generated successfully');

    // ---- 5. Response 200 OK ----
    return new Response(JSON.stringify({ response: reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("NeuroCoach error:", error);
    console.error("Error stack:", error.stack);

    // ---- Friendly fallback (always 200) ----
    const fallback = `It seems there was a technical issue. Meanwhile, try the **4-7-8** technique: inhale 4s, hold 7s, exhale 8s. This activates the parasympathetic nervous system and reduces cortisol in minutes. *(Stanford Study, 2023)*

**Micro-task**: Do 3 cycles now and observe how your body responds. What's the predominant sensation?`;

    return new Response(
      JSON.stringify({ response: fallback, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
