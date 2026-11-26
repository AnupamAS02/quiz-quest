const roundSize = 5;
let remainingQuestions = [];
let questions = [];

// Draw without replacement. Use the unseen bank before starting a new cycle.
function shuffle(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
}

function drawRound() {
    const round = [];
    while (round.length < roundSize) {
        if (remainingQuestions.length === 0) {
            remainingQuestions = shuffle(questionBank.filter((question) =>
                !round.includes(question) && !questions.includes(question)));
        }
        round.push(remainingQuestions.pop());
    }
    return round;
}

const resumeScreen = document.getElementById("resume-screen");
const resumeHeading = document.getElementById("resume-heading");
const resumeSummary = document.getElementById("resume-summary");
const resumeBtn = document.getElementById("resume-btn");
const discardBtn = document.getElementById("discard-btn");
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultsScreen = document.getElementById("results-screen");
const startForm = document.getElementById("start-form");
const playerNameInput = document.getElementById("player-name");
const questionCounter = document.getElementById("question-counter");
const scoreDisplay = document.getElementById("score-display");
const questionText = document.getElementById("question-text");
const progressFill = document.getElementById("progress-fill");
const progressBar = document.getElementById("quiz-progress");
const answerButtons = document.querySelectorAll(".answer-btn");
const answerFeedback = document.getElementById("answer-feedback");
const nextQuestionBtn = document.getElementById("next-question-btn");
const finalMessage = document.getElementById("final-message");
const finalScore = document.getElementById("final-score");
const resultsHeading = document.getElementById("results-heading");
const playAgainBtn = document.getElementById("play-again-btn");
const answerReview = document.getElementById("answer-review");
const reviewList = document.getElementById("review-list");
const shareResultBtn = document.getElementById("share-result-btn");
const copyResultBtn = document.getElementById("copy-result-btn");
const shareStatus = document.getElementById("share-status");
const manualCopy = document.getElementById("manual-copy");
const shareText = document.getElementById("share-text");
const quizUrl = "https://anupamas02.github.io/quiz-quest/";
let sharingVersion = 0;

// Build only from the score: never include the player's name or current URL.
function resultText() {
    return `I scored ${score} out of ${roundSize} on the Brainer quiz at Quiz Quest. How many can you get right? Try five questions — your round may differ.`;
}

function clearSharing() {
    sharingVersion++;
    shareStatus.textContent = "";
    shareText.value = "";
    manualCopy.classList.add("hidden");
    shareResultBtn.disabled = false;
    copyResultBtn.disabled = false;
}

async function copyResult() {
    const version = sharingVersion;
    const text = `${resultText()}\n${quizUrl}`;
    copyResultBtn.disabled = true;
    shareStatus.textContent = "";
    try {
        await navigator.clipboard.writeText(text);
        if (version !== sharingVersion) return;
        manualCopy.classList.add("hidden");
        shareStatus.textContent = "Result and link copied. Ready to send!";
    } catch {
        if (version !== sharingVersion) return;
        shareText.value = text;
        manualCopy.classList.remove("hidden");
        shareStatus.textContent = "Automatic copying isn’t available. Copy the selected text below to share your result.";
        shareText.focus();
        shareText.select();
    } finally {
        if (version === sharingVersion) copyResultBtn.disabled = false;
    }
}

async function shareResult() {
    if (typeof navigator.share !== "function") {
        await copyResult();
        return;
    }
    const version = sharingVersion;
    shareStatus.textContent = "";
    shareResultBtn.disabled = true;
    try {
        await navigator.share({ title: "Quiz Quest | Brainer Quiz", text: resultText(), url: quizUrl });
        if (version === sharingVersion) shareStatus.textContent = "Sharing complete. Ready for another round?";
    } catch (error) {
        if (version !== sharingVersion) return;
        // Cancellation is not a failure and must not silently copy anything.
        shareStatus.textContent = error && error.name === "AbortError"
            ? "Sharing cancelled. Your result is still here."
            : "Device sharing isn’t available. Use Copy Result to share your score and link.";
    } finally {
        if (version === sharingVersion) shareResultBtn.disabled = false;
    }
}

let currentQuestionIndex = 0;
let score = 0;
let playerName = "";
let answered = false;
let selectedAnswers = [];

// sessionStorage is tab-scoped. Store only round data, never player identity.
const progressKey = "quiz-quest:unfinished-round";
const progressVersion = 1;
const bankVersion = JSON.stringify(questionBank);
const progressMaxAge = 24 * 60 * 60 * 1000;
let storageAvailable = true;
let pendingRound = null;

function clearSavedProgress() {
    pendingRound = null;
    try {
        sessionStorage.removeItem(progressKey);
    } catch {
        storageAvailable = false;
    }
}

