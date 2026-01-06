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
        // ranges veya result_ranges olabilir
        const ranges = testData.scoring.ranges || testData.scoring.result_ranges;
        
        if (!ranges) {
            console.error('criterion_referenced scoring requires ranges or result_ranges');
            return null;
        }

        // Kategorileri kontrol et (pozitif/negatif ayrımı var mı?)
        const categories = testData.scoring.categories;
        
        if (categories && categories.some(c => c.type === 'negative')) {
            // Pozitif ve Negatif skorları ayrı hesapla (Gottman tarzı testler için)
            let positiveScore = 0;
            let negativeScore = 0;
            
            const negativeCats = categories.filter(c => c.type === 'negative').map(c => c.name);
            
            answers.forEach(answer => {
                if (answer && answer.score !== undefined && answer.category) {
                    if (negativeCats.includes(answer.category)) {
                        negativeScore += answer.score;
                    } else {
                        positiveScore += answer.score;
                    }
                }
            });

            // result_ranges formatı: {level, minPositiveScore, maxNegativeScore}
            for (const range of ranges) {
                if (range.minPositiveScore !== undefined && range.maxNegativeScore !== undefined) {
                    if (positiveScore >= range.minPositiveScore && negativeScore <= range.maxNegativeScore) {
                        return range.level;
                    }
                }
            }
            
            // Eşleşme yoksa en kötü durumu döndür (son range genelde en kötüdür)
            return ranges[ranges.length - 1]?.level || null;
        } else {
            // Basit toplam skor hesaplama (eski yöntem)
            let totalScore = 0;
            answers.forEach(answer => {
                if (answer && answer.score !== undefined) {
                    totalScore += answer.score;
                }
            });

            for (const range of ranges) {
                if (range.min !== undefined && range.max !== undefined) {
                    if (totalScore >= range.min && totalScore <= range.max) {
                        return range.level;
                    }
                }
            }
        }
    }

    // Eşleşen bir sonuç bulunamazsa null döndür
    return null;
}
