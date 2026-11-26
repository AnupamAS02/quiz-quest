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
elements["player-name"].value = "  ";
submit({ preventDefault() {} });
assert.ok(elements["player-name"].validationMessage);
elements["player-name"].value = "Alex";
submit({ preventDefault() {} });
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
const poolBeforeReset = run("remainingQuestions.length");
elements["play-again-btn"].listeners.click();
assert.equal(run("score"), 0);
assert.equal(elements["player-name"].value, "");
assert.equal(elements["progress-fill"].style.width, "0%");
assert.equal(run("remainingQuestions.length"), poolBeforeReset);
assert.equal(elements["answer-feedback"].textContent, "");
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
    elements["play-again-btn"].listeners.click();
}
console.log("Passed: 20-question bank, 100 fresh rounds, validation, feedback, scores 0/4/5, progress, results and reset.");
