const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("questions.js", "utf8") + "\n" + fs.readFileSync("script.js", "utf8");
const key = "quiz-quest:unfinished-round";
function storage() {
    const values = new Map();
    return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
}
function element() {
    const classes = new Set(["hidden"]);
    return {
        classList: { add: (...n) => n.forEach((v) => classes.add(v)), remove: (...n) => n.forEach((v) => classes.delete(v)), contains: (n) => classes.has(n) },
        children: [], listeners: {}, dataset: {}, style: {}, value: "", textContent: "", disabled: false,
        append(...items) { this.children.push(...items); }, replaceChildren(...items) { this.children = items; },
        addEventListener(n, cb) { this.listeners[n] = cb; }, setAttribute() {}, setCustomValidity() {}, reportValidity() {},
        focus() { this.focused = true; }, select() { this.selected = true; },
    };
}
function boot(hash = "", saved = storage()) {
    const elements = {};
    const answers = Array.from({ length: 4 }, element);
    const navigator = {};
    const location = { hash, pathname: "/quiz-quest/", search: "?utm_source=friend" };
    const history = { replaceState(_a, _b, address) { this.address = address; location.hash = ""; } };
    const context = vm.createContext({ navigator, sessionStorage: saved, location, history,
        document: { getElementById: (id) => elements[id] ||= element(), querySelectorAll: () => answers, createElement: element } });
    vm.runInContext(source, context);
    const run = (code) => vm.runInContext(code, context);
    return { run, elements, answers, navigator, history, location, saved,
        click(id) { elements[id].listeners.click(); },
        start() { elements["start-form"].listeners.submit({ preventDefault() {} }); },
        answer() { const i = run("questions[currentQuestionIndex].correctIndex"); answers[i].listeners.click({ currentTarget: answers[i] }); },
    };
}
(async () => {
    const bank = boot().run("questionBank");
    // The newer crawlable sample hands off through this pre-existing anchor.
    const sampleHandoff = boot("#start-screen");
    assert.equal(sampleHandoff.elements["start-screen"].classList.contains("hidden"), false);
    assert.equal(sampleHandoff.elements["invitation-error"].classList.contains("hidden"), true);
    sampleHandoff.start(); sampleHandoff.answer();
    assert.equal(sampleHandoff.location.hash, "#start-screen");
    const sampleRefreshed = boot("#start-screen", sampleHandoff.saved);
    assert.equal(sampleRefreshed.elements["resume-screen"].classList.contains("hidden"), false);
    assert.equal(sampleRefreshed.elements["invitation-error"].classList.contains("hidden"), true);
    // Every stable ID, both outcomes, no scoring/storage, no repeated answer.
    for (const q of bank) {
        for (const selected of [q.correctIndex, (q.correctIndex + 1) % 4]) {
            let app = boot(`#question=${q.id}`);
            assert.equal(app.elements["invitation-screen"].classList.contains("hidden"), false);
            assert.equal(app.elements["invitation-heading"].textContent, q.question);
            assert.equal(app.elements["invitation-feedback"].textContent, "");
            assert.ok(!app.elements["invitation-heading"].textContent.includes(q.explanation));
            for (let i = 0; i < 4; i++) assert.equal(app.elements[`invitation-answer-${i}`].textContent, q.choices[i]);
            app.click(`invitation-answer-${selected}`);
            const feedback = app.elements["invitation-feedback"].textContent;
            assert.ok(feedback.startsWith(selected === q.correctIndex ? "Correct!" : "Not quite."));
            assert.ok(feedback.includes(q.choices[q.correctIndex]) && feedback.includes(q.explanation));
            assert.ok(app.elements["invitation-feedback"].focused);
            app.click(`invitation-answer-${(selected + 1) % 4}`);
            assert.equal(app.elements["invitation-feedback"].textContent, feedback);
            assert.equal(app.run("score"), 0);
            assert.equal(app.saved.getItem(key), null);
            assert.ok(app.run("invitationButtons.every(b => b.disabled)"));
            app.click("invitation-start-btn");
            assert.equal(app.location.hash, "");
            assert.equal(app.history.address, "/quiz-quest/?utm_source=friend");
            app.start();
            assert.equal(app.run("questions.length"), 5);
            assert.equal(app.run("selectedAnswers.length"), 0);
            assert.equal(app.run("score"), 0);
            const refresh = boot("", app.saved);
            assert.equal(refresh.elements["resume-screen"].classList.contains("hidden"), false);
        }
    }
    for (const hash of ["#question=", "#question=missing", "#question=CEO-role", "#question=%63eo-role", "#question=ceo-role&answer=1", "#question=ceo-role#score=5", "#<script>alert(1)</script>", "#question=ceo-role&question=writer-role"]) {
        const app = boot(hash);
        assert.equal(app.elements["start-screen"].classList.contains("hidden"), false);
        assert.equal(app.elements["invitation-error"].classList.contains("hidden"), false);
        assert.equal(app.run("invitedQuestion"), null);
        app.start(); app.answer();
        assert.equal(app.run("score"), 1);
        assert.equal(app.location.hash, "");
    }
    const saved = storage();
    let app = boot("", saved);
    app.start(); app.answer();
    const original = saved.getItem(key);
    app = boot("#question=ceo-role", saved);
    app.click("invitation-answer-0");
    assert.equal(saved.getItem(key), original, "Invitation cannot overwrite an unfinished round");
    app.click("invitation-start-btn");
    assert.equal(app.elements["resume-screen"].classList.contains("hidden"), false);
    app.click("resume-btn");
    assert.equal(app.run("score"), 1);
    assert.equal(app.run("selectedAnswers.length"), 1);
    app = boot("#question=invalid", saved);
    assert.equal(app.elements["recover-round-btn"].classList.contains("hidden"), false);
    app.click("recover-round-btn"); app.click("discard-btn");
    assert.equal(saved.getItem(key), null);
    const blocked = { getItem() { throw Error("Blocked"); }, setItem() { throw Error("Blocked"); }, removeItem() { throw Error("Blocked"); } };
    app = boot("#question=ceo-role", blocked);
    app.click("invitation-answer-1"); app.click("invitation-start-btn"); app.start(); app.answer();
    assert.equal(app.run("score"), 1);

    app = boot(); app.start();
    for (let i = 0; i < 5; i++) { app.answer(); app.click("next-question-btn"); }
    app.run('playerName = "Private Nickname"');
    const q = app.run("questions[0]");
    assert.equal(app.elements["invitation-preview"].textContent, q.question);
    const before = app.run("JSON.stringify({score, selectedAnswers, ids: questions.map(q => q.id)})");
    const navigating = boot();
    navigating.start(); navigating.answer();
    const savedBeforeNavigation = navigating.saved.getItem(key);
    navigating.location.hash = "#question=ceo-role";
    navigating.run("openQuestionLink()");
    assert.equal(navigating.elements["invitation-screen"].classList.contains("hidden"), false);
    navigating.click("invitation-answer-1");
    assert.equal(navigating.saved.getItem(key), savedBeforeNavigation);
    navigating.location.hash = "#question=writer-role";
    navigating.run("openQuestionLink()");
    assert.equal(navigating.elements["invitation-feedback"].textContent, "");
    assert.equal(navigating.run("invitationAnswered"), false);
    navigating.location.hash = "#question=missing";
    navigating.run("openQuestionLink()");
    assert.equal(navigating.elements["start-screen"].classList.contains("hidden"), false);
    app.elements["answer-review"].open = true;
    let payload;
    app.navigator.share = async (data) => { payload = data; };
    await app.run("shareQuestion()");
    assert.equal(payload.url, `https://anupamas02.github.io/quiz-quest/#question=${q.id}`);
    assert.ok(payload.text.includes(q.question));
    assert.deepEqual(Object.keys(payload).sort(), ["text", "title", "url"]);
    assert.ok(!JSON.stringify(payload).includes("Private Nickname"));
    assert.ok(!payload.text.includes(q.explanation) && !payload.text.includes(q.choices[q.correctIndex]));
    assert.ok(!JSON.stringify(payload).match(/score|answer=|nickname=/i));
    let copied = "";
    app.navigator.clipboard = { writeText: async (text) => { copied = text; } };
    app.navigator.share = async () => { throw { name: "AbortError" }; };
    await app.run("shareQuestion()");
    assert.equal(copied, "");
    assert.match(app.elements["question-share-status"].textContent, /cancelled/);
    app.navigator.share = async () => { throw Error("Denied"); };
    await app.run("shareQuestion()");
    assert.match(app.elements["question-share-status"].textContent, /Copy Question Link/);
    delete app.navigator.share;
    await app.run("shareQuestion()");
    assert.equal(copied, `${payload.text}\n${payload.url}`);
    delete app.navigator.clipboard;
    await app.run("copyQuestion()");
    assert.equal(app.elements["question-share-text"].value, copied);
    assert.ok(app.elements["question-share-text"].focused && app.elements["question-share-text"].selected);
    assert.equal(app.run("JSON.stringify({score, selectedAnswers, ids: questions.map(q => q.id)})"), before);
    assert.equal(app.elements["answer-review"].open, true);
    assert.equal(app.elements["review-list"].children.length, 5);
    for (const kind of ["copy", "share"]) {
        let settle;
        if (kind === "copy") app.navigator.clipboard = { writeText: () => new Promise((_r, reject) => { settle = reject; }) };
        else app.navigator.share = () => new Promise((resolve) => { settle = resolve; });
        const pending = app.run(kind === "copy" ? "copyQuestion()" : "shareQuestion()");
        app.click("play-again-btn");
        settle(Error("Late reply")); await pending;
        assert.equal(app.elements["question-share-status"].textContent, "");
        assert.equal(app.elements["question-share-text"].value, "");
        assert.equal(app.elements["question-manual-copy"].classList.contains("hidden"), true);
        assert.equal(app.elements["share-question-btn"].disabled, false);
        assert.equal(app.elements["copy-question-btn"].disabled, false);
        app.start();
        for (let i = 0; i < 5; i++) { app.answer(); app.click("next-question-btn"); }
    }
    console.log("Passed: all 20 question links and both outcomes, private invitation payload, invalid links, full rounds and refresh, preserved/discardable saves, blocked storage, share/copy fallbacks, cancellation, preserved review/replay and late replies.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
