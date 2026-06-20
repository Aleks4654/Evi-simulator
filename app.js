// --- НАЛАШТУВАННЯ ---
const AVAILABLE_VARIANTS = 1; 

// ВСТАВ СВОЇ ДАНІ ТЕЛЕГРАМ ТУТ (в лапках):
const TELEGRAM_BOT_TOKEN = '8917414128:AAFEYegWbpJTvmAYw1RsRkRA9WI-90xSvyA';
const TELEGRAM_CHAT_ID = '541143465';

// --- СТАН ДОДАТКУ (State) ---
const state = {
    currentVariant: null, // Запам'ятовуємо номер варіанта
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
        btn.className = "w-full py-3 px-4 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded-lg text-left font-medium transition flex justify-between items-center";
        btn.innerHTML = `<span>Варіант ${i}</span> <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
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
        state.currentVariant = variantNum; // Зберігаємо обраний варіант
        
        startTest();
    } catch (error) {
        alert(`Помилка завантаження Варіанта ${variantNum}. Переконайтеся, що файл існує.`);
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
            timerEl.classList.add('text-red-300');
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
        passageContainer.innerHTML = `<p class="whitespace-pre-line">${q.passage}</p>`;
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
                <label for="opt-${index}" class="option-label">
                    <span class="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3 mt-0.5 text-sm font-bold shrink-0 indicator">
                        ${String.fromCharCode(65 + index)}
                    </span>
                    <span class="text-gray-700">${optText}</span>
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
            blockHeader.className = 'col-span-5 text-xs font-bold text-gray-500 uppercase tracking-wider mt-4 mb-1 border-b pb-1 text-center';
            blockHeader.textContent = currentBlockName;
            grid.appendChild(blockHeader);
        }

        const item = document.createElement('div');
        item.textContent = index + 1;
        item.className = 'grid-item';
        
        if (state.userAnswers[q.id] !== undefined) item.classList.add('answered');
        else item.classList.add('unanswered');
        
        if (state.markedForReview.has(q.id)) item.classList.add('marked');
        if (index === state.currentQuestionIndex) item.classList.add('active');

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
    
    // Окремі лічильники для блоків
    let scoreTZNK = 0;
    let scoreEng = 0;
    let maxTZNK = 0;
    let maxEng = 0;

    state.questions.forEach(q => {
        // Рахуємо максимальну кількість питань у кожному блоці
        if (q.block === 'ТЗНК') maxTZNK++;
        if (q.block === 'Іноземна мова') maxEng++;

        // Рахуємо правильні відповіді
        if (state.userAnswers[q.id] === q.correctAnswer) {
            if (q.block === 'ТЗНК') scoreTZNK++;
            if (q.block === 'Іноземна мова') scoreEng++;
        }
    });

    const rawScore = scoreTZNK + scoreEng;
    const maxScore = state.questions.length;
    // Формула переведення у 200-бальну шкалу
    const scaledScore = rawScore === 0 ? 100 : Math.round(100 + (rawScore / maxScore) * 100);

    // Відображення на екрані
    screens.test.classList.remove('flex');
    screens.test.classList.add('hidden');
    screens.results.classList.remove('hidden');
    screens.results.classList.add('flex');

    document.getElementById('raw-score').textContent = rawScore;
    document.getElementById('max-score').textContent = maxScore;
    document.getElementById('scaled-score').textContent = scaledScore;

    renderDetailedResults();

    // Відправка результатів у Telegram
    sendToTelegram(state.currentVariant, scoreTZNK, maxTZNK, scoreEng, maxEng, scaledScore);
}

function sendToTelegram(variant, tznk, maxTznk, eng, maxEng, scaled) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || TELEGRAM_BOT_TOKEN === 'ТВІЙ_ТОКЕН_ВІД_BOTFATHER') {
        console.log("Telegram Token/ID не налаштовано. Повідомлення не відправлено.");
        return;
    }

    // Формуємо красиве повідомлення для Telegram (з емодзі та жирним текстом)
    const text = `📊 *Новий результат ЄВІ!*\n\n` +
                 `📁 *Варіант:* ${variant}\n` +
                 `🧠 *ТЗНК:* ${tznk} / ${maxTznk}\n` +
                 `🇬🇧 *Іноземна мова:* ${eng} / ${maxEng}\n\n` +
                 `🏆 *Загальний бал (100-200):* ${scaled}`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    // Робимо HTTP запит до API Telegram
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

function renderDetailedResults() {
    const container = document.getElementById('results-breakdown');
    container.innerHTML = '';

    state.questions.forEach((q, index) => {
        const userAnswerIndex = state.userAnswers[q.id];
        const isCorrect = userAnswerIndex === q.correctAnswer;
        const isUnanswered = userAnswerIndex === undefined;

        const statusClass = isCorrect ? 'bg-green-100 text-green-800 border-green-200' : 
                            (isUnanswered ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-red-100 text-red-800 border-red-200');
        const statusText = isCorrect ? 'Правильно' : (isUnanswered ? 'Немає відповіді' : 'Неправильно');

        const el = document.createElement('div');
        el.className = `p-6 border rounded-lg ${isCorrect ? 'border-green-300 bg-green-50/30' : 'border-red-300 bg-red-50/30'}`;
        
        let optionsHtml = `<ul class="mt-4 space-y-2">`;
        q.options.forEach((optText, i) => {
            let itemClasses = "p-3 rounded-md border text-sm flex gap-3";
            let icon = `<span class="w-5 h-5 inline-block"></span>`;

            if (i === q.correctAnswer) {
                itemClasses += " bg-green-100 border-green-400 font-medium text-green-900";
                icon = `✅`;
            } else if (i === userAnswerIndex && !isCorrect) {
                itemClasses += " bg-red-100 border-red-400 text-red-900 line-through opacity-80";
                icon = `❌`;
            } else {
                itemClasses += " bg-white border-gray-200 text-gray-600";
            }

            optionsHtml += `<li class="${itemClasses}">${icon} <span>${optText}</span></li>`;
        });
        optionsHtml += `</ul>`;

        el.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="font-bold text-lg"><span class="text-gray-500 mr-2">#${index + 1}</span> ${q.question}</h3>
                <span class="px-3 py-1 rounded-full text-xs font-bold border ${statusClass} whitespace-nowrap ml-4">${statusText}</span>
            </div>
            ${optionsHtml}
            <div class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r text-sm text-gray-800">
                <p class="font-bold mb-1 text-blue-800">Пояснення:</p>
                <p>${q.explanation}</p>
            </div>
        `;
        container.appendChild(el);
    });
}
