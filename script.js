const questions = [
    {
        question: "Which HTML tag is used for the largest heading?",
        choices: ["<h6>", "<heading>", "<h1>", "<head>"],
        correctIndex: 2,
    },
    {
        question: "What does CSS stand for?",
        choices: [
            "Computer Style Sheets",
            "Cascading Style Sheets",
            "Creative Style System",
            "Colorful Style Syntax",
        ],
        correctIndex: 1,
    },
    {
        question: "Which keyword declares a variable that cannot be reassigned?",
        choices: ["var", "let", "const", "static"],
        correctIndex: 2,
    },
    {
        question: "What will `typeof []` return in JavaScript?",
        choices: ["'array'", "'object'", "'list'", "'undefined'"],
        correctIndex: 1,
    },
    {
        question: "Which CSS property creates space INSIDE an element's border?",
        choices: ["margin", "padding", "spacing", "gap"],
        correctIndex: 1,
    },
];
// ============================================
// DOM Elements
// ============================================
const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultsScreen = document.getElementById("results-screen");

const startForm = document.getElementById("start-form");
const playerNameInput = document.getElementById("player-name");

const questionCounter = document.getElementById("question-counter");
const scoreDisplay = document.getElementById("score-display");
const questionText = document.getElementById("question-text");
const progressFill = document.getElementById("progress-fill");
const answerButtons = document.querySelectorAll(".answer-btn");

const finalMessage = document.getElementById("final-message");
const finalScore = document.getElementById("final-score");
const playAgainBtn = document.getElementById("play-again-btn");

// ============================================
// State (the data that changes as the quiz runs)
// ============================================
let currentQuestionIndex = 0;
let score = 0;
let playerName = "";
// ============================================
// Helper: switch which screen is visible
// ============================================
function showScreen(screenToShow) {
    startScreen.classList.add("hidden");
    quizScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");

    screenToShow.classList.remove("hidden");
}

// ============================================
// Render the current question and its choices
// ============================================
function loadQuestion() {
    const currentQuestion = questions[currentQuestionIndex];

    questionText.textContent = currentQuestion.question;
    questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    scoreDisplay.textContent = `Score: ${score}`;

    // Update progress bar
    const progressPercent = ((currentQuestionIndex) / questions.length) * 100;
    progressFill.style.width = `${progressPercent}%`;

    answerButtons.forEach((button, index) => {
        button.textContent = currentQuestion.choices[index];
        button.disabled = false;
        button.style.backgroundColor = "";
    });
}

const progressPercent = ((currentQuestionIndex) / questions.length) * 100;
progressFill.style.width = `${progressPercent}%`;

// ============================================
// Handle the user clicking an answer button
// ============================================
function handleAnswerClick(event) {
    const clickedButton = event.target;
    const selectedIndex = Number(clickedButton.dataset.index);
    const correctIndex = questions[currentQuestionIndex].correctIndex;

    // Disable all buttons so user can't click twice
    answerButtons.forEach((button) => {
        button.disabled = true;
    });

    // Show correct/wrong colors
    if (selectedIndex === correctIndex) {
        clickedButton.style.backgroundColor = "var(--color-correct)";
        score++;
    } else {
        clickedButton.style.backgroundColor = "var(--color-wrong)";
        // Also highlight the correct answer in green
        answerButtons[correctIndex].style.backgroundColor = "var(--color-correct)";
    }

    scoreDisplay.textContent = `Score: ${score}`;

    // Wait 1.2 seconds, then move to next question (or finish)
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
            loadQuestion();
        } else {
            showResults();
        }
    }, 1200);
}

// ============================================
// Show the results screen
// ============================================
function showResults() {
    progressFill.style.width = "100%";  // NEW

    const total = questions.length;
    const percentage = Math.round((score / total) * 100);

    let message;
    if (percentage === 100) {
        message = `Perfect score, ${playerName}! 🏆`;
    } else if (percentage >= 80) {
        message = `Excellent work, ${playerName}!`;
    } else if (percentage >= 60) {
        message = `Nice job, ${playerName}!`;
    } else if (percentage >= 40) {
        message = `Not bad, ${playerName}. Keep practicing!`;
    } else {
        message = `Tough one, ${playerName}. Try again!`;
    }

    finalMessage.textContent = message;
    finalScore.textContent = `You scored ${score} out of ${total} (${percentage}%)`;

    showScreen(resultsScreen);
}

// ============================================
// Reset everything and go back to the start
// ============================================
function resetQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    playerName = "";
    playerNameInput.value = "";
    progressFill.style.width = "0%";  // NEW
    showScreen(startScreen);
}

// ============================================
// Event listeners (wire everything up)
// ============================================
startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    playerName = playerNameInput.value.trim();
    showScreen(quizScreen);
    loadQuestion();
});

answerButtons.forEach((button, index) => {
    button.dataset.index = index;
    button.addEventListener("click", handleAnswerClick);
});

playAgainBtn.addEventListener("click", resetQuiz);

