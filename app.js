// --- НАЛАШТУВАННЯ ---
const AVAILABLE_VARIANTS = 3; // Вказав 3, бо ти вже згенерував 3 варіанти

// ВСТАВ СВОЇ ДАНІ ТЕЛЕГРАМ ТУТ (між лапками):
const TELEGRAM_BOT_TOKEN = '8917414128:AAFEYegWbpJTvmAYw1RsRkRA9WI-90xSvyA';
const TELEGRAM_CHAT_ID = '541143465';

// --- СТАН ДОДАТКУ (State) ---
const state = {
    currentVariant: null,
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    markedForReview: new Set(),
    timeLeft: 150 * 60,
    timerInterval: null
};

// --- DOM ЕЛЕМЕНТИ ---
const screens = {
    start: document.getElementById('start-screen'),
    test: document.getElementById('test-screen'),
    results: document.getElementById('results-screen')
};

// --- ІНІЦІАЛІЗАЦІЯ ---
document.addEventListener('DOMContentLoaded', () => {
    renderVariantsList();
});

function renderVariantsList() {
    const list = document.getElementById('variants-list');
    list.innerHTML = '';
    
    for (let i = 1; i <= AVAILABLE_VARIANTS; i++) {
        const btn = document.createElement('button');
        btn.className = "w-full py-4 px-5 bg-white hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-200 rounded-xl text-left font-bold text-gray-700 hover:text-blue-700 transition-all shadow-sm hover:shadow flex justify-between items-center group";
        btn.innerHTML = `<span>Варіант ${i}</span> <svg class="w-6 h-6 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
        btn.onclick = () => loadVariant(i);
        list.appendChild(btn);
    }
}

async function loadVariant(variantNum) {
    try {
        const response = await fetch(`data/variant_${variantNum}.json`);
        if (!response.ok) throw new Error("Файл не знайдено");
        
        const data = await response.json();
        state.questions = data;
        state.currentVariant = variantNum;
        
        startTest();
    } catch (error) {
        alert(`Помилка завантаження Варіанта ${variantNum}. Переконайтеся, що файл data/variant_${variantNum}.json існує.`);
        console.error(error);
    }
}

// --- ТЕСТУВАННЯ ---
function startTest() {
    screens.start.classList.add('hidden');
    screens.test.classList.remove('hidden');
    screens.test.classList.add('flex');

    document.getElementById('total-q-num').textContent = state.questions.length;
    
    document.getElementById('prev-btn').onclick = () => navigate(-1);
    document.getElementById('next-btn').onclick = () => navigate(1);
    document.getElementById('finish-btn').onclick = finishTest;
    
    document.getElementById('mark-review-checkbox').addEventListener('change', (e) => {
        const currentQId = state.questions[state.currentQuestionIndex].id;
        if (e.target.checked) {
            state.markedForReview.add(currentQId);
        } else {
            state.markedForReview.delete(currentQId);
        }
        renderGrid();
    });

    startTimer();
    renderQuestion();
    renderGrid();
}

function startTimer() {
    const timerEl = document.getElementById('timer');
    state.timerInterval = setInterval(() => {
        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            finishTest();
            return;
        }
        state.timeLeft--;
        const m = Math.floor(state.timeLeft / 60).toString().padStart(2, '0');
        const s = (state.timeLeft % 60).toString().padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
        
        if (state.timeLeft < 300) {
            timerEl.classList.add('text-red-400');
            timerEl.classList.add('animate-pulse');
        }
    }, 1000);
}

function renderQuestion() {
    const q = state.questions[state.currentQuestionIndex];
    
    document.getElementById('current-q-num').textContent = state.currentQuestionIndex + 1;
    document.getElementById('question-block-badge').textContent = q.block;
    document.getElementById('question-text').textContent = q.question;
    
    const passageContainer = document.getElementById('passage-container');
    if (q.type === 'reading' && q.passage) {
        passageContainer.innerHTML = `<p class="whitespace-pre-line text-lg">${q.passage}</p>`;
        passageContainer.classList.remove('hidden');
    } else {
        passageContainer.classList.add('hidden');
    }

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    q.options.forEach((optText, index) => {
        const isChecked = state.userAnswers[q.id] === index;
        const optHtml = `
            <div>
                <input type="radio" name="question-${q.id}" id="opt-${index}" class="option-radio" value="${index}" ${isChecked ? 'checked' : ''}>
                <label for="opt-${index}" class="option-label text-lg">
                    <span class="w-7 h-7 rounded-full border-2 border-gray-300 flex items-center justify-center mr-4 mt-0.5 text-sm font-bold shrink-0 indicator bg-gray-50 text-gray-600">
                        ${String.fromCharCode(65 + index)}
                    </span>
                    <span class="text-gray-800">${optText}</span>
                </label>
            </div>
        `;
        optionsContainer.insertAdjacentHTML('beforeend', optHtml);
    });

    document.querySelectorAll('.option-radio').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.userAnswers[q.id] = parseInt(e.target.value);
            renderGrid();
        });
    });

    document.getElementById('mark-review-checkbox').checked = state.markedForReview.has(q.id);
    document.getElementById('prev-btn').disabled = state.currentQuestionIndex === 0;
    document.getElementById('next-btn').disabled = state.currentQuestionIndex === state.questions.length - 1;
}

function renderGrid() {
    const grid = document.getElementById('navigation-grid');
    grid.innerHTML = '';

    let currentBlockName = "";

    state.questions.forEach((q, index) => {
        if (q.block !== currentBlockName) {
            currentBlockName = q.block;
            const blockHeader = document.createElement('div');
            blockHeader.className = 'col-span-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 mb-1 border-b border-gray-200 pb-1 text-center';
            blockHeader.textContent = currentBlockName;
            grid.appendChild(blockHeader);
        }

        const item = document.createElement('div');
        item.textContent = index + 1;
        item.className = 'grid-item bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-100';
        
        if (state.userAnswers[q.id] !== undefined) {
            item.className = 'grid-item bg-blue-500 border border-blue-600 text-white shadow shadow-blue-200';
        }
        
        if (state.markedForReview.has(q.id)) {
            item.classList.add('ring-2', 'ring-yellow-400', 'ring-offset-1');
        }
        
        if (index === state.currentQuestionIndex) {
            item.classList.add('ring-4', 'ring-blue-300', 'scale-110', 'z-10');
        }

        item.onclick = () => {
            state.currentQuestionIndex = index;
            renderQuestion();
            renderGrid();
        };
        grid.appendChild(item);
    });
}

function navigate(direction) {
    state.currentQuestionIndex += direction;
    renderQuestion();
    renderGrid();
}

// --- РЕЗУЛЬТАТИ ТА ТЕЛЕГРАМ ---
function finishTest() {
    clearInterval(state.timerInterval);
    
    let scoreTZNK = 0;
    let scoreEng = 0;
    let maxTZNK = 0;
    let maxEng = 0;

    state.questions.forEach(q => {
        if (q.block === 'ТЗНК') maxTZNK++;
        if (q.block === 'Іноземна мова') maxEng++;

        if (state.userAnswers[q.id] === q.correctAnswer) {
            if (q.block === 'ТЗНК') scoreTZNK++;
            if (q.block === 'Іноземна мова') scoreEng++;
        }
    });

    const rawScore = scoreTZNK + scoreEng;
    const maxScore = state.questions.length;
    const scaledScore = rawScore === 0 ? 100 : Math.round(100 + (rawScore / maxScore) * 100);

    screens.test.classList.remove('flex');
    screens.test.classList.add('hidden');
    screens.results.classList.remove('hidden');
    screens.results.classList.add('flex');

    document.getElementById('raw-score').textContent = rawScore;
    document.getElementById('max-score').textContent = maxScore;
    document.getElementById('scaled-score').textContent = scaledScore;

    renderDetailedResults();
    sendToTelegram(state.currentVariant, scoreTZNK, maxTZNK, scoreEng, maxEng, scaledScore);
}

function sendToTelegram(variant, tznk, maxTznk, eng, maxEng, scaled) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || TELEGRAM_BOT_TOKEN === 'ТВІЙ_ТОКЕН_ВІД_BOTFATHER') {
        return; // Якщо токен не введено, просто ігноруємо
    }

    const text = `📊 *Новий результат ЄВІ!*\n\n` +
                 `📁 *Варіант:* ${variant}\n` +
                 `🧠 *ТЗНК:* ${tznk} / ${maxTznk}\n` +
                 `🇬🇧 *Іноземна мова:* ${eng} / ${maxEng}\n\n` +
                 `🏆 *Загальний бал (100-200):* ${scaled}`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        })
    }).catch(err => console.error("Помилка відправки в Telegram:", err));
}

// ОНОВЛЕНА ФУНКЦІЯ: Генерує і бокову панель (Sidebar), і питання (Breakdown)
function renderDetailedResults() {
    const breakdownContainer = document.getElementById('results-breakdown');
    const sidebarContainer = document.getElementById('results-sidebar');

    breakdownContainer.innerHTML = '';
    sidebarContainer.innerHTML = '';

    let currentBlockName = "";

    state.questions.forEach((q, index) => {
        const userAnswerIndex = state.userAnswers[q.id];
        const isCorrect = userAnswerIndex === q.correctAnswer;
        const isUnanswered = userAnswerIndex === undefined;

        // --- 1. СТВОРЕННЯ КНОПОК ДЛЯ БОКОВОЇ ПАНЕЛІ ---
        // Якщо блок змінився, додаємо розділювач у сайдбар
        if (q.block !== currentBlockName) {
            currentBlockName = q.block;
            const blockHeader = document.createElement('div');
            blockHeader.className = 'col-span-5 text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 mb-1 border-b border-gray-100 pb-1 text-center';
            blockHeader.textContent = currentBlockName;
            sidebarContainer.appendChild(blockHeader);
        }

        const navBtn = document.createElement('button');
        navBtn.innerText = index + 1;
        
        // Кольори для бокових кнопок
        let btnClass = 'flex items-center justify-center h-10 w-full rounded-lg font-bold text-white transition hover:opacity-80 shadow-sm text-sm ';
        if (isUnanswered) {
            btnClass += 'bg-gray-400';
        } else if (isCorrect) {
            btnClass += 'bg-green-500';
        } else {
            btnClass += 'bg-red-500';
        }
        navBtn.className = btnClass;

        // Плавний скрол при кліку
        navBtn.onclick = () => {
            const target = document.getElementById(`review-q-${index}`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Ефект "підсвічування" блоку
                target.classList.add('ring-4', 'ring-blue-400', 'scale-[1.02]', 'transition-all', 'duration-300');
                setTimeout(() => {
                    target.classList.remove('ring-4', 'ring-blue-400', 'scale-[1.02]');
                }, 1500);
            }
        };
        sidebarContainer.appendChild(navBtn);


        // --- 2. СТВОРЕННЯ ДЕТАЛЬНИХ БЛОКІВ РОЗБОРУ (СПРАВА) ---
        const statusClass = isCorrect ? 'bg-green-100 text-green-800 border-green-200' : 
                            (isUnanswered ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-red-100 text-red-800 border-red-200');
        const statusText = isCorrect ? 'Правильно' : (isUnanswered ? 'Немає відповіді' : 'Помилка');

        const el = document.createElement('div');
        el.id = `review-q-${index}`; // ID для скролу
        el.className = `p-6 border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${isCorrect ? 'border-green-200' : 'border-red-200'}`;
        
        let optionsHtml = `<ul class="mt-5 space-y-3">`;
        q.options.forEach((optText, i) => {
            let itemClasses = "p-4 rounded-xl border-2 text-sm md:text-base flex gap-3 items-start transition-colors";
            let icon = `<span class="w-6 h-6 flex-shrink-0"></span>`;

            if (i === q.correctAnswer) {
                itemClasses += " bg-green-50 border-green-400 font-bold text-green-900 shadow-sm";
                icon = `✅`;
            } else if (i === userAnswerIndex && !isCorrect) {
                itemClasses += " bg-red-50 border-red-300 text-red-900 line-through opacity-75";
                icon = `❌`;
            } else {
                itemClasses += " bg-gray-50 border-gray-100 text-gray-600";
            }

            optionsHtml += `<li class="${itemClasses}">${icon} <span class="pt-0.5">${optText}</span></li>`;
        });
        optionsHtml += `</ul>`;

        el.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 border-b border-gray-100 pb-4">
                <h3 class="font-bold text-lg text-gray-800 flex-1 leading-snug">
                    <span class="inline-flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg w-8 h-8 mr-2 text-sm">#${index + 1}</span> 
                    ${q.question}
                </h3>
                <span class="px-4 py-1.5 rounded-lg text-sm font-bold border shadow-sm ${statusClass} whitespace-nowrap uppercase tracking-wider">${statusText}</span>
            </div>
            
            ${q.passage ? `<div class="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 italic text-sm text-justify whitespace-pre-line">${q.passage}</div>` : ''}
            
            ${optionsHtml}
            
            <div class="mt-6 p-5 bg-blue-50/80 border border-blue-100 rounded-xl text-gray-800 shadow-inner">
                <p class="font-black mb-2 text-blue-800 uppercase tracking-widest text-xs flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Чому так?
                </p>
                <p class="leading-relaxed text-sm md:text-base text-justify font-medium">${q.explanation}</p>
            </div>
        `;
        breakdownContainer.appendChild(el);
    });
}
