// Test başlatma fonksiyonu
function startTest(testFileName) {
    const encoded = encodeURIComponent(testFileName);
    window.location.href = `test.html?test=${encoded}`;
}

// Dinamik test yükleme sistemi
async function loadTestsFromFolder() {
    console.log('Test klasöründen dinamik yükleme başlatılıyor...');

    // Test dosyalarının listesi
    const testFiles = [
        'TEST 1: BAĞLANMA STİLİ PROFİL ANALİZİ.json',
        'TEST 2: AŞK DİLİ KEŞİF TESTİ.json',
        'TEST 3: İLETİŞİM STİLİ DEĞERLENDİRMESİ.json',
        'TEST 4: ÇİFT UYUMLULUK VE DİNAMİK ANALİZİ.json',
        'TEST 5: DUYGUSAL ZEKA YETKİNLİK TESTİ.json',
        'TEST 6: DARK TRIAD KİŞİLİK SPEKTRUMU.json',
        'TEST 7: ÖZGÜVEN VE BENLİK SAYGISI ANALİZİ.json',
        'TEST 8: KAYGI DÜZEYİ DEĞERLENDİRME.json',
        'TEST 9: SOSYAL ZEKA VE İLİŞKİ YÖNETİMİ.json',
        'TEST 10: STRES YÖNETİMİ VE DAYANIKLILIK.json',
        'TEST 11: MOTİVASYON VE HEDEF YÖNELİMİ.json',
        'TEST 12: YARATICILIK VE İNOVASYON POTANSİYELİ.json',
        'TEST 13: ÇATIŞMA ÇÖZME VE MÜZAKERE BECERİLERİ.json',
        'TEST 14: KARAR VERME SÜRECİ VE BİLİŞSEL STİL ANALİZİ.json',
        'TEST 15: LİDERLİK STİLLERİ VE YAKLAŞIMLARI ANALİZİ.json',
        'TEST 16: DEĞERLER, İNANÇLAR VE DÜNYA GÖRÜŞÜ ANALİZİ.json',
        'TEST 17: BİLİŞSEL YETENEĞİ VE IQ DEĞERLENDİRME.json',
        'TEST 18: MİNDFULNESS VE BİLİNÇLİ FARKINDALIK DÜZEYİ.json',
        'TEST 19: DEPRESYON RİSK DEĞERLENDİRME.json',
        'TEST 20: İŞ-YAŞAM DENGESİ VE UYUM DEĞERLENDİRMESİ.json',
        'TEST 21: SOSYAL MEDYA KİŞİLİĞİ VE DİJİTAL ANALİZİ.json'
    ];

    const tests = [];

    for (let i = 0; i < testFiles.length; i++) {
        try {
            const response = await fetch(`../data/tests/${testFiles[i]}`);
            if (!response.ok) {
                console.warn(`Test yüklenemedi: ${testFiles[i]}`);
                continue;
            }

            const testData = await response.json();

            tests.push({
                filename: testFiles[i],
                ...testData
            });
        } catch (error) {
            console.error(`Hata yüklenirken ${testFiles[i]}:`, error);
        }
    }

    console.log(`${tests.length} test yüklendi`);
    return tests;
}

// Testleri kategorilere göre grupla ve renderla
async function populateTestsDynamic() {
    console.log('Dinamik test yükleme başlıyor...');

    const mainContainer = document.getElementById('tests-container');
    if (!mainContainer) {
        console.error('tests-container bulunamadı!');
        return;
    }

    try {
        const tests = await loadTestsFromFolder();
        if (tests.length === 0) {
            mainContainer.innerHTML = '<div class="text-center py-8 text-red-600">Test yüklenemedi</div>';
            return;
        }

        const categories = {};

        tests.forEach(test => {
            const metadata = test.metadata || {};
            const category = metadata.category || 'Diğer Testler';
            const categoryIcon = metadata.categoryIcon || '📝';
            const categoryOrder = metadata.categoryOrder || 99;
            const testOrder = metadata.testOrder || 99;

            if (!categories[category]) {
                categories[category] = {
                    icon: categoryIcon,
                    order: categoryOrder,
                    tests: []
                };
            }

            categories[category].tests.push({
                ...test,
                order: testOrder
            });
        });

        const sortedCategories = Object.keys(categories)
            .sort((a, b) => categories[a].order - categories[b].order);

        mainContainer.innerHTML = '';

        for (const categoryName of sortedCategories) {
            const categoryData = categories[categoryName];

            categoryData.tests.sort((a, b) => a.order - b.order);

            const categorySection = document.createElement('div');
            categorySection.className = 'mb-16';
            categorySection.innerHTML = `
                <h2 class="text-3xl font-bold mb-8 text-center">${categoryData.icon} ${categoryName}</h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8"></div>
            `;
            const gridContainer = categorySection.querySelector('.grid');

            categoryData.tests.forEach(test => {
                const card = document.createElement('div');
                card.className = 'test-card p-8 shadow-lg';

                const metadata = test.metadata || {};
                const title = metadata.title || 'İsimsiz Test';
                const rawDescription = metadata.description || '';
                const descriptionSnippet = rawDescription
                    ? `${rawDescription.substring(0, 150)}${rawDescription.length > 150 ? '...' : ''}`
                    : 'Detaylar yakında.';
                const duration = metadata.estimatedTime || 'Süre bilgisi yakında';

                card.innerHTML = `
                    <div class="test-card-content">
                        <h3 class="text-2xl font-semibold mb-4">${title}</h3>
                        <p class="text-gray-600 mb-4">${descriptionSnippet}</p>
                    </div>
                    <div class="test-stats">
                        <div class="test-stat">
                            <i data-feather="clock" class="w-4 h-4"></i>
                            <span>${duration}</span>
                        </div>
                    </div>
                    <button type="button" class="btn-primary w-full py-3 rounded-lg font-medium mt-4">Testi Başlat</button>
                `;

                const startButton = card.querySelector('button');
                startButton.addEventListener('click', () => startTest(test.filename));

                gridContainer.appendChild(card);
            });

            mainContainer.appendChild(categorySection);
        }

        if (window.feather) {
            feather.replace();
        }

        if (window.AOS) {
            if (typeof window.AOS.refreshHard === 'function') {
                window.AOS.refreshHard();
            } else if (typeof window.AOS.refresh === 'function') {
                window.AOS.refresh();
            }
        }

    } catch (error) {
        console.error('Test yükleme hatası:', error);
        mainContainer.innerHTML = `
            <div class="text-center py-12">
                <div class="flex flex-col items-center gap-4">
                    <div class="w-16 h-16 border-4 border-gray-200 border-t-[#166534] rounded-full animate-spin"></div>
                    <div class="text-xl font-medium text-gray-700">Testler Yükleniyor...</div>
                    <p class="text-gray-500">Bu işlem birkaç saniye sürebilir.</p>
                </div>
            </div>
        `;
    }
}

// Sayfa yüklendiğinde testleri yükle
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateTestsDynamic);
} else {
    populateTestsDynamic();
}

// Fallback
setTimeout(() => {
    const container = document.getElementById('tests-container');
    if (container && container.children.length === 1 && container.textContent.includes('yükleniyor')) {
        populateTestsDynamic();
    }
}, 2000);
