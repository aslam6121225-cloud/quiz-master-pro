export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number;
    explanation: string;      // Corrective logic
    reinforcement: string;    // Reinforcement logic
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

export async function generateQuizFromText(text: string, title: string): Promise<QuizData> {
    // 1. Intelligent Ingestion: Filter Noise
    const cleanText = text
        .replace(/\f/g, '\n') // Handle page breaks
        .replace(/(Page \d+ of \d+|Institutional Header|Confidential|Footer:.*)/gi, '') // Filter administrative metadata
        .split('\n')
        .filter(line => line.trim().length > 20) // Filter short lines/noise
        .join(' ');

    // 2. Subject Identification
    const subject = identifySubject(cleanText);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
    const questions: Question[] = [];

    // Definition patterns to identify sentences that are likely definitions
    const definitionPatterns = [
        /is defined as/i,
        /refers to/i,
        /is known as/i,
        /is a type of/i,
        /means that/i,
        /is the process of/i,
        /represents the/i,
        /is essentially/i,
        /(?:\b\w+\b\s+){0,3}is a\b/i // e.g., "Photosynthesis is a..."
    ];

    // Filter for sentences that look like definitions
    const definitionSentences = sentences.filter(sentence =>
        definitionPatterns.some(pattern => pattern.test(sentence)) && sentence.length > 40
    );

    // If we don't have enough definition sentences, fallback to regular sentences
    const poolOfSentences = definitionSentences.length >= 5 ? definitionSentences : sentences;

    // We shuffle sentences to ensure each generation uses different content parts
    const shuffledSentences = [...poolOfSentences].sort(() => 0.5 - Math.random());
    const keywords = extractKeywords(cleanText);

    for (let i = 0; i < shuffledSentences.length && questions.length < 20; i++) {
        const sentence = shuffledSentences[i].trim();
        if (sentence.length < 40) continue;

        const concepts = identifyConcepts(sentence, keywords);
        if (concepts.length === 0) continue;

        // Try to find the concept that appears BEFORE the definition word to blank it out
        // e.g. in "Photosynthesis is a process...", we want to blank out "Photosynthesis"
        let target = concepts[Math.floor(Math.random() * concepts.length)];

        for (const pattern of definitionPatterns) {
            const match = sentence.match(pattern);
            if (match && match.index !== undefined) {
                const beforeDef = sentence.substring(0, match.index);
                const conceptsBeforeDef = identifyConcepts(beforeDef, keywords);
                if (conceptsBeforeDef.length > 0) {
                    target = conceptsBeforeDef[0];
                    break;
                }
            }
        }

        // NO META-TALK: Start directly with the question.
        // Phrasing focuses on the concept but removes all conversational filler.
        const questionText = sentence.replace(new RegExp(target, 'ig'), '__________');

        const distractors = keywords
            .filter(k => k.toLowerCase() !== target.toLowerCase())
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        if (distractors.length < 3) continue;

        const options = [target, ...distractors].sort(() => 0.5 - Math.random());
        const correctIdx = options.findIndex(o => o.toLowerCase() === target.toLowerCase());

        questions.push({
            id: `q-${questions.length}`,
            text: questionText,
            options,
            correctAnswer: correctIdx,
            explanation: `Corrective Analysis: The correct term is "${target}". The document defines this specific concept within the context of the sentence provided. Other options are alternative concepts found in the text but do not match this definition.`,
            reinforcement: `Reinforcement Explanation: Correct. Your selection of "${target}" demonstrates a sound understanding of its definition within the ${subject} framework described.`,
            difficulty: questions.length % 2 === 0 ? 'accessible' : 'advanced'
        });
    }

    // 4. Mastery Pack Integration
    const masteryPack = generateMasteryPack(subject);

    return {
        title: title.replace('.pdf', ''),
        subject,
        questions,
        masteryPack,
        createdAt: new Date().toISOString(),
        questionCount: questions.length
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

function identifyConcepts(sentence: string, keywords: string[]): string[] {
    return keywords.filter(k => sentence.toLowerCase().includes(k.toLowerCase()));
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
    // Simple keyword extraction: words longer than 5 chars, excluding common ones
    const words = text.toLowerCase().match(/\b(\w{6,})\b/g) || [];
    const freqMap: { [key: string]: number } = {};

    words.forEach(w => {
        freqMap[w] = (freqMap[w] || 0) + 1;
    });

    return Object.keys(freqMap)
        .sort((a, b) => freqMap[b] - freqMap[a])
        .slice(0, 50);
}
