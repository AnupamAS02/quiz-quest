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
const saveImageBtn = document.getElementById("save-image-btn");
const saveImageStatus = document.getElementById("save-image-status");
const quizUrl = "https://anupamas02.github.io/quiz-quest/";
let sharingVersion = 0;
const invitationScreen = document.getElementById("invitation-screen");
const invitationHeading = document.getElementById("invitation-heading");
const invitationFeedback = document.getElementById("invitation-feedback");
const invitationButtons = Array.from({ length: 4 }, (_, index) =>
    document.getElementById(`invitation-answer-${index}`));
const invitationPreview = document.getElementById("invitation-preview");
const shareQuestionBtn = document.getElementById("share-question-btn");
const copyQuestionBtn = document.getElementById("copy-question-btn");
const questionShareStatus = document.getElementById("question-share-status");
const questionManualCopy = document.getElementById("question-manual-copy");
const questionShareText = document.getElementById("question-share-text");
const invitationError = document.getElementById("invitation-error");
const recoverRoundBtn = document.getElementById("recover-round-btn");
let invitedQuestion = null;
let invitationAnswered = false;

// A fixed public address and checked bank ID are the only link inputs.
function questionInvitation() {
    const question = questions[0];
    if (!question || !questionBank.includes(question)) return null;
    return {
        title: "Quiz Quest | Try a Brainer Question",
        text: `Can you answer this Brainer question? ${question.question}`,
        url: `${quizUrl}#question=${question.id}`,
    };
}

async function copyQuestion() {
    if (copyQuestionBtn.disabled) return;
    const invitation = questionInvitation();
    if (!invitation) return;
    const version = sharingVersion;
    const text = `${invitation.text}\n${invitation.url}`;
    copyQuestionBtn.disabled = true;
    questionShareStatus.textContent = "";
    try {
        await navigator.clipboard.writeText(text);
        if (version !== sharingVersion) return;
        questionManualCopy.classList.add("hidden");
        questionShareStatus.textContent = "Question invitation copied. Ready to send!";
    } catch {
        if (version !== sharingVersion) return;
        questionShareText.value = text;
        questionManualCopy.classList.remove("hidden");
        questionShareStatus.textContent = "Automatic copying isn’t available. Copy the selected invitation below.";
        questionShareText.focus();
        questionShareText.select();
    } finally {
        if (version === sharingVersion) copyQuestionBtn.disabled = false;
    }
}

async function shareQuestion() {
    if (shareQuestionBtn.disabled) return;
    if (typeof navigator.share !== "function") return copyQuestion();
    const invitation = questionInvitation();
    if (!invitation) return;
    const version = sharingVersion;
    shareQuestionBtn.disabled = true;
    questionShareStatus.textContent = "";
    try {
        await navigator.share(invitation);
        if (version === sharingVersion) questionShareStatus.textContent = "Question invitation shared.";
    } catch (error) {
        if (version !== sharingVersion) return;
        questionShareStatus.textContent = error && error.name === "AbortError"
            ? "Sharing cancelled. Your result is still here."
            : "Device sharing isn’t available. Use Copy Question Link to send the invitation.";
    } finally {
        if (version === sharingVersion) shareQuestionBtn.disabled = false;
    }
}

function readQuestionLink(hash) {
    const match = /^#question=([a-z0-9-]+)$/.exec(hash);
    return match ? questionBank.find((question) => question.id === match[1]) || null : null;
}

function showInvitation(question) {
    invitedQuestion = question;
    invitationAnswered = false;
    invitationHeading.textContent = question.question;
    invitationFeedback.textContent = "";
    invitationButtons.forEach((button, index) => {
        button.textContent = question.choices[index];
        button.disabled = false;
        button.classList.remove("correct", "wrong");
    });
    showScreen(invitationScreen);
    invitationHeading.focus();
}

function answerInvitation(index) {
    if (!invitedQuestion || invitationAnswered) return;
    invitationAnswered = true;
    const correct = invitedQuestion.correctIndex;
    invitationButtons.forEach((button) => { button.disabled = true; });
    invitationButtons[correct].classList.add("correct");
    invitationButtons[correct].textContent += " — Correct answer";
    if (index !== correct) {
        invitationButtons[index].classList.add("wrong");
        invitationButtons[index].textContent += " — Your answer";
    }
    invitationFeedback.textContent = `${index === correct ? "Correct!" : "Not quite."} Correct answer: ${invitedQuestion.choices[correct]}. ${invitedQuestion.explanation}`;
    invitationFeedback.focus();
}

function leaveQuestionLink() {
    // Drop the invitation on exit so refresh recovers the full round, not the sample.
    try {
        if (typeof location !== "undefined" && location.hash) {
            history.replaceState(null, "", location.pathname + location.search);
        }
    } catch { /* Restricted history access must not prevent play. */ }
    invitedQuestion = null;
    invitationError.classList.add("hidden");
    recoverRoundBtn.classList.add("hidden");
}

