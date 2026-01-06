/**
 * Cevaplara göre her bir kategorinin skorunu hesaplar.
 * @param {Array} answers - Kullanıcının verdiği cevaplar dizisi.
 * @returns {Object} - Kategori adlarını ve toplam puanlarını içeren bir nesne.
 */
export function calculateCategoryScores(answers) {
    const scores = {};
    answers.forEach(answer => {
        if (answer && answer.category) {
            if (!scores[answer.category]) {
                scores[answer.category] = 0;
            }
            scores[answer.category] += (answer.score === undefined ? 1 : answer.score);
        }
    });
    return scores;
}

/**
 * Testin puanlama metoduna göre nihai sonucu hesaplar.
 * @param {Object} testData - Testin tam JSON verisi.
 * @param {Array} answers - Kullanıcının verdiği cevaplar dizisi.
 * @returns {string|null} - Sonuç profilinin anahtarı (örn: 'guvenli_baglanma' veya 'yuksek_kaygi') veya null.
 */
export function calculateResult(testData, answers) {
    const scoringMethod = testData.scoring.method;

    if (scoringMethod === 'category_based') {
        const scores = calculateCategoryScores(answers);
        if (Object.keys(scores).length === 0) return null;
        // En yüksek skora sahip kategoriyi döndür
        return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    } else if (scoringMethod === 'criterion_referenced') {
        let totalScore = 0;
        answers.forEach(answer => {
            if (answer && answer.score !== undefined) {
                totalScore += answer.score;
            }
        });

        const ranges = testData.scoring.ranges;
        for (const range of ranges) {
            if (totalScore >= range.min && totalScore <= range.max) {
                return range.level;
            }
        }
    }

    // Eşleşen bir sonuç bulunamazsa null döndür
    return null;
}
