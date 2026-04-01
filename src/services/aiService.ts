import { showInfoModal } from './uiService';
export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;      // Corrective logic
    reinforcement: string;    // Reinforcement logic
    rationale: string;        // Concept Insight (1-2 sentence explanation)
    difficulty: 'accessible' | 'advanced';
}

export interface MasteryPack {
    youtubeLinks: string[];
    wikipediaLink: string;
    searchQuery: string;
}

export interface QuizData {
    title: string;
    subject: string;
    questions: Question[];
    masteryPack: MasteryPack;
    createdAt: string;
    questionCount: number;
}

/**
 * Robust Regex Extraction (The 'Cleaner')
 * Removes markdown backticks and any text before/after the JSON array.
 */
const cleanAIResponse = (rawResponse: string) => {
    try {
        const jsonRegex = /\[\s*\{.*\}\s*\]/s; 
        const match = rawResponse.match(jsonRegex);
        return match ? match[0] : rawResponse;
    } catch (e) {
        return rawResponse;
    }
};

/**
 * Automatic JSON Repair (The 'Healer')
 * Strips trailing commas and attempts common repairs.
 */
const healJSON = (jsonBody: string) => {
    return jsonBody
        .replace(/,\s*\]/g, ']') // Trailing comma in array
        .replace(/,\s*\}/g, '}'); // Trailing comma in object
};

let geminiLockoutUntil = 0;

export async function generateQuizFromText(text: string, title: string, questionCount: number = 10, difficulty: string = 'mixed', weakTopics: string[] = [], isLite: boolean = false): Promise<QuizData> {
    const updateTicker = (msg: string) => {
        const ticker = document.getElementById('status-ticker');
        if (ticker) ticker.textContent = msg.toUpperCase();
    };

    // 1. Content Extraction & Deep Clean (Chunking for Stability)
    const cleanText = text
        .replace(/[^a-zA-Z0-9 .?,]/g, '') // Strip everything except basic alpha-numeric
        .substring(0, isLite ? 2500 : 4000);

    const subject = identifySubject(cleanText);
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const hfToken = import.meta.env.VITE_HF_TOKEN || "";
    const hfModel = "Qwen/Qwen2.5-7B-Instruct"; // Upgraded from Mistral-7B (deprecated on HF router)

    const promptText = isLite 
        ? `STRICT LITE-RETENTION: Generate exactly 3 simple conceptual multiple-choice questions from this text. Output raw JSON array only. Each object must have "text", "options" (4 items), "correctAnswer" (0-3), and "rationale".`
        : `You are a Senior Technical Lead at a Multinational Enterprise. Your task is to generate exactly ${questionCount} 'Scenario-Based' high-complexity questions.

STRICT DIRECTIVES:
1. MNC-MASTERY: DO NOT ask simple 'What is...' questions. Use complex, real-world engineering or IoT scenarios.
2. INSTITUTIONAL SHIELD: STRICTLY IGNORE all metadata (Faculty, Dept names, codes). Focus 100% on the technical technical content.
3. RATIONALE HARDENING: The 'rationale' field must be a standalone academic explanation. You are FORBIDDEN from mentioning options (A, B, C, D) or saying 'Option X is correct'.
4. OUTPUT FORMAT: Each object MUST include "text", "options", "correctAnswer", and "rationale".

JSON SCHEMA:
[
  {
    "text": "...", "options": ["...", "...", "...", "..."], "correctAnswer": 0, "rationale": "...", "difficulty": "advanced"
  }
]`;

    const finalPrompt = `${promptText}\n\nText Segment for Analysis:\n${cleanText}`;

    // --- PHASE 1: PRIMARY (GEMINI 2.5 FLASH) ---
    const now = Date.now();
    if (now > geminiLockoutUntil) {
        try {
            updateTicker(`Executing Primary Strategy (Gemini 2.5)...`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }],
                    generationConfig: { 
                        responseMimeType: "application/json", 
                        temperature: isLite ? 0.3 : 0.7 
                    }
                })
            });

            if (response.status === 429) {
                console.warn("Gemini Rate Limit. Pivoting to Mistral Engine.");
                geminiLockoutUntil = Date.now() + 60000; // 60s Lockout
                throw new Error("Gemini_Pivot_Required"); 
            }

            if (!response.ok) throw new Error(`Gemini_Protocol_Exception: ${response.status}`);

            const data = await response.json();
            const rawBody = data.candidates[0].content.parts[0].text;
            
            const forceParse = (text: string) => {
                const start = text.indexOf('[');
                const end = text.lastIndexOf(']') + 1;
                if (start === -1 || end === 0) throw new Error("No JSON array found");
                return JSON.parse(text.substring(start, end));
            };

            const aiQuestions = forceParse(healJSON(rawBody));
            return finalizeQuizBundle(aiQuestions, title, subject);

        } catch (primaryErr) {
            console.warn("Gemini Primary failure. Attempting Instant Pivot...", primaryErr);
        }
    }

    // --- PHASE 2: INSTANT PIVOT (HUGGING FACE MISTRAL-7B) ---
    try {
        updateTicker("Secondary AI Engine (Qwen2.5) Engaged...");
        
        // OpenAI-compatible HuggingFace Router endpoint (new standard, replaces deprecated api-inference.huggingface.co)
        const hfChatUrl = `https://router.huggingface.co/v1/chat/completions`;
        
        const hfResponse = await fetch(hfChatUrl, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: hfModel,
                messages: [{ role: "user", content: finalPrompt }],
                max_tokens: 2000,
                temperature: 0.2
            })
        });

        if (!hfResponse.ok) {
            const errText = await hfResponse.text();
            throw new Error(`HuggingFace_Protocol_Exception: ${hfResponse.status} - ${errText}`);
        }

        const hfData = await hfResponse.json();
        const responseText = hfData.choices[0].message.content;
        
        const forceParse = (text: string) => {
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']') + 1;
            if (start === -1 || end === 0) throw new Error("No JSON array found in HF response");
            return JSON.parse(text.substring(start, end));
        };

        const aiQuestions = forceParse(healJSON(responseText));
        return finalizeQuizBundle(aiQuestions, title, subject);

    } catch (fallbackErr) {
        console.error("Dual-AI Secondary Failure:", fallbackErr);
        
        if (!isLite) {
            updateTicker("Primary Failure. Re-scaling to Lite Protocol...");
            return generateQuizFromText(text, title, 3, 'mixed', [], true);
        }
        
        throw new Error("STABILITY RE-CALIBRATION: Both AI engines are unavailable. Please check your API keys and try again.");
    }
}