function showResumeChoice() {
    resumeSummary.textContent = `${pendingRound.answers.length} of ${roundSize} questions answered. Pick up where you left off.`;
    showScreen(resumeScreen);
    resumeHeading.focus();
}

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
    saveImageBtn.disabled = false;
    saveImageStatus.textContent = "";
    questionShareStatus.textContent = "";
    questionShareText.value = "";
    invitationPreview.textContent = "";
    questionManualCopy.classList.add("hidden");
    shareQuestionBtn.disabled = false;
    copyQuestionBtn.disabled = false;
}

// Draw from an explicit score and fixed copy, never from results DOM or identity.
function scoreImage(roundScore) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image drawing unavailable");
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, 1200, 900);
    context.fillStyle = "#ffffff";
    context.fillRect(48, 48, 1104, 804);
    context.fillStyle = "#2563eb";
    context.fillRect(48, 48, 1104, 12);
    context.textAlign = "center";
    context.fillStyle = "#2563eb";
    context.font = "bold 48px sans-serif";
    context.fillText("Quiz Quest", 600, 150);
    context.fillStyle = "#172554";
    context.font = "36px sans-serif";
    context.fillText("My Brainer quiz score", 600, 230);
    context.font = "bold 160px sans-serif";
    context.fillText(`${roundScore} / ${roundSize}`, 600, 420);
    context.fillStyle = "#f59e0b";
    context.fillRect(520, 460, 160, 8);
    context.fillStyle = "#172554";
    context.font = "bold 46px sans-serif";
    context.fillText("How many can you get right?", 600, 555);
    context.font = "34px sans-serif";
    context.fillText("Answer five multiple-choice questions about Brainer.", 600, 625);
    context.font = "28px sans-serif";
    context.fillText("Your round may differ.", 600, 680);
    context.fillStyle = "#2563eb";
    context.font = "bold 32px sans-serif";
    context.fillText(quizUrl, 600, 780);
    return canvas;
}

async function saveScoreImage() {
    if (saveImageBtn.disabled) return;
    const version = sharingVersion;
    const roundScore = score;
    let link;
    let objectUrl;
    saveImageBtn.disabled = true;
    saveImageStatus.textContent = "Preparing your score image…";
    try {
        link = document.createElement("a");
        if (!("download" in link) || typeof URL.createObjectURL !== "function" ||
            typeof URL.revokeObjectURL !== "function") throw new Error("Download unavailable");
        const canvas = scoreImage(roundScore);
        const blob = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Image preparation timed out")), 10000);
            try {
                canvas.toBlob((image) => {
                    clearTimeout(timer);
                    if (image) resolve(image);
                    else reject(new Error("Image preparation failed"));
                }, "image/png");
            } catch (error) {
                clearTimeout(timer);
                reject(error);
            }
        });
        if (version !== sharingVersion) return;
        objectUrl = URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = `quiz-quest-score-${roundScore}-of-${roundSize}.png`;
        link.hidden = true;
        document.body.append(link);
        link.click();
        // Browsers don't report whether a user accepts or blocks a download.
        saveImageStatus.textContent = "Image download requested. If it didn’t save, use Copy Result to send your score and link.";
    } catch {
        if (version === sharingVersion) {
            saveImageStatus.textContent = "Saving an image isn’t available here. Use Copy Result to send your score and link. Your result is still here.";
        }
    } finally {
        if (link) link.remove();
        // Allow the browser time to consume the blob before releasing it.
        if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        if (version === sharingVersion) saveImageBtn.disabled = false;
    }
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
    invitationScreen.classList.add("hidden");
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
    invitationPreview.textContent = questions[0].question;
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
    leaveQuestionLink();
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
    leaveQuestionLink();
    clearSharing();
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
saveImageBtn.addEventListener("click", saveScoreImage);
resumeBtn.addEventListener("click", resumeRound);
discardBtn.addEventListener("click", resetQuiz);

shareQuestionBtn.addEventListener("click", shareQuestion);
copyQuestionBtn.addEventListener("click", copyQuestion);
invitationButtons.forEach((button, index) => {
    button.addEventListener("click", () => answerInvitation(index));
});
document.getElementById("invitation-start-btn").addEventListener("click", () => {
    leaveQuestionLink();
    if (pendingRound) showResumeChoice();
    else resetQuiz();
});
recoverRoundBtn.addEventListener("click", () => {
    leaveQuestionLink();
    if (pendingRound) showResumeChoice();
});

function openQuestionLink() {
    pendingRound = readSavedProgress();
    const hash = typeof location === "undefined" ? "" : location.hash;
    const question = readQuestionLink(hash);
    invitationError.classList.add("hidden");
    recoverRoundBtn.classList.add("hidden");
    if (question) showInvitation(question);
    else if (hash) {
        invitedQuestion = null;
        showScreen(startScreen);
        invitationError.textContent = "That question link isn’t available. Try a five-question round instead.";
        invitationError.classList.remove("hidden");
        if (pendingRound) recoverRoundBtn.classList.remove("hidden");
    } else if (pendingRound) showResumeChoice();
    else showScreen(startScreen);
}

openQuestionLink();
if (typeof window !== "undefined") window.addEventListener("hashchange", openQuestionLink);
