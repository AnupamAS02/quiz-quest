const assert = require("node:assert/strict");
const fs = require("node:fs");

const publicUrl = "https://anupamas02.github.io/quiz-quest/";
const sitemapUrl = `${publicUrl}sitemap.xml`;
const pages = [
    { file: "index.html", url: publicUrl },
    { file: "sample-question.html", url: `${publicUrl}sample-question.html` },
];
const sitemap = fs.readFileSync("sitemap.xml", "utf8");
// Check the complete, intentionally minimal XML shape as well as its entries.
assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\s*(?:<url>\s*<loc>https:\/\/[^<]+<\/loc>\s*<\/url>\s*){2}<\/urlset>\s*$/);
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(locations, pages.map((entry) => entry.url), "List only the two public entry pages, not player state or URL variants");
assert.equal(new Set(locations).size, locations.length);

for (const { file, url } of pages) {
    const html = fs.readFileSync(file, "utf8");
    const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
    const canonicals = [...head.matchAll(/<link rel="canonical" href="([^"]+)"\s*\/>/g)];
    assert.equal(canonicals.length, 1, `${file} must have exactly one static canonical`);
    assert.equal(canonicals[0][1], url);
    assert.equal(head.match(/<meta property="og:url" content="([^"]+)"\s*\/>/)[1], url);
    assert.ok(!/noindex|nofollow/i.test(head), "Playable public pages must remain indexable");
    const sitemapLink = head.match(/<link rel="sitemap" type="application\/xml" href="([^"]+)"\s*\/>/);
    const crawlableLink = html.match(/<a href="([^"]+)">Sitemap<\/a>/);
    assert.ok(sitemapLink, "Expose the sitemap in the head");
    assert.ok(crawlableLink, "Also expose a normal crawlable link, without relying on rel=sitemap support");
    for (const entryUrl of [url, `${url}?question=engineer-role&playerName=Private#start-screen`, new URL(file, publicUrl).href]) {
        assert.equal(new URL(sitemapLink[1], entryUrl).href, sitemapUrl);
        assert.equal(new URL(crawlableLink[1], entryUrl).href, sitemapUrl);
    }
    const parsedUrl = new URL(url);
    assert.equal(parsedUrl.origin, "https://anupamas02.github.io");
    assert.ok(parsedUrl.pathname.startsWith("/quiz-quest/"));
    assert.equal(parsedUrl.search, "");
    assert.equal(parsedUrl.hash, "");
    assert.ok(fs.existsSync(file));
}

const quiz = fs.readFileSync("index.html", "utf8");
const sample = fs.readFileSync("sample-question.html", "utf8");
const sampleLink = quiz.match(/<a href="([^"]+)">Answer a Brainer sample question<\/a>/)[1];
assert.equal(new URL(sampleLink, publicUrl).href, pages[1].url);
assert.equal(new URL(sampleLink, `${publicUrl}index.html?question=engineer-role`).href, pages[1].url);
const homeLink = sample.match(/<p class="sample-site-title"><a href="([^"]+)">Quiz Quest<\/a>/)[1];
assert.equal(new URL(homeLink, pages[1].url).href, publicUrl);
const startLink = sample.match(/<a id="sample-start-btn"[^>]*href="([^"]+)"/)[1];
assert.equal(new URL(startLink, pages[1].url).href, `${publicUrl}#start-screen`);
console.log("Passed: minimal valid sitemap, two clean public URLs, matching static canonicals/social URLs, crawlable sitemap links and subpath-safe entry navigation.");
