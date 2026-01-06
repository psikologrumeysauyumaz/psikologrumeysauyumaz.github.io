
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { testTitle, scores, resultProfile } = await req.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key not configured in Vercel' }), { status: 500 });
        }

        const prompt = `
        Sen uzman bir klinik psikolog asistanısın. Rümeysa Uyumaz'ın profesyonel üslubunu yansıtmalısın.
        Görevin, aşağıdaki test sonucunu analiz ederek kullanıcının farkındalığını artırmak ve profesyonel bir destek alması için Rümeysa Hanım ile iletişime geçmesini sağlamaktır.
        
        Test: ${testTitle}
        Sonuç Profili: ${resultProfile.title}
        Kısa Tanım: ${resultProfile.shortDesc}
        
        Yanıtında şunlara dikkat et:
        1. "Siz" dili kullan, asla "Sen" deme. 
        2. Bilimsel temelli ama empatik ve anlaşılır bir dil kullan.
        3. Sonucun ne anlama geldiğine dair 2-3 önemli noktayı vurgula.
        4. Rümeysa Uyumaz ile yapılacak bir ön görüşmenin neden faydalı olacağını (güven verici şekilde) belirt.
        5. Cümleyi "Bu yolculukta yalnız değilsiniz, Rümeysa Hanım ile bir ön görüşme planlayarak ilk adımınızı güvenle atabilirsiniz." şeklinde bir çağrı ile bitir.
        
        Dil: Türkçe. Maksimum 160 kelime. Ton: Profesyonel, destekleyici ve harekete geçirici.
        `;

        // OpenRouter'dan alınan güncel ve doğrulanmış ücretsiz model listesi
        const freeModels = [
            'xiaomi/mimo-v2-flash:free',
            'mistralai/devstral-2512:free',
            'tngtech/deepseek-r1t2-chimera:free',
            'mistralai/mistral-small-3.1-24b-instruct:free',
            'qwen/qwen3-coder:free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'google/gemma-3-27b-it:free',
            'z-ai/glm-4.5-air:free',
            'nvidia/nemotron-3-nano-30b-a3b:free',
            'mistralai/mistral-7b-instruct:free',
            'google/gemini-2.0-flash-exp:free'
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
