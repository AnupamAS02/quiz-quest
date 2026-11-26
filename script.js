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

let currentQuestionIndex = 0;
let score = 0;
let playerName = "";
let answered = false;

function showScreen(screenToShow) {
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
    const currentQuestion = questions[currentQuestionIndex];
    const correctIndex = currentQuestion.correctIndex;
    answerButtons.forEach((button) => { button.disabled = true; });
    answerButtons[correctIndex].classList.add("correct");
    answerButtons[correctIndex].textContent += " — Correct answer";
    if (selectedIndex === correctIndex) {
        score++;
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
    const percentage = Math.round((score / roundSize) * 100);
    let message;
    if (percentage === 100) {
        message = `Perfect score, ${playerName}! 🏆`;
    } else if (percentage >= 80) {
        message = `Excellent work, ${playerName}!`;
    } else if (percentage >= 60) {
        message = `Nice job, ${playerName}!`;
    } else {
        message = `Thanks for playing, ${playerName}! Ready for another round?`;
    }
    finalMessage.textContent = message;
    finalScore.textContent = `You scored ${score} out of ${roundSize} (${percentage}%)`;
    showScreen(resultsScreen);
    resultsHeading.focus();
}

function resetQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    playerName = "";
    answered = false;
    playerNameInput.value = "";
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
    if (name.length < 2) {
        playerNameInput.setCustomValidity("Enter a name with at least two characters.");
        playerNameInput.reportValidity();
        return;
    }
    playerName = name;
    questions = drawRound();
    currentQuestionIndex = 0;
    score = 0;
    showScreen(quizScreen);
    loadQuestion();
});
answerButtons.forEach((button, index) => {
    button.dataset.index = index;
    button.addEventListener("click", handleAnswerClick);
});
nextQuestionBtn.addEventListener("click", () => {
    if (!answered) return;
    currentQuestionIndex++;
    if (currentQuestionIndex < roundSize) loadQuestion();
    else showResults();
});
playAgainBtn.addEventListener("click", resetQuiz);
