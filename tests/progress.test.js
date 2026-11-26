const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("questions.js", "utf8") + "\n" + fs.readFileSync("script.js", "utf8");
const key = "quiz-quest:unfinished-round";

function storage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
}
function element() {
    const classes = new Set(["hidden"]);
    return {
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            contains: (name) => classes.has(name),
        },
        children: [], style: {}, dataset: {}, attributes: {}, listeners: {},
        textContent: "", value: "", disabled: false, open: false,
        append(...items) { this.children.push(...items); },
        replaceChildren(...items) { this.children = items; },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        focus() { this.focused = true; }, select() {},
        setCustomValidity() {}, reportValidity() {},
    };
}
function boot(saved = storage(), override = "") {
    const elements = {};
    const answers = Array.from({ length: 4 }, element);
    const navigator = {};
    const context = vm.createContext({
        sessionStorage: saved, navigator,
        document: {
            createElement: element,
            getElementById: (id) => elements[id] ||= element(),
            querySelectorAll: () => answers,
        },
    });
    vm.runInContext(source.replace('const progressVersion = 1;', override || 'const progressVersion = 1;'), context);
    const run = (code) => vm.runInContext(code, context);
    return {
        run, elements, answers, navigator,
        start(name = "") {
            elements["player-name"].value = name;
            elements["start-form"].listeners.submit({ preventDefault() {} });
        },
        answer(correct = true) {
            const right = run("questions[currentQuestionIndex].correctIndex");
            const selected = correct ? right : (right + 1) % 4;
            answers[selected].listeners.click({ currentTarget: answers[selected] });
        },
        next() { elements["next-question-btn"].listeners.click(); },
        resume() { elements["resume-btn"].listeners.click(); },
    };
}

// Refresh at every unanswered and feedback state, including the final answer.
for (const index of [0, 1, 2, 3, 4]) {
    for (const hasAnswer of [false, true]) {
        const saved = storage();
        let app = boot(saved);
        app.start("Private Nickname");
        for (let n = 0; n < index; n++) { app.answer(n % 2 === 0); app.next(); }
        if (hasAnswer) app.answer(index % 2 === 0);
        const before = app.run("JSON.stringify({ids: questions.map(q => q.id), pool: remainingQuestions.map(q => q.id), answers: selectedAnswers, index: currentQuestionIndex, score})");
        const feedback = app.elements["answer-feedback"].textContent;
        const raw = saved.getItem(key);
        assert.ok(!raw.includes("Private Nickname"));
        assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), ["version", "bank", "savedAt", "questionIds", "remainingIds", "answers", "index"].sort());
        app = boot(saved);
        assert.equal(app.run("pendingRound !== null"), true);
        assert.equal(app.elements["resume-screen"].classList.contains("hidden"), false);
        app.resume();
        assert.equal(app.run("JSON.stringify({ids: questions.map(q => q.id), pool: remainingQuestions.map(q => q.id), answers: selectedAnswers, index: currentQuestionIndex, score})"), before);
        assert.equal(app.run("playerName"), "");
        assert.equal(app.elements["answer-feedback"].textContent, feedback);
        assert.equal(app.elements["quiz-progress"].attributes["aria-valuenow"], index + Number(hasAnswer));
        assert.equal(app.run("answered"), hasAnswer);
        assert.ok(app.answers.every((answer) => answer.disabled === hasAnswer));
        assert.equal(app.elements["next-question-btn"].classList.contains("hidden"), !hasAnswer);
        if (hasAnswer) {
            const oldScore = app.run("score");
            app.answer();
            assert.equal(app.run("score"), oldScore);
            assert.ok(app.elements["next-question-btn"].focused);
        } else {
            app.next();
            assert.equal(app.run("currentQuestionIndex"), index);
            app.answer(index % 2 === 0);
        }
        app.next();
        while (app.run("currentQuestionIndex") < 5) { app.answer(true); app.next(); }
        assert.equal(saved.getItem(key), null, "Results clear progress");
        assert.ok(!app.elements["final-message"].textContent.includes("Private Nickname"));
        assert.equal(app.elements["review-list"].children.length, 5);
        assert.ok(!app.run("resultText()").includes("Private Nickname"));
        app.elements["play-again-btn"].listeners.click();
        assert.equal(saved.getItem(key), null);
        assert.equal(app.run("selectedAnswers.length"), 0);
        assert.equal(boot(saved).run("pendingRound"), null);
    }
}

