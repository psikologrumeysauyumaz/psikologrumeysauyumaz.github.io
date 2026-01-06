import { calculateResult, calculateCategoryScores } from '../utils/scoring.js';
import { AIService } from '../utils/aiService.js';

const CHART_COLOR_PALETTE = ['#166534', '#0ea5e9', '#a855f7', '#f97316', '#14b8a6', '#facc15', '#ec4899'];

function hexToRgba(hex, alpha = 1) {
    if (!hex) return `rgba(22, 101, 52, ${alpha})`;
    let s = hex.replace('#', '').trim();
    if (s.length === 3) s = s.split('').map(c => c + c).join('');
    const i = parseInt(s, 16);
    if (isNaN(i)) return `rgba(22, 101, 52, ${alpha})`;
    return `rgba(${(i >> 16) & 255}, ${(i >> 8) & 255}, ${i & 255}, ${alpha})`;
}

export default class TestEngine {
    constructor(testFileName) {
        this.testFile = testFileName;
        this.testData = null;
        this.currentIndex = 0;
        this.answers = [];
        this.chartInstance = null;
        this.aiService = new AIService();

        this.ui = {
            header: document.getElementById('testHeader'),
            title: document.getElementById('testTitle'),
            description: document.getElementById('testDescription'),
            progressBar: document.getElementById('progressBar'),
            currentQuestion: document.getElementById('currentQuestion'),
            totalQuestions: document.getElementById('totalQuestions'),
            questionContainer: document.getElementById('questionContainer'),
            questionText: document.getElementById('questionText'),
            optionsContainer: document.getElementById('optionsContainer'),
            prevButton: document.getElementById('prevButton'),
            nextButton: document.getElementById('nextButton'),
            resultsContainer: document.getElementById('resultsContainer'),
            resultChart: document.getElementById('resultChart'),
            resultContent: document.getElementById('resultContent'),
            professionalNote: document.getElementById('professionalNote'),
            professionalInsightContainer: document.querySelector('.professional-insight')
        };

        this.initEventListeners();
    }