function validateProgress(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const fields = ["version", "bank", "savedAt", "questionIds", "remainingIds", "answers", "index"];
    if (Object.keys(data).length !== fields.length || !fields.every((key) => Object.hasOwn(data, key))) return null;
    if (data.version !== progressVersion || data.bank !== bankVersion) return null;
    const age = Date.now() - data.savedAt;
    if (!Number.isSafeInteger(data.savedAt) || age < 0 || age > progressMaxAge) return null;
    if (!Number.isInteger(data.index) || data.index < 0 || data.index >= roundSize) return null;
    if (!Array.isArray(data.questionIds) || data.questionIds.length !== roundSize ||
        !Array.isArray(data.remainingIds) || !Array.isArray(data.answers)) return null;
    const byId = new Map(questionBank.map((question) => [question.id, question]));
    const allIds = [...data.questionIds, ...data.remainingIds];
    if (new Set(allIds).size !== allIds.length || !allIds.every((id) => byId.has(id))) return null;
    const restoredQuestions = data.questionIds.map((id) => byId.get(id));
    if (data.answers.length !== data.index && data.answers.length !== data.index + 1) return null;
    if (!data.answers.every((answer, index) => Number.isInteger(answer) &&
        answer >= 0 && answer < restoredQuestions[index].choices.length)) return null;
    return {
        questions: restoredQuestions,
        remainingQuestions: data.remainingIds.map((id) => byId.get(id)),
        answers: [...data.answers],
        index: data.index,
    };
}

function readSavedProgress() {
    let raw;
    try {
        raw = sessionStorage.getItem(progressKey);
    } catch {
        clearSavedProgress();
        storageAvailable = false;
        return null;
    }
    if (raw === null) return null;
    try {
        const restored = validateProgress(JSON.parse(raw));
        if (!restored) clearSavedProgress();
        return restored;
    } catch {
        // Bad JSON is not a storage failure: the next round can still save.
        clearSavedProgress();
        return null;
    }
}

function saveProgress() {
    if (!storageAvailable) return;
    try {
        sessionStorage.setItem(progressKey, JSON.stringify({
            version: progressVersion,
            bank: bankVersion,
            savedAt: Date.now(),
            questionIds: questions.map((question) => question.id),
            remainingIds: remainingQuestions.map((question) => question.id),
            answers: selectedAnswers,
            index: currentQuestionIndex,
        }));
    } catch {
        // Quota or privacy restrictions must never interrupt answering.
        clearSavedProgress();
        storageAvailable = false;
    }
}

function resumeRound() {
    if (!pendingRound) return;
    // Recheck freshness if the choice screen has been left open for a day.
    const restored = readSavedProgress();
    if (!restored) {
        resetQuiz();
        return;
    }
    clearSharing();
    clearReview();
    questions = restored.questions;
    remainingQuestions = restored.remainingQuestions;
    selectedAnswers = restored.answers;
    currentQuestionIndex = restored.index;
    score = selectedAnswers.reduce((total, answer, index) =>
        total + Number(answer === questions[index].correctIndex), 0);
    playerName = "";
    playerNameInput.value = "";
    pendingRound = null;
    showScreen(quizScreen);
    loadQuestion();
    if (selectedAnswers.length > currentQuestionIndex) renderAnswerFeedback();
    saveProgress();
}

function clearReview() {
    selectedAnswers = [];
    answerReview.open = false;
    reviewList.replaceChildren();
}

function renderReview() {
    answerReview.open = false;
    reviewList.replaceChildren();
    questions.forEach((question, index) => {
        const selectedIndex = selectedAnswers[index];
        const isCorrect = selectedIndex === question.correctIndex;
        const item = document.createElement("li");
        item.classList.add("review-item");

        const heading = document.createElement("h3");
        heading.textContent = `Question ${index + 1}: ${question.question}`;
        const outcome = document.createElement("p");
        outcome.classList.add("review-outcome", isCorrect ? "review-correct" : "review-incorrect");
        outcome.textContent = isCorrect ? "Correct" : "Not quite";
        const selected = document.createElement("p");
        selected.textContent = `Your answer: ${question.choices[selectedIndex]}`;
        const correct = document.createElement("p");
        correct.textContent = `Correct answer: ${question.choices[question.correctIndex]}`;
        const explanation = document.createElement("p");
        explanation.textContent = question.explanation;
        const source = document.createElement("a");
        source.href = question.source;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = `Official source: ${question.source === teamSource ? "Brainer’s AI team" : "Brainer’s CEO guide"} (opens in a new tab)`;

        item.append(heading, outcome, selected, correct, explanation, source);
        reviewList.append(item);
    });
}

function showScreen(screenToShow) {
    resumeScreen.classList.add("hidden");
    startScreen.classList.add("hidden");
    quizScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    screenToShow.classList.remove("hidden");
}

function updateProgress(completed) {
    progressFill.style.width = `${(completed / roundSize) * 100}%`;
    progressBar.setAttribute("aria-valuenow", completed);
}

function loadQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    answered = false;
    questionText.textContent = currentQuestion.question;
    questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${roundSize}`;
    scoreDisplay.textContent = `Score: ${score}`;
    updateProgress(currentQuestionIndex);
    answerFeedback.textContent = "";
    nextQuestionBtn.classList.add("hidden");
    answerButtons.forEach((button, index) => {
        button.textContent = currentQuestion.choices[index];
        button.disabled = false;
        button.classList.remove("correct", "wrong");
    });
    questionText.focus();
}

function handleAnswerClick(event) {
    if (answered) return;
    answered = true;
    const clickedButton = event.currentTarget;
    const selectedIndex = Number(clickedButton.dataset.index);
    selectedAnswers[currentQuestionIndex] = selectedIndex;
    if (selectedIndex === questions[currentQuestionIndex].correctIndex) score++;
    renderAnswerFeedback();
    saveProgress();
}

// Rendering a recorded answer never changes the score or answer history.
function renderAnswerFeedback() {
    answered = true;
    const selectedIndex = selectedAnswers[currentQuestionIndex];
    const clickedButton = answerButtons[selectedIndex];
    const currentQuestion = questions[currentQuestionIndex];
    const correctIndex = currentQuestion.correctIndex;
    answerButtons.forEach((button) => { button.disabled = true; });
    answerButtons[correctIndex].classList.add("correct");
    answerButtons[correctIndex].textContent += " — Correct answer";
    if (selectedIndex === correctIndex) {
        answerFeedback.textContent = `Correct! ${currentQuestion.explanation}`;
    } else {
        clickedButton.classList.add("wrong");
        clickedButton.textContent += " — Your answer";
        answerFeedback.textContent = `Not quite. ${currentQuestion.explanation}`;
    }
    scoreDisplay.textContent = `Score: ${score}`;
    updateProgress(currentQuestionIndex + 1);
    nextQuestionBtn.textContent = currentQuestionIndex === roundSize - 1 ? "See Results" : "Next Question";
    nextQuestionBtn.classList.remove("hidden");
    nextQuestionBtn.focus();
}

function showResults() {
    clearSavedProgress();
    clearSharing();
    renderReview();
    const percentage = Math.round((score / roundSize) * 100);
    const personalGreeting = playerName ? `, ${playerName}` : "";
    let message;
    if (percentage === 100) {
        message = `Perfect score${personalGreeting}! 🏆`;
    } else if (percentage >= 80) {
        message = `Excellent work${personalGreeting}!`;
    } else if (percentage >= 60) {
        message = `Nice job${personalGreeting}!`;
    } else {
        message = `Thanks for playing${personalGreeting}! Ready for another round?`;
    }
    finalMessage.textContent = message;
    finalScore.textContent = `You scored ${score} out of ${roundSize} (${percentage}%)`;
    showScreen(resultsScreen);
    resultsHeading.focus();
}

function resetQuiz() {
    clearSavedProgress();
    clearSharing();
    clearReview();
    finalMessage.textContent = "";
    finalScore.textContent = "";
    currentQuestionIndex = 0;
    score = 0;
    playerName = "";
    answered = false;
    playerNameInput.value = "";
    playerNameInput.setCustomValidity("");
    answerFeedback.textContent = "";
    nextQuestionBtn.classList.add("hidden");
    updateProgress(0);
    showScreen(startScreen);
    playerNameInput.focus();
}

playerNameInput.addEventListener("input", () => playerNameInput.setCustomValidity(""));
startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = playerNameInput.value.trim();
    if (name && (name.length < 2 || name.length > 20)) {
        playerNameInput.setCustomValidity("Use 2–20 characters for your nickname, or leave it blank.");
        playerNameInput.reportValidity();
        return;
    }
    playerNameInput.setCustomValidity("");
    clearReview();
    playerName = name;
    questions = drawRound();
    currentQuestionIndex = 0;
    score = 0;
    pendingRound = null;
    showScreen(quizScreen);
    loadQuestion();
    saveProgress();
});
answerButtons.forEach((button, index) => {
    button.dataset.index = index;
    button.addEventListener("click", handleAnswerClick);
});
nextQuestionBtn.addEventListener("click", () => {
    if (!answered) return;
    currentQuestionIndex++;
    if (currentQuestionIndex < roundSize) {
        loadQuestion();
        saveProgress();
    } else showResults();
});
playAgainBtn.addEventListener("click", resetQuiz);
shareResultBtn.addEventListener("click", shareResult);
copyResultBtn.addEventListener("click", copyResult);
resumeBtn.addEventListener("click", resumeRound);
discardBtn.addEventListener("click", resetQuiz);

pendingRound = readSavedProgress();
if (pendingRound) {
    resumeSummary.textContent = `${pendingRound.answers.length} of ${roundSize} questions answered. Pick up where you left off.`;
    showScreen(resumeScreen);
    resumeHeading.focus();
}