const saved = storage();
let app = boot(saved);
app.start();
app.answer(false);
const valid = JSON.parse(saved.getItem(key));
app = boot(saved);
app.elements["discard-btn"].listeners.click();
assert.equal(saved.getItem(key), null);
assert.equal(app.elements["start-screen"].classList.contains("hidden"), false);
app.start();
assert.equal(app.run("score"), 0);
assert.equal(app.run("selectedAnswers.length"), 0);
assert.equal(app.run("currentQuestionIndex"), 0);

const mutations = [
    () => null, () => [], () => ({}),
    (d) => { d.version++; }, (d) => { d.bank += "changed"; },
    (d) => { d.savedAt -= 86400001; }, (d) => { d.savedAt += 86400000; },
    (d) => { d.savedAt = "today"; }, (d) => { d.savedAt = 1.5; },
    (d) => { d.index = -1; }, (d) => { d.index = 5; }, (d) => { d.index = 0.5; },
    (d) => { d.questionIds.pop(); }, (d) => { d.questionIds[0] = "missing"; },
    (d) => { d.questionIds[0] = d.questionIds[1]; },
    (d) => { d.remainingIds.push(d.questionIds[0]); }, (d) => { d.remainingIds = null; },
    (d) => { d.answers = [4]; }, (d) => { d.answers = [-1]; },
    (d) => { d.answers = [null]; }, (d) => { d.answers = ["0"]; },
    (d) => { d.answers = [1, 2]; }, (d) => { d.index = 3; },
    (d) => { d.nickname = "Should not be accepted"; },
];
for (const mutate of mutations) {
    const data = JSON.parse(JSON.stringify(valid));
    const replacement = mutate(data);
    saved.setItem(key, JSON.stringify(replacement === undefined ? data : replacement));
    app = boot(saved);
    assert.equal(app.run("pendingRound"), null);
    assert.equal(saved.getItem(key), null);
    app.start(); app.answer(); app.next();
    assert.equal(app.run("currentQuestionIndex"), 1);
}
saved.setItem(key, "{broken JSON");
app = boot(saved);
assert.equal(app.run("pendingRound"), null);
assert.equal(saved.getItem(key), null);
app.start();
assert.ok(saved.getItem(key), "Malformed JSON must not disable saving a fresh round");
saved.setItem(key, JSON.stringify(valid));
assert.equal(boot(saved, "const progressVersion = 2;").run("pendingRound"), null);
// A choice left open past expiry is checked again on resume.
saved.setItem(key, JSON.stringify(valid));
app = boot(saved);
saved.setItem(key, JSON.stringify({ ...valid, savedAt: Date.now() - 86400001 }));
app.resume();
assert.equal(app.elements["start-screen"].classList.contains("hidden"), false);

for (const method of ["getItem", "setItem", "removeItem", "getter"]) {
    const blocked = storage();
    if (method !== "getter") blocked[method] = () => { throw new Error("Blocked storage"); };
    app = boot(blocked);
    if (method === "getter") app.run('Object.defineProperty(globalThis, "sessionStorage", { get() { throw new Error("SecurityError"); } })');
    app.start("Jo");
    for (let n = 0; n < 5; n++) { app.answer(); app.next(); }
    assert.equal(app.run("score"), 5);
    assert.match(app.elements["final-message"].textContent, /Jo/);
    app.elements["play-again-btn"].listeners.click();
    app.start(); app.answer(false);
    assert.equal(app.run("score"), 0);
}
// Fresh, independent tab storage does not offer another tab's round.
assert.equal(boot(storage()).run("pendingRound"), null);
console.log("Passed: all 10 refresh states, exact order/pool/answers/score/feedback, no double-counting, anonymous results/review/sharing, discard/replay/completion, schema/bank/expiry validation, malformed data and blocked storage.");
