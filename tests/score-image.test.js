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
        children: [], open: false, style: {}, dataset: {}, textContent: "", value: "", disabled: false,
        append(...items) { this.children.push(...items); },
        replaceChildren(...items) { this.children = items; },
        setAttribute() {}, addEventListener() {}, setCustomValidity() {}, focus() {}, select() {},
        remove() { this.removed = true; },
    };
}

const elements = {};
const drawing = [];
const downloads = [];
const revoked = [];
const timers = new Map();
let nextTimer = 0;
let mode = "success";
let pendingBlob;
let canvas;
let link;
const url = "https://anupamas02.github.io/quiz-quest/";
const context = vm.createContext({
    Math, navigator: {},
    setTimeout(callback, delay) { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    URL: {
        createObjectURL(blob) {
            if (mode === "url-error") throw new Error("Blocked blob URL");
            assert.equal(blob.type, "image/png");
            return "blob:private-score";
        },
        revokeObjectURL(value) { revoked.push(value); },
    },
    document: {
        body: element(),
        getElementById: (id) => elements[id] ||= element(),
        querySelectorAll: () => Array.from({ length: 4 }, element),
        createElement(tag) {
            if (tag === "a") {
                link = element();
                if (mode !== "unsupported") link.download = "";
                link.click = () => {
                    if (mode === "click-error") throw new Error("Download denied");
                    downloads.push({ href: link.href, name: link.download });
                };
                return link;
            }
            if (tag === "canvas") {
                if (mode === "canvas-error") throw new Error("No canvas");
                canvas = {
                    getContext: () => mode === "no-context" ? null : {
                        fillRect() {},
                        fillText(text, x, y) { drawing.push({ text, x, y }); },
                    },
                    toBlob(callback, type) {
                        assert.equal(type, "image/png");
                        if (mode === "encode-error") throw new Error("Encoding denied");
                        if (mode === "pending") pendingBlob = callback;
                        else callback(mode === "null-blob" ? null : { type });
                    },
                };
                if (mode === "no-encoder") delete canvas.toBlob;
                return canvas;
            }
            return element();
        },
    },
});
vm.runInContext(fs.readFileSync("questions.js", "utf8") + "\n" + fs.readFileSync("script.js", "utf8"), context);
const run = (code) => vm.runInContext(code, context);
function prepare(score) {
    run(`questions = drawRound(); selectedAnswers = questions.map(q => q.correctIndex); score = ${score}; playerName = "Private Nickname"; showResults(); answerReview.open = true`);
}
function intact(score) {
    assert.equal(run("score"), score);
    assert.equal(run("playerName"), "Private Nickname");
    assert.equal(elements["results-screen"].classList.contains("hidden"), false);
    assert.equal(elements["answer-review"].open, true);
    assert.equal(elements["review-list"].children.length, 5);
    assert.match(elements["final-score"].textContent, new RegExp(`${score} out of 5`));
    assert.equal(elements["save-image-btn"].disabled, false);
}
function flushTimers(delay) {
    for (const [id, timer] of timers) {
        if (timer.delay === delay) { timers.delete(id); timer.callback(); }
    }
}

(async () => {
    for (const score of [0, 3, 5]) {
        prepare(score);
        drawing.length = 0;
        await run("saveScoreImage()");
        assert.equal(canvas.width, 1200);
        assert.equal(canvas.height, 900);
        const text = drawing.map((item) => item.text).join("\n");
        assert.ok(text.includes(`${score} / 5`));
        assert.ok(text.includes("Answer five multiple-choice questions about Brainer."));
        assert.ok(text.includes(url));
        assert.ok(text.includes("Your round may differ."));
        assert.ok(!text.includes("Private Nickname"));
        for (const question of run("questions")) {
            assert.ok(!text.includes(question.question));
            assert.ok(!text.includes(question.explanation));
            assert.ok(!text.includes(question.source));
        }
        assert.equal(downloads.at(-1).name, `quiz-quest-score-${score}-of-5.png`);
        assert.equal(downloads.at(-1).href, "blob:private-score");
        assert.ok(link.removed);
        assert.match(elements["save-image-status"].textContent, /download requested/);
        intact(score);
        flushTimers(60000);
        assert.equal(timers.size, 0);
    }
    assert.equal(revoked.length, 3);

    for (const failure of ["unsupported", "canvas-error", "no-context", "no-encoder", "encode-error", "null-blob", "url-error", "click-error"]) {
        mode = failure;
        prepare(3);
        const before = downloads.length;
        await run("saveScoreImage()");
        assert.equal(downloads.length, before);
        assert.match(elements["save-image-status"].textContent, /Use Copy Result/);
        intact(3);
        flushTimers(60000);
        assert.equal(timers.size, 0);
    }

    // A non-responsive encoder times out and can be retried.
    mode = "pending";
    prepare(5);
    const timedOut = run("saveScoreImage()");
    flushTimers(10000);
    await timedOut;
    intact(5);
    assert.match(elements["save-image-status"].textContent, /isn’t available/);
    pendingBlob({ type: "image/png" });

    // Replay while encoding prevents stale downloads and status updates.
    prepare(3);
    const pendingSave = run("saveScoreImage()");
    const before = downloads.length;
    await run("saveScoreImage()"); // Repeated clicks cannot create duplicate saves.
    run("resetQuiz()");
    pendingBlob({ type: "image/png" });
    await pendingSave;
    assert.equal(downloads.length, before);
    assert.equal(elements["save-image-status"].textContent, "");
    assert.equal(elements["save-image-btn"].disabled, false);
    assert.equal(elements["review-list"].children.length, 0);
    assert.equal(elements["answer-review"].open, false);
    assert.equal(run("score"), 0);
    assert.equal(elements["start-screen"].classList.contains("hidden"), false);

    mode = "success";
    prepare(0);
    await run("saveScoreImage()");
    intact(0);
    run("resetQuiz()");
    assert.equal(elements["save-image-status"].textContent, "");
    flushTimers(60000);
    assert.equal(timers.size, 0);
    console.log("Passed: private PNG scores 0/3/5, invitation and URL, download cleanup, unavailable/failed saving, timeout, preserved results/review, duplicate clicks and replay during/after saving.");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
