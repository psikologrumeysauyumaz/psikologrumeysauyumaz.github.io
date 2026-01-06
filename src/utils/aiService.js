
/**
 * AI Service for analyzing psychological test results
 * Uses OpenRouter or Google Gemini API if key is provided.
 */

export class AIService {
    constructor() {
        // Vercel üzerinde Environment Variable (OPENROUTER_API_KEY) kullanılacağı için 
        // artık client tarafında key saklamaya gerek kalmadı.
    }

    /**
     * Generates a dynamic interpretation of the test result via secure Vercel edge function.
     * @param {string} testTitle 
     * @param {Object} scores - Category scores
     * @param {Object} resultProfile - The resulting profile object
     * @param {Array} userAnswers - Array of {question, answer, category} objects
     * @returns {Promise<string>} The AI interpretation
     */
    async analyzeResult(testTitle, scores, resultProfile, userAnswers) {
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    testTitle,
                    scores,
                    resultProfile,
                    userAnswers
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analiz servisi şu an yanıt vermiyor.');
            }

            const data = await response.json();
            return data.result;

        } catch (error) {
            console.error("AI Service Error:", error);
            throw new Error("Yapay zeka analizine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.");
        }
    }
}
