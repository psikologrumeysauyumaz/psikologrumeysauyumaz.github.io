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

        // Büyük ve Türkçe'de güçlü modeller öncelikli
        const freeModels = [
            'meta-llama/llama-3.3-70b-instruct:free',    // 70B - En güçlü açık model
            'google/gemini-2.0-flash-exp:free',          // Google Gemini - Hızlı ve akıllı
            'google/gemma-2-27b-it:free',                // Gemma 27B - Çok iyi Türkçe
            'mistralai/mistral-small-3.1-24b-instruct:free',
            'google/gemma-2-9b-it:free',
            'mistralai/mistral-7b-instruct:free'
        ];

        let lastError = null;
        for (const model of freeModels) {
            try {
                // Not: Node.js 18+ Netlify Functions ortamında fetch kullanılabilir, 
                // ama safe olması için "node-fetch" gerekebilir. Ancak Netlify Node 18 runtime'da native fetch var.
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://psikologrumeysauyumaz.netlify.app',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
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
                console.warn(`Model ${model} başarısız oldu: ${lastError}`);
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
