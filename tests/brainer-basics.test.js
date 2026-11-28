const assert = require("node:assert/strict");
const fs = require("node:fs");

const publicUrl = "https://anupamas02.github.io/quiz-quest/";
const referenceUrl = `${publicUrl}brainer-basics.html`;
const html = fs.readFileSync("brainer-basics.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
assert.equal((body.match(/<h1\b/g) || []).length, 1);
assert.match(body, /<h1 id="basics-title" tabindex="-1">Brainer basics<\/h1>/);
assert.match(body, /<a class="skip-link" href="#basics-title">/);
assert.match(body, /<article class="basics-card" aria-labelledby="basics-title">/);
assert.ok(!/<script|<iframe|<form|<button/.test(html), "Reference reading and navigation require no script or interactive widget");
assert.match(head, /<title>Brainer Basics: Team, Tasks and Founder Decisions \| Quiz Quest<\/title>/);
const description = head.match(/<meta name="description"\s+content="([^"]+)"/)[1];
assert.match(description, /New to Brainer\?/);
assert.match(description, /official sources/);
assert.equal(head.match(/<meta property="og:description"\s+content="([^"]+)"/)[1], description);
assert.equal(head.match(/<link rel="canonical" href="([^"]+)"/)[1], referenceUrl);
assert.equal(head.match(/<meta property="og:url" content="([^"]+)"/)[1], referenceUrl);
assert.match(head, /href="style\.css"/);

const sections = [...body.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)];
assert.ok(sections.length >= 4, "Include the core concepts and a route to play");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, "No duplicate IDs");
for (const [_, attributes, section] of sections) {
    const heading = attributes.match(/aria-labelledby="([^"]+)"/)[1];
    assert.ok(section.includes(`id="${heading}"`), "Each section has its own heading");
}
for (const source of ["https://help.brainer.ceo/ai-team", "https://help.brainer.ceo/guides/ceo"]) {
    assert.ok(body.includes(`href="${source}"`), `Link to the official source ${source}`);
}
assert.match(body, /AI team|AI teammates/);
assert.match(body, /tasks/i);
assert.match(body, /routines/i);
assert.match(body, /needs your approval/);
assert.match(body, /asks and waits for your confirmation/);
assert.match(body, /five multiple-choice questions/);
assert.match(body, /class="sample-start-btn" href="\.\/#start-screen">Start Quiz<\/a>/);
assert.match(body, /href="sample-question\.html"/);

for (const file of ["index.html", "sample-question.html"]) {
    const entryHtml = fs.readFileSync(file, "utf8");
    const link = entryHtml.match(/<a href="([^"]+)">Read the Brainer basics<\/a>/)[1];
    for (const address of [new URL(file, publicUrl).href, `${publicUrl}${file}?private=example#question=engineer-role`]) {
        assert.equal(new URL(link, address).href, referenceUrl, "Entry link must drop private URL state and keep the Pages subpath");
    }
}
for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith("https://")) continue;
    const url = new URL(href, referenceUrl);
    assert.ok(url.pathname.startsWith("/quiz-quest/"), "Every local link stays under the project subpath");
    const file = url.pathname.replace("/quiz-quest/", "") || "index.html";
    assert.ok(fs.existsSync(file), `Local link target exists: ${file}`);
    if (url.hash) {
        assert.ok(fs.readFileSync(file, "utf8").includes(`id="${url.hash.slice(1)}"`), "Fragment target exists");
    }
}
console.log("Passed: static sourced basics, semantic headings, skip link, canonical metadata, entry links and subpath-safe quiz/sample navigation.");
