
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { testTitle, scores, resultProfile, userAnswers } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key not configured in Vercel' }), { status: 500 });
        }

        // Kullanıcı cevaplarını özetle (İlk 15 cevap, token limitini korumak için)
        const answersSummary = userAnswers
            ? userAnswers.slice(0, 20).map(a => `- Soru: "${a.question}" -> Cevap: "${a.answer}"`).join('\n')
            : 'Cevap detayları mevcut değil.';

        const prompt = `
        Sen Psikolog Rümeysa Uyumaz'ın dijital asistanısın. Görevin, aşağıdaki test sonucunu ve kullanıcının verdiği cevapları analiz ederek "değer odaklı" bir yaklaşımla profesyonel desteğin faydasını sunmaktır.
        
        Test: ${testTitle}
        Sonuç Profili: ${resultProfile.title}
        Kısa Tanım: ${resultProfile.shortDesc}
        
        Kullanıcının Verdiği Bazı Kritik Cevaplar:
        ${answersSummary}
        
        Yönerge:
        Kullanıcının özellikle bu cevaplarına referans vererek ("X konusundaki yaklaşımınız..." gibi) analizini kişiselleştir.
        
        Kullanıcının durumunu analiz ederken şu "Satış/İkna" kurgusunu izle:
        1. **Tanımla & Onayla:** Kullanıcının mevcut durumunu ve yaşadığı olası zorluğu, onu yargılamadan, "seni anlıyorum" tonunda özetle. (Örn: "Duygularınızı ifade etmekte zorlanmanız, aslında korunma ihtiyacınızdan kaynaklanıyor olabilir.")
        2. **Farkındalık Yarat (Gap):** Bu durumun hayatında (ilişkilerinde, işinde veya iç dünyasında) nelere mal olabileceğini nazikçe hissettir.
        3. **Değeri Sun (Value Proposition):** Bizimle yapacağı görüşmenin ona "ne kazandıracağını" net bir şekilde ifade et. Sadece "gelin konuşalım" deme; "Bu görüşme sayesinde X yeteneğinizi kazanacak, Y yükünden kurtulacaksınız" gibi somut bir fayda vaat et.
        
        Kurallar:
        - Asla "Sadece bir test sonucudur" gibi basitleştirici ifadeler kullanma.
        - "Rümeysa Hanım" ismini kullanma; "Uzman desteği", "Profesyonel görüşmemiz" ifadelerini kullan.
        - Tonun: Bilge, güven verici, çözüm odaklı ve davetkar olsun.
        - Mesajı mutlaka şu cümle ile bitir: "Bu yolculukta yalnız değilsiniz; profesyonel bir ön görüşme planlayarak, kendiniz için en değerli adımı bugün atabilirsiniz."
        
        Dil: Türkçe. Maksimum 160 kelime.
        `;

        // En İyi Ücretsiz Modeller (Büyük Parametreli ve Türkçe Yeteneği Yüksek Olanlar)
        const freeModels = [
            'meta-llama/llama-3.1-405b-instruct:free',   // 405B: Dünyanın en büyük açık kaynak modeli
            'meta-llama/llama-3.3-70b-instruct:free',    // 70B: Çok stabil ve Türkçe bilgisi mükemmel
            'google/gemma-3-27b-it:free',                // Google'ın en yeni 27B modeli (Gemma 3)
            'google/gemini-2.0-flash-exp:free',          // Google Gemini (Hızlı ve zeki)
            'google/gemma-3-12b-it:free',                // Orta boy ama kaliteli
            'mistralai/mistral-small-3.1-24b-instruct:free',
            'nvidia/nemotron-3-nano-30b-a3b:free',
            'mistralai/mistral-7b-instruct:free'         // En son çare (Ultra hızlı)
        ];

        let lastError = null;
        for (const model of freeModels) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://psikologrumeysauyumaz.vercel.app',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: prompt }],
                    }),
                });

                const data = await response.json();

                if (response.ok && data.choices && data.choices[0]) {
                    return new Response(JSON.stringify({ result: data.choices[0].message.content }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                lastError = data.error?.message || 'Model yanıt vermedi';
                console.warn(`Model ${model} başarısız oldu: ${lastError}`);
                continue; // Bir sonraki modeli dene

            } catch (err) {
                lastError = err.message;
                continue;
            }
        }

        return new Response(JSON.stringify({ error: `Tüm ücretsiz modeller kota limitine ulaştı. Hata: ${lastError}` }), { status: 500 });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