    async loadTest() {
        try {
            const response = await fetch(`../data/tests/${this.testFile}`);
            if (!response.ok) throw new Error(`Test dosyası yüklenemedi: ${response.statusText}`);
            this.testData = await response.json();
            console.log("Test verisi yüklendi:", this.testData);
            document.getElementById('loadingOverlay').style.opacity = '0';
            setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 300);
            return true;
        } catch (error) {
            console.error('Test yükleme hatası:', error);
            document.body.innerHTML = `<div class="text-center p-8"><h1 class="text-2xl font-bold">Hata</h1><p>Test verileri yüklenemedi. Lütfen internet bağlantınızı kontrol edin ve sayfayı yenileyin.</p></div>`;
            return false;
        }
    }

    initEventListeners() {
        this.ui.prevButton.addEventListener('click', () => this.previous());
        this.ui.nextButton.addEventListener('click', () => this.next());
    }

    start() {
        this.ui.title.textContent = this.testData.metadata.title;
        this.ui.description.textContent = this.testData.metadata.description;
        this.ui.totalQuestions.textContent = this.testData.questions.length;
        this.answers = new Array(this.testData.questions.length).fill(null);
        this.renderQuestion(0);
    }

    renderQuestion(index) {
        const question = this.testData.questions[index];
        this.ui.questionText.textContent = question.text;
        this.ui.currentQuestion.textContent = index + 1;

        const progress = ((index + 1) / this.testData.questions.length) * 100;
        this.ui.progressBar.style.width = progress + '%';

        this.ui.optionsContainer.innerHTML = '';
        question.options.forEach((option, optionIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-button';
            optionDiv.innerHTML = `<div class="flex items-center"><span class="font-medium">${option.text}</span></div>`;
            optionDiv.onclick = () => this.selectOption(optionIndex, optionDiv);
            this.ui.optionsContainer.appendChild(optionDiv);
        });

        this.ui.prevButton.style.display = index > 0 ? 'block' : 'none';
        this.ui.nextButton.disabled = this.answers[index] === null;
        this.ui.nextButton.textContent = index === this.testData.questions.length - 1 ? 'Sonuçları Gör' : 'Devam Et';
    }

    selectOption(optionIndex, optionElement) {
        this.ui.optionsContainer.querySelectorAll('.option-button').forEach(btn => btn.classList.remove('selected'));
        optionElement.classList.add('selected');

        const question = this.testData.questions[this.currentIndex];
        const selectedOption = question.options[optionIndex];

        this.answers[this.currentIndex] = {
            questionIndex: this.currentIndex,
            optionIndex: optionIndex,
            category: selectedOption.category || question.category,
            score: selectedOption.score
        };

        this.ui.nextButton.disabled = false;
    }

    next() {
        if (this.currentIndex < this.testData.questions.length - 1) {
            this.currentIndex++;
            this.renderQuestion(this.currentIndex);
        } else {
            this.showResults();
        }
    }

    previous() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestion(this.currentIndex);

            if (this.answers[this.currentIndex] !== null) {
                const optionButtons = this.ui.optionsContainer.querySelectorAll('.option-button');
                optionButtons[this.answers[this.currentIndex].optionIndex].classList.add('selected');
                this.ui.nextButton.disabled = false;
            }
        }
    }

    showResults() {
        const resultKey = calculateResult(this.testData, this.answers);
        const result = this.testData.results[resultKey];
        const categoryScores = calculateCategoryScores(this.answers);

        this.ui.questionContainer.style.display = 'none';
        this.ui.header.style.display = 'none';
        this.ui.resultsContainer.classList.remove('hidden');

        if (!result) {
            this.ui.resultContent.innerHTML = `<div class="text-center p-8"><h3 class="text-2xl font-bold">Sonuç Bulunamadı</h3><p>Profilinize uygun sonuç bulunamadı.</p></div>`;
            return;
        }

        let sectionsHtml = (result.sections || []).map(section => `
            <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h4 class="font-semibold text-[#166534] mb-2 flex items-center gap-2">
                    <i data-feather="check-circle" class="w-4 h-4"></i> ${section.title}
                </h4>
                <p class="text-gray-700 leading-relaxed">${section.content}</p>
            </div>`).join('');

        let actionItemsHtml = '';
        if (result.action_items) {
            actionItemsHtml = `<div class="mb-6">
                <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i data-feather="list" class="w-5 h-5 text-[#166534]"></i> Önerilen Adımlar
                </h4>
                <div class="space-y-3">
                    ${result.action_items.map(p => `
                        <div class="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <i data-feather="arrow-right-circle" class="w-5 h-5 text-[#166534] flex-shrink-0 mt-0.5"></i>
                            <span class="text-gray-700 text-sm">${p.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        this.ui.resultContent.innerHTML = `
            <div class="text-center mb-8">
                <div class="text-6xl mb-6 animate-bounce-slow">${result.icon || '✨'}</div>
                <h3 class="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#166534] to-[#16A34A]">${result.title}</h3>
                <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto font-light leading-relaxed">${result.shortDesc}</p>
                <div class="text-left w-full">
                    ${sectionsHtml}
                    ${actionItemsHtml}
                </div>
                
                <!-- AI Section -->
                <div id="aiSection" class="mt-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <div class="flex flex-col items-center">
                        <h4 class="text-xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
                             Size Özel Detaylı Analiz
                        </h4>
                        <p class="text-indigo-700 mb-4 text-center text-sm">Sonuçlarınıza dair kişiselleştirilmiş içgörüleri ve uzman değerlendirmesini görüntüleyin.</p>
                        
                        <div id="aiResultArea" class="hidden w-full bg-white p-4 rounded-xl shadow-inner mb-4 text-gray-700 text-sm leading-relaxed"></div>
                        
                        <button id="btnAnalyzeAI" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
                            <i data-feather="star"></i> Özel Analizi Başlat
                        </button>
                    </div>
                </div>
            </div>
        `;

        const professionalNote = (result.sections || []).find(s => s.priority === 'high' || s.priority === 'medium');
        
        // AI Analizi için önce normal profesyonel notu gizliyoruz.
        // Eğer AI hata verirse veya çalışmazsa bunu fallback olarak göstereceğiz.
        this.fallbackProfessionalNote = professionalNote ? professionalNote.content : null;
        if (this.ui.professionalInsightContainer) {
            this.ui.professionalInsightContainer.style.display = 'none';
        }

        if (this.ui.resultChart) this.renderChart(categoryScores);

        // Kullanıcı cevaplarını özetle
        const userAnswers = this.answers.map(ans => {
            const question = this.testData.questions[ans.questionIndex];
            const selectedOption = question.options[ans.optionIndex];
            return {
                question: question.text,
                answer: selectedOption.text,
                category: ans.category
            };
        });

        // Auto-start AI analysis
        setTimeout(() => {
            this.handleAIAnalysis(this.testData.metadata.title, categoryScores, result, userAnswers);
        }, 800);

        // Re-init icons
        if (window.feather) window.feather.replace();

        // Attach AI Handler
        document.getElementById('btnAnalyzeAI').addEventListener('click', () => this.handleAIAnalysis(this.testData.metadata.title, categoryScores, result, userAnswers));
    }

    async handleAIAnalysis(testTitle, scores, resultProfile, userAnswers) {
        const resultArea = document.getElementById('aiResultArea');
        const btn = document.getElementById('btnAnalyzeAI');
        const aiSection = document.getElementById('aiSection');

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-feather="loader" class="animate-spin"></i> Analiz Hazırlanıyor...`;
            if (window.feather) feather.replace();
        }

        resultArea.classList.remove('hidden');
        resultArea.innerHTML = `
            <div class="flex flex-col items-center py-4">
                <div class="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                <div class="animate-pulse text-indigo-600 font-medium">Verileriniz analiz ediliyor...</div>
            </div>`;

        try {
            const analysis = await this.aiService.analyzeResult(testTitle, scores, resultProfile, userAnswers);
            resultArea.innerHTML = `
                <div class="prose prose-sm max-w-none">
                    <h5 class="font-bold text-indigo-900 mb-2">Uzman Değerlendirmesi:</h5>
                    <div class="whitespace-pre-wrap text-gray-700">${analysis}</div>
                    <div class="mt-4 text-xs text-gray-400 border-t pt-2 italic text-right">Analiz Tamamlandı</div>
                </div>
            `;
            if (btn) {
                btn.innerHTML = `<i data-feather="check"></i> Analiz Tamamlandı`;
                if (window.feather) feather.replace();
            }
        } catch (error) {
            console.error("AI Analysis failed:", error);
            
            // Hata olsa bile AI kutusu kalsın ki kullanıcı durumu görsün.
            // Sadece içeriği hata mesajına çeviriyoruz.
            resultArea.innerHTML = `
                <div class="flex flex-col gap-4">
                    <div class="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-start gap-3">
                        <i data-feather="alert-circle" class="w-5 h-5 flex-shrink-0 mt-0.5"></i>
                        <div>
                            <strong>Analiz Oluşturulamadı:</strong><br/>
                            ${error.message || 'Sunucuya erişilemedi.'}<br/>
                            <span class="text-xs opacity-75 mt-1 block">Aşağıda genel uzman notunu inceleyebilirsiniz.</span>
                        </div>
                    </div>
                </div>`;
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i data-feather="refresh-cw"></i> Tekrar Dene`;
                if (window.feather) feather.replace();
            }

            // Fallback: Statik notu da gösterelim ki kullanıcı boş kalmasın
            if (this.fallbackProfessionalNote && this.ui.professionalInsightContainer) {
                this.ui.professionalNote.textContent = this.fallbackProfessionalNote;
                this.ui.professionalInsightContainer.style.display = 'flex';
                
                // İsterseniz buraya "AI Analizi Yapılamadı, Standart Not Gösteriliyor" gibi bir başlık eklenebilir
                // ama şu an sadece görünür hale getiriyoruz.
            }
        }
    }

    renderChart(scores) {
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const ctx = this.ui.resultChart.getContext('2d');
        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const labels = [];
        const values = [];
        const colors = [];

        sortedScores.forEach(([category, value], index) => {
            const resultProfile = this.testData.results[category];
            labels.push(resultProfile?.title || category);
            values.push(value ?? 0);
            colors.push(resultProfile?.color || CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]);
        });

        if (!labels.length) return;

        this.chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Skor',
                    data: values,
                    backgroundColor: colors.map(c => hexToRgba(c, 0.7)),
                    borderColor: colors.map(c => hexToRgba(c, 1)),
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 'flex',
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#334155',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        titleFont: { family: 'Inter', size: 14, weight: 600 },
                        bodyFont: { family: 'Inter', size: 13 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: { display: false }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { color: '#64748b', font: { family: 'Inter', size: 12 } }
                    }
                }
            }
        });
    }
}

