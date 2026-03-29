# AI-Enabled Quiz Master Pro

An MNC-level architectural implementation of a dynamic, AI-powered assessment engine that analyzes uploaded educational documents (PDFs), extracts core concepts, and dynamically generates unique quizzes.

## Key Highlights of the Implementation

*   **Unique Quiz Generation**: Even if multiple users upload the exact same material, the platform prevents duplication by algorithmically shuffling questions and answer permutations via our Uniqueness Engine.
*   **Anti-Theft Mechanism**: No two quizzes look identical. The AI dynamically samples different structural chunks from the document to ensure fairness, originality, and security against cheating.
*   **Professional Formatting**: The AI is strictly prompted to avoid predefined or amateur quiz syntax (e.g., "Identify the concept: ..."). Instead, it utilizes structural context to produce natural, industry-standard question phrasing that tests analytical understanding.
*   **Randomized Answer Sets**: Options are intelligently shuffled at runtime, meaning no one can guess patterns or assume repeated answers across different sessions.
*   **Concept-Driven Design**: Every quiz is built actively from the actual semantic content of the PDF rather than generic stored templates. This makes the dynamically generated assessments completely indistinguishable from manually crafted professional quizzes.

## Architecture & Workflow

This system ensures that the quizzes generated impress participants and consistently meet the expectations of an MNC-level industrial project — entirely free from repetition, predictable memory structures, or weak distractors.

Powered by Gemini 2.5 Flash API and local JavaScript parsing logic.
