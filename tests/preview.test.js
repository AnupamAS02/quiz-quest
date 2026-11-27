const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync("index.html", "utf8");
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const tags = new Map();
for (const match of head.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]+)"\s*\/>/g)) {
    assert.ok(!tags.has(match[1]), `Duplicate metadata: ${match[1]}`);
    tags.set(match[1], match[2]);
}
const publicUrl = "https://anupamas02.github.io/quiz-quest/";
const title = head.match(/<title>([^<]+)<\/title>/)[1];
assert.equal(title, "Quiz Quest | Five-Question Brainer Quiz");
assert.ok(head.includes(`<link rel="canonical" href="${publicUrl}" />`));
assert.equal(tags.get("og:url"), publicUrl);
assert.equal(tags.get("og:type"), "website");
assert.equal(tags.get("og:site_name"), "Quiz Quest");
assert.equal(tags.get("twitter:card"), "summary_large_image");
for (const prefix of ["og", "twitter"]) {
    assert.equal(tags.get(`${prefix}:title`), title);
    assert.equal(tags.get(`${prefix}:description`), tags.get("description"));
    assert.match(tags.get(`${prefix}:description`), /five multiple-choice questions/);
    assert.equal(tags.get(`${prefix}:image`), `${publicUrl}assets/quiz-preview.png`);
    assert.equal(tags.get(`${prefix}:image:alt`), "Quiz Quest. How well do you know Brainer? Five multiple-choice questions.");
}
assert.equal(tags.get("og:image:type"), "image/png");
const imageUrl = new URL(tags.get("og:image"));
assert.equal(imageUrl.search, "");
assert.equal(imageUrl.hash, "");
const localImage = path.join(".", decodeURIComponent(imageUrl.pathname.slice("/quiz-quest/".length)));
const png = fs.readFileSync(localImage);
assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
assert.equal(png.toString("ascii", 12, 16), "IHDR");
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
assert.equal(tags.get("og:image:width"), "1200");
assert.equal(tags.get("og:image:height"), "630");
assert.ok(png.length < 1000000, "Keep the preview image below 1 MB");
assert.ok(!/playerName|final-score|Private Name/.test(head), "Metadata must stay independent of player state");
console.log("Social preview metadata, subpath URL and PNG checks passed.");
