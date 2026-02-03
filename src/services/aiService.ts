export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // Index of the correct option
}

export interface QuizData {
    title: string;
    questions: Question[];
    createdAt: string;
    questionCount: number;
}

export async function generateQuizFromText(text: string, title: string): Promise<QuizData> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const questions: Question[] = [];

    // A "Smart" heuristic to find potential questions:
    // Look for sentences that look like definitions or statements of fact.
    // We'll extract keywords and create distractors.

    const keywords = extractKeywords(text);

    let qCount = Math.min(20, Math.floor(sentences.length / 3));
    if (qCount < 5) qCount = Math.min(sentences.length, 10); // Minimum attempts

    for (let i = 0; i < qCount; i++) {
        const sentence = sentences[i].trim();
        if (sentence.length < 30) continue;

        // Split sentence into words
        const words = sentence.split(' ');
        const targetWordIndex = Math.floor(Math.random() * (words.length - 1));
        const targetWord = words[targetWordIndex].replace(/[.,]/g, '');

        if (targetWord.length < 4) continue;

        const questionText = sentence.replace(targetWord, '__________');

        // Generate distractors from other keywords
        const distractors = keywords
            .filter(k => k.toLowerCase() !== targetWord.toLowerCase())
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        const options = [targetWord, ...distractors].sort(() => 0.5 - Math.random());
        const correctIdx = options.indexOf(targetWord);

        questions.push({
            id: `q-${i}`,
            text: questionText,
            options,
            correctAnswer: correctIdx
        });
    }

    return {
        title: title.replace('.pdf', ''),
        questions: questions.slice(0, 20),
        createdAt: new Date().toISOString(),
        questionCount: Math.min(questions.length, 20)
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
