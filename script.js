// ============================================
// Quiz data
// ============================================
// An array of question objects. Each object has:
//   - question: the question text (string)
//   - choices: 4 possible answers (array of strings)
//   - correctIndex: index (0-3) of the correct answer in `choices`

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