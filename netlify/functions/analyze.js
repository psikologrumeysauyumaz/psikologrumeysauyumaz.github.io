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

        // Kullanıcı cevaplarını özetle (İlk 20 cevap)
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

        const freeModels = [
            'meta-llama/llama-3.3-70b-instruct:free',
            'google/gemini-2.0-flash-exp:free',
            'mistralai/mistral-small-3.1-24b-instruct:free',
            'google/gemma-2-9b-it:free',
            'mistralai/mistral-7b-instruct:free',
            'nvidia/nemotron-3-nano-30b-a3b:free',
            'qwen/qwen3-coder:free',
            'tngtech/deepseek-r1t2-chimera:free'
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
