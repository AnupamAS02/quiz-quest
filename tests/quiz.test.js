const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function element() {
    const classes = new Set();
    return {
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            contains: (name) => classes.has(name),
        },
        children: [], open: false,
        append(...items) { this.children.push(...items); },
        replaceChildren(...items) { this.children = items; },
        style: {}, dataset: {}, attributes: {}, listeners: {},
        textContent: "", value: "", disabled: false,
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        focus() { this.focused = true; },
        setCustomValidity(message) { this.validationMessage = message; },
        reportValidity() {},
    };
}
const elements = {};
const answers = Array.from({ length: 4 }, element);
const context = vm.createContext({
    Math,
    document: {
        createElement: () => element(),
        getElementById: (id) => elements[id] ||= element(),
        querySelectorAll: () => answers,
    },
});
vm.runInContext(fs.readFileSync("questions.js", "utf8") + "\n" + fs.readFileSync("script.js", "utf8"), context);
const run = (code) => vm.runInContext(code, context);
const bank = run("questionBank");
assert.ok(bank.length >= 15);
assert.equal(new Set(bank.map((q) => q.id)).size, bank.length);
assert.equal(new Set(bank.map((q) => q.question)).size, bank.length);
for (const q of bank) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4);
    assert.ok(q.explanation.length > 20);
    assert.match(q.source, /^https:\/\/help\.brainer\.ceo\//);
}
let previous = [];
const firstCycle = [];
for (let index = 0; index < 100; index++) {
    const ids = run("questions = drawRound(); questions.map(q => q.id)");
    assert.equal(ids.length, 5);
    assert.equal(new Set(ids).size, 5);
    assert.ok(ids.every((id) => !previous.includes(id)), "Consecutive rounds must not overlap");
    if (index < 4) firstCycle.push(...ids);
    previous = ids;
}
assert.equal(new Set(firstCycle).size, 20);
const submit = elements["start-form"].listeners.submit;
for (const nickname of ["A", " A ", "A".repeat(21)]) {
    elements["player-name"].value = nickname;
    submit({ preventDefault() {} });
    assert.match(elements["player-name"].validationMessage, /2–20 characters/);
    assert.equal(run("playerName"), "");
    elements["player-name"].listeners.input();
    assert.equal(elements["player-name"].validationMessage, "");
}
elements["player-name"].value = "  Alex  ";
submit({ preventDefault() {} });
assert.equal(run("playerName"), "Alex");
for (let index = 0; index < 5; index++) {
    assert.equal(elements["question-counter"].textContent, `Question ${index + 1} of 5`);
    const correct = run("questions[currentQuestionIndex].correctIndex");
    const selected = index === 1 ? (correct + 1) % 4 : correct;
    const event = { currentTarget: answers[selected] };
    answers[selected].listeners.click(event);
    const scoreAfterAnswer = run("score");
    answers[selected].listeners.click(event);
    assert.equal(run("score"), scoreAfterAnswer, "Repeated answer cannot add score");
    assert.ok(answers.every((answer) => answer.disabled));
    assert.ok(answers[correct].classList.contains("correct"));
    assert.ok(elements["answer-feedback"].textContent.length > 20);
    assert.equal(elements["quiz-progress"].attributes["aria-valuenow"], index + 1);
    if (index === 1) assert.ok(answers[selected].classList.contains("wrong"));
    elements["next-question-btn"].listeners.click();
}
assert.equal(elements["final-score"].textContent, "You scored 4 out of 5 (80%)");
assert.match(elements["final-message"].textContent, /Alex/);
const completedQuestions = run("questions");
const completedAnswers = Array.from(run("selectedAnswers"));
assert.equal(completedAnswers.length, 5, "Repeated clicks must not record extra answers");
assert.equal(elements["answer-review"].open, false);
const reviewItems = elements["review-list"].children;
assert.equal(reviewItems.length, 5);
for (const [index, item] of reviewItems.entries()) {
    const question = completedQuestions[index];
    const [heading, outcome, selected, correct, explanation, source] = item.children;
    assert.equal(heading.textContent, `Question ${index + 1}: ${question.question}`);
    assert.equal(outcome.textContent, index === 1 ? "Not quite" : "Correct");
    assert.equal(selected.textContent, `Your answer: ${question.choices[completedAnswers[index]]}`);
    assert.equal(correct.textContent, `Correct answer: ${question.choices[question.correctIndex]}`);
    assert.equal(explanation.textContent, question.explanation);
    assert.equal(source.href, question.source);
    assert.equal(source.target, "_blank");
    assert.equal(source.rel, "noopener noreferrer");
}
elements["answer-review"].open = true;
const poolBeforeReset = run("remainingQuestions.length");
elements["play-again-btn"].listeners.click();
assert.equal(run("score"), 0);
assert.equal(run("selectedAnswers.length"), 0);
assert.equal(elements["review-list"].children.length, 0);
assert.equal(elements["answer-review"].open, false);
assert.equal(elements["player-name"].value, "");
assert.equal(elements["progress-fill"].style.width, "0%");
assert.equal(run("remainingQuestions.length"), poolBeforeReset);
assert.equal(elements["answer-feedback"].textContent, "");
let previousRoundIds = completedQuestions.map((question) => question.id);
for (const targetScore of [0, 5]) {
    elements["player-name"].value = "Sam";
    submit({ preventDefault() {} });
    for (let index = 0; index < 5; index++) {
        const correct = run("questions[currentQuestionIndex].correctIndex");
        const selected = targetScore === 5 ? correct : (correct + 1) % 4;
        answers[selected].listeners.click({ currentTarget: answers[selected] });
        elements["next-question-btn"].listeners.click();
    }
    assert.match(elements["final-score"].textContent, new RegExp(`You scored ${targetScore} out of 5`));
    assert.match(elements["final-message"].textContent, /Sam/);
    assert.equal(elements["review-list"].children.length, 5);
    assert.ok(elements["review-list"].children.every((item) =>
        item.children[1].textContent === (targetScore === 5 ? "Correct" : "Not quite")));
    const currentRoundIds = Array.from(run("questions.map(q => q.id)"));
    assert.ok(currentRoundIds.every((id) => !previousRoundIds.includes(id)), "Replay review must use the new round");
    previousRoundIds = currentRoundIds;
    elements["play-again-btn"].listeners.click();
}
const anonymousMessages = {
    0: "Thanks for playing! Ready for another round?",
    3: "Nice job!",
    4: "Excellent work!",
    5: "Perfect score! 🏆",
};
for (const nickname of ["", " ", " \t\n ", "Jo", "A".repeat(20), "<b>Alex</b>"]) {
    for (const targetScore of [0, 3, 4, 5]) {
        elements["player-name"].value = nickname;
        submit({ preventDefault() {} });
        assert.equal(elements["player-name"].validationMessage, "");
        assert.equal(run("playerName"), nickname.trim());
        assert.equal(elements["quiz-screen"].classList.contains("hidden"), false);
        for (let index = 0; index < 5; index++) {
            const correct = run("questions[currentQuestionIndex].correctIndex");
            const selected = index < targetScore ? correct : (correct + 1) % 4;
            answers[selected].listeners.click({ currentTarget: answers[selected] });
            elements["next-question-btn"].listeners.click();
        }
        assert.equal(elements["final-score"].textContent, `You scored ${targetScore} out of 5 (${targetScore * 20}%)`);
        if (nickname.trim()) {
            assert.ok(elements["final-message"].textContent.includes(`, ${nickname.trim()}!`));
        } else {
            assert.equal(elements["final-message"].textContent, anonymousMessages[targetScore]);
        }
        assert.equal(elements["review-list"].children.length, 5);
        assert.ok(!run("resultText()").includes("Alex"));
        elements["play-again-btn"].listeners.click();
        assert.equal(run("playerName"), "");
        assert.equal(elements["player-name"].value, "");
        assert.equal(elements["player-name"].validationMessage, "");
        assert.equal(elements["review-list"].children.length, 0);
    }
}
const html = fs.readFileSync("index.html", "utf8");
assert.match(html, /<label for="player-name">Nickname \(optional, 2–20 characters\):<\/label>/);
const nicknameInput = html.match(/<input[^>]+id="player-name"[^>]*>/)[0];
assert.ok(!/\brequired\b|\bminlength\b/.test(nicknameInput), "Native validation must allow even a single space");
assert.match(nicknameInput, /maxlength="20"/);
console.log("Passed: 20-question bank, 100 fresh rounds, optional/trimmed nicknames, length limits, feedback, scores 0/3/4/5, review, progress, results and reset.");
