const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("sample-question.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
assert.ok(head, "The sample page must have a document head");
const metadata = new Map();
for (const match of head.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]+)"\s*\/>/g)) {
    assert.ok(!metadata.has(match[1]), `Duplicate metadata: ${match[1]}`);
    metadata.set(match[1], match[2]);
}
const publicUrl = "https://anupamas02.github.io/quiz-quest/sample-question.html";
const title = "Brainer Sample Question | Quiz Quest";
const description = "Try a Brainer question: find which teammate builds the website and product. Check your answer against Brainer’s official AI team guide, then play five questions.";
assert.equal(head.match(/<title>([^<]+)<\/title>/)?.[1], title);
assert.equal(metadata.get("description"), description);
assert.equal(head.match(/<link rel="canonical" href="([^"]+)"\s*\/>/)?.[1], publicUrl);
assert.equal(metadata.get("og:url"), publicUrl);
assert.equal(metadata.get("og:title"), title);
assert.equal(metadata.get("og:description"), description);
assert.equal(metadata.get("og:type"), "website");
assert.equal(metadata.get("og:site_name"), "Quiz Quest");
assert.equal(metadata.get("twitter:card"), "summary_large_image");
assert.equal(metadata.get("twitter:title"), title);
assert.equal(metadata.get("twitter:description"), description);
assert.ok(metadata.get("og:image").startsWith("https://anupamas02.github.io/quiz-quest/"));
assert.equal(metadata.get("twitter:image"), metadata.get("og:image"));
assert.match(head, /<link rel="stylesheet" href="style\.css"\s*\/>/, "The stylesheet must remain a relative asset");
assert.match(html, /<script src="questions\.js"><\/script>/, "The question bank must remain a relative asset");
assert.match(html, /<script src="sample-question\.js"><\/script>/, "The interaction script must remain a relative asset");

const questionBankContext = vm.createContext({});
vm.runInContext(fs.readFileSync("questions.js", "utf8"), questionBankContext);
const sampleQuestion = JSON.parse(vm.runInContext(
    'JSON.stringify(questionBank.find((question) => question.id === "engineer-role"))',
    questionBankContext,
));
assert.ok(sampleQuestion, "The sample must refer to a checked Brainer question");
const samplePage = html.match(/<article class="sample-card"[\s\S]*?<\/article>/)?.[0];
assert.ok(samplePage, "The question must be present in the initial HTML");
assert.match(samplePage, new RegExp(sampleQuestion.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
const questionButtons = [...samplePage.matchAll(/<button class="sample-answer"[^>]*data-index="(\d+)"[^>]*>([^<]+)<\/button>/g)];
assert.equal(questionButtons.length, sampleQuestion.choices.length, "All choices must be crawlable without JavaScript");
assert.deepEqual(questionButtons.map((match) => Number(match[1])), [0, 1, 2, 3]);
assert.deepEqual(questionButtons.map((match) => match[2]), sampleQuestion.choices);
assert.match(samplePage, /id="sample-feedback"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(samplePage, /href="https:\/\/help\.brainer\.ceo\/ai-team"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
assert.ok(samplePage.includes("No account or nickname needed."));
assert.match(samplePage, /href="\.\/#start-screen"[^>]*hidden>Start Quiz<\/a>/,
    "The full-quiz link must stay relative to the GitHub Pages subpath and reveal after answering");
assert.match(fs.readFileSync("index.html", "utf8"), /href="sample-question\.html">Answer a Brainer sample question/,
    "The main entry page must link to the sample for crawlers and visitors");

function element(text = "") {
    const classes = new Set();
    return {
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            contains: (name) => classes.has(name),
        },
        dataset: {},
        disabled: false,
        hidden: false,
        textContent: text,
        listeners: {},
        addEventListener(name, callback) { this.listeners[name] = callback; },
        focus() { this.focused = true; },
    };
}
const buttons = sampleQuestion.choices.map((choice, index) => {
    const button = element(choice);
    button.dataset.index = String(index);
    return button;
});
const feedback = element();
feedback.hidden = true;
const start = element();
start.hidden = true;
const context = vm.createContext({
    document: {
        querySelectorAll: () => buttons,
        getElementById: (id) => ({ "sample-feedback": feedback, "sample-start-btn": start })[id],
    },
});
vm.runInContext(fs.readFileSync("questions.js", "utf8") + "\n" + fs.readFileSync("sample-question.js", "utf8"), context);

function answer(index) {
    buttons[index].listeners.click({ currentTarget: buttons[index] });
}
answer(sampleQuestion.correctIndex);
assert.match(feedback.textContent, /^Correct!/);
assert.ok(feedback.textContent.includes(sampleQuestion.explanation));
assert.equal(feedback.hidden, false);
assert.equal(feedback.classList.contains("is-correct"), true);
assert.equal(feedback.focused, true);
assert.equal(start.hidden, false);
assert.ok(buttons.every((button) => button.disabled));
assert.ok(buttons[sampleQuestion.correctIndex].classList.contains("correct"));
const firstFeedback = feedback.textContent;
answer((sampleQuestion.correctIndex + 1) % sampleQuestion.choices.length);
assert.equal(feedback.textContent, firstFeedback, "A second answer must not overwrite feedback");

const wrongButtons = sampleQuestion.choices.map((choice, index) => {
    const button = element(choice);
    button.dataset.index = String(index);
    return button;
});
const wrongFeedback = element();
wrongFeedback.hidden = true;
const wrongStart = element();
wrongStart.hidden = true;
const wrongContext = vm.createContext({
    document: {
        querySelectorAll: () => wrongButtons,
        getElementById: (id) => ({ "sample-feedback": wrongFeedback, "sample-start-btn": wrongStart })[id],
    },
});
vm.runInContext(fs.readFileSync("questions.js", "utf8") + "\n" + fs.readFileSync("sample-question.js", "utf8"), wrongContext);
const wrongIndex = (sampleQuestion.correctIndex + 1) % sampleQuestion.choices.length;
wrongButtons[wrongIndex].listeners.click({ currentTarget: wrongButtons[wrongIndex] });
assert.match(wrongFeedback.textContent, /^Not quite\./);
assert.ok(wrongFeedback.textContent.includes(sampleQuestion.choices[sampleQuestion.correctIndex]));
assert.ok(wrongFeedback.textContent.includes(sampleQuestion.explanation));
assert.equal(wrongFeedback.classList.contains("is-incorrect"), true);
assert.ok(wrongButtons[wrongIndex].classList.contains("wrong"));
assert.ok(wrongButtons[sampleQuestion.correctIndex].classList.contains("correct"));
assert.equal(wrongStart.hidden, false);
console.log("Passed: sample SEO metadata, crawlable choices, official source, subpath-safe quiz link, correct/incorrect feedback, accessible focus and one-answer locking.");