/**
 * Standardized Output & Normalization
 */
function finalizeQuizBundle(questions: any[], title: string, subject: string): QuizData {
    const normalized = questions.map((q, idx) => ({
        id: `q-${idx}`,
        text: q.text || q.question, // Universal mapping
        options: q.options,
        correctAnswer: q.correctAnswer ?? q.answer,
        explanation: q.rationale,
        reinforcement: "MNC Mastery Verified.",
        rationale: q.rationale,
        difficulty: 'advanced' as const
    }));

    return {
        title: title.replace('.pdf', ''),
        subject,
        questions: normalized,
        masteryPack: generateMasteryPack(subject),
        createdAt: new Date().toISOString(),
        questionCount: normalized.length
    };
}

function identifySubject(text: string): string {
    const textLower = text.toLowerCase();
    if (textLower.includes('python') || textLower.includes('javascript') || textLower.includes('programming')) return 'Computer Science';
    if (textLower.includes('medical') || textLower.includes('anatomy') || textLower.includes('clinical')) return 'Medicine';
    if (textLower.includes('law') || textLower.includes('legal') || textLower.includes('jurisdiction')) return 'Law';
    if (textLower.includes('engine') || textLower.includes('circuit') || textLower.includes('mechanical')) return 'Engineering';
    return 'General Professional Domain';
}

function generateMasteryPack(subject: string): MasteryPack {
    const encodedSubject = encodeURIComponent(subject);
    return {
        youtubeLinks: [
            `https://www.youtube.com/results?search_query=${encodedSubject}+fundamentals`,
            `https://www.youtube.com/results?search_query=${encodedSubject}+advanced+concepts`,
            `https://www.youtube.com/results?search_query=${encodedSubject}+case+studies`
        ],
        wikipediaLink: `https://en.wikipedia.org/wiki/${encodedSubject.replace(/%20/g, '_')}`,
        searchQuery: `https://www.google.com/search?q=research+papers+on+${encodedSubject}+2024`
    };
}

function extractKeywords(text: string): string[] {
    const stopWords = new Set(['therefore', 'however', 'although', 'because', 'without', 'throughout', 'instead', 'whereas', 'otherwise', 'nevertheless', 'furthermore', 'meanwhile']);
    const words = text.toLowerCase().match(/\b(\w{6,})\b/g) || [];
    const freqMap: { [key: string]: number } = {};

    words.forEach(w => {
        if (stopWords.has(w)) return;
        freqMap[w] = (freqMap[w] || 0) + 1;
    });

    return Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]).slice(0, 50);
}
