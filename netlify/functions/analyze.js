exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { testTitle, scores, resultProfile, userAnswers } = JSON.parse(event.body);
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API Key not configured in Netlify' })
            };
        }

        // Kullanıcı cevaplarını özetle
        const answersSummary = userAnswers
            ? userAnswers.slice(0, 25).map(a => `• "${a.question}" → "${a.answer}"`).join('\n')
            : 'Cevap detayları mevcut değil.';

        const prompt = `
Sen deneyimli bir klinik psikolog asistanısın. Karşındaki kişinin psikolojik test sonucunu ve verdiği cevapları derinlemesine analiz edeceksin.

## TEST BİLGİSİ
Test Adı: ${testTitle}
Sonuç Profili: ${resultProfile.title}
Profil Açıklaması: ${resultProfile.shortDesc}

## KİŞİNİN VERDİĞİ CEVAPLAR (Kritik Veri)
${answersSummary}

## ANALİZ FORMATI (Bu yapıyı MUTLAKA takip et)

**1. KİŞİSEL TESPİT (3-4 cümle):**
Kişinin verdiği EN AZ 2-3 spesifik cevaba doğrudan atıfta bulun. Örneğin: "'Partnerimden uzakta olunca hem rahatlarım hem panik olurum' şeklindeki cevabınız..." gibi. Bu cevapların altında yatan psikolojik dinamiği açıkla. Kişi kendini "anlaşılmış" hissetmeli.

**2. GİZLİ MALİYET (2-3 cümle):**
Bu örüntünün farkında olmadan hayatına nasıl zarar veriyor olabileceğini nazikçe göster. İlişkilerde, iş hayatında veya iç huzurunda kaçırılan fırsatları veya yaşanan zorlukları somutlaştır. Korku veya suçluluk yaratma, sadece farkındalık oluştur.

**3. DÖNÜŞÜM VAADI (2-3 cümle):**
Profesyonel destekle elde edebileceği SOMUT kazanımları listele. "Daha iyi hissedersiniz" gibi belirsiz ifadeler YASAK. Bunun yerine: "Çatışma anlarında sakin kalabilme becerisi", "Yakınlık korkusu yerine güvenli bağlanma deneyimi", "Kendi ihtiyaçlarınızı suçluluk duymadan ifade edebilme" gibi spesifik, ölçülebilir faydalar sun.

**4. DAVET (1 cümle):**
Şu cümleyle MUTLAKA bitir: "Bu yolculukta yalnız değilsiniz; profesyonel bir ön görüşme planlayarak, kendiniz için en değerli adımı bugün atabilirsiniz."

## KRİTİK KURALLAR
- Minimum 200, maksimum 280 kelime yaz.
- SADECE Türkçe kullan. Tek bir yabancı kelime bile kullanma.
- "Rümeysa Hanım" veya "Psikolog Rümeysa" gibi isim kullanma. "Uzman desteği", "profesyonel görüşme" de.
- Paragraf başlıkları (1., 2., 3., 4.) YAZMA, akıcı bir metin olsun.
- Sıcak, empatik ama profesyonel bir ton kullan.
- Kişinin cevaplarından EN AZ 2 tanesine doğrudan alıntı yaparak referans ver.
- ASLA "kullanıcı" kelimesini kullanma. Her zaman "siz", "sizin", "cevabınız" gibi doğrudan hitap kullan.
        `;

        // Çoklu model fallback - öncelik: DeepSeek v3.1 (en iyi), sonra güçlü alternatifler
        const models = [
            'nex-agi/deepseek-v3.1-nex-n1:free',      // En iyi sonuç
            'deepseek/deepseek-r1-0528:free',         // İyi ve stabil
            'google/gemma-3-27b-it:free',             // Güçlü Türkçe
            'google/gemma-3-12b-it:free',             // Orta-güçlü
            'openai/gpt-oss-20b:free',                // Çalışan ama bazen kısa
            'meta-llama/llama-3.3-70b-instruct:free', // Yedek                  // Hafif model
        ];

        let lastError = null;
        for (const model of models) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://psikologrumeysauyumaz.netlify.app',
                    },
                    body: JSON.stringify({
                        model,
                        max_tokens: 900,
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                    }),
                });

                const data = await response.json();

                if (response.ok && data.choices && data.choices[0]) {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({ result: data.choices[0].message.content })
                    };
                }

                lastError = data.error?.message || 'Model yanıt vermedi';
                continue;

            } catch (err) {
                lastError = err.message;
                continue;
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Tüm modeller denendi ancak başarısız oldu. Hata: ${lastError}` })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
