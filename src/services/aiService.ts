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

    // 3. Unique, Nuanced Generation (Anti-Plagiarism)
    // We shuffle sentences to ensure each generation uses different content parts
    const shuffledSentences = [...sentences].sort(() => 0.5 - Math.random());
    const keywords = extractKeywords(cleanText);

    for (let i = 0; i < shuffledSentences.length && questions.length < 20; i++) {
        const sentence = shuffledSentences[i].trim();
        if (sentence.length < 40) continue;

        const concepts = identifyConcepts(sentence, keywords);
        if (concepts.length === 0) continue;

        const target = concepts[Math.floor(Math.random() * concepts.length)];

        // NO META-TALK: Start directly with the question.
        // Phrasing focuses on the concept but removes all conversational filler.
        const questionText = sentence.replace(new RegExp(target, 'i'), '__________');

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
            explanation: `Corrective Analysis: The correct term is "${target}". In this context, the document establishes it as the primary functional component. Other options are incorrect as they do not fulfill the specific role described in the text.`,
            reinforcement: `Reinforcement Explanation: Correct. Your selection of "${target}" demonstrates a sound understanding of how this concept functions within the ${subject} framework described.`,
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
