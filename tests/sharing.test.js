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
        style: {}, dataset: {}, textContent: "", value: "", disabled: false,
        setAttribute() {}, addEventListener() {},
        focus() { this.focused = true; },
        select() { this.selected = true; },
    };
}
const elements = {};
const navigator = {};
const context = vm.createContext({
    Math, navigator,
    document: {
        getElementById: (id) => elements[id] ||= element(),
        querySelectorAll: () => Array.from({ length: 4 }, element),
    },
});
vm.runInContext(fs.readFileSync("questions.js", "utf8") + "\n" + fs.readFileSync("script.js", "utf8"), context);
const run = (code) => vm.runInContext(code, context);
const url = "https://anupamas02.github.io/quiz-quest/";

(async () => {
    for (const score of [0, 3, 5]) {
        run(`score = ${score}; playerName = "Private Name"; showResults()`);
        const result = elements["final-score"].textContent;
        let payload;
        navigator.share = async (data) => { payload = data; };
        await run("shareResult()");
        assert.equal(payload.url, url);
        assert.match(payload.text, new RegExp(`I scored ${score} out of 5`));
        assert.match(payload.text, /round may differ/);
        assert.ok(!JSON.stringify(payload).includes("Private Name"));
        assert.equal(elements["final-score"].textContent, result);
        assert.equal(run("score"), score);
    }

    let copied = "";
    navigator.clipboard = { writeText: async (text) => { copied = text; } };
    navigator.share = async () => { throw { name: "AbortError" }; };
    await run("shareResult()");
    assert.match(elements["share-status"].textContent, /cancelled/);
    assert.equal(copied, "", "Cancellation must not copy");
    assert.equal(elements["share-result-btn"].disabled, false);

    navigator.share = async () => { throw { name: "NotAllowedError" }; };
    await run("shareResult()");
    assert.match(elements["share-status"].textContent, /Use Copy Result/);
    await run("copyResult()");
    assert.match(copied, /I scored 5 out of 5/);
    assert.ok(copied.endsWith(url));
    assert.ok(!copied.includes("Private Name"));
    assert.match(elements["share-status"].textContent, /copied/);

    delete navigator.share;
    copied = "";
    await run("shareResult()");
    assert.ok(copied.endsWith(url), "Unsupported device sharing falls back to copy");

    navigator.clipboard.writeText = async () => { throw new Error("Denied"); };
    await run("copyResult()");
    assert.equal(elements["manual-copy"].classList.contains("hidden"), false);
    assert.ok(elements["share-text"].focused && elements["share-text"].selected);
    assert.equal(elements["share-text"].value, copied);
    delete navigator.clipboard;
    await run("copyResult()");
    assert.match(elements["share-status"].textContent, /Copy the selected text/);
    assert.equal(run("score"), 5);

    run("resetQuiz()");
    assert.equal(elements["share-text"].value, "");
    assert.equal(elements["share-status"].textContent, "");
    assert.equal(elements["manual-copy"].classList.contains("hidden"), true);
    assert.equal(elements["final-score"].textContent, "");
    assert.equal(elements["final-message"].textContent, "");
    assert.equal(run("score"), 0);

    // A late clipboard response cannot populate a later round or the start screen.
    let rejectCopy;
    navigator.clipboard = { writeText: () => new Promise((resolve, reject) => { rejectCopy = reject; }) };
    run('score = 2; playerName = "Next Player"; showResults()');
    const pendingCopy = run("copyResult()");
    run("resetQuiz(); score = 1; showResults()");
    rejectCopy(new Error("Late denial"));
    await pendingCopy;
    assert.equal(elements["share-status"].textContent, "");
    assert.equal(elements["share-text"].value, "");
    assert.equal(elements["copy-result-btn"].disabled, false);

    let resolveShare;
    navigator.share = () => new Promise((resolve) => { resolveShare = resolve; });
    const pendingShare = run("shareResult()");
    run("resetQuiz()");
    resolveShare();
    await pendingShare;
    assert.equal(elements["share-status"].textContent, "");
    assert.equal(elements["share-result-btn"].disabled, false);
    console.log("Passed: private scores 0/3/5, canonical link, native sharing, cancellation, denied sharing, clipboard fallback, manual copy, reset and late responses.");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
