# Brainer question sources

All 20 questions in `questions.js` were checked against official Brainer pages on 26 November 2026. Each question also carries its source URL in the bank. Recheck these pages when Brainer changes its product; prices and plan-dependent promises are intentionally not quiz topics.

## Official pages reviewed

- https://help.brainer.ceo/ai-team — team responsibilities, shared documents, tasks, routines, Team, Skills, Recents and direct chats.
- https://help.brainer.ceo/guides/ceo — task assignment, plain-language requests, founder confirmation, Ask anything, Phase/roadmap, Dashboard Brief and Heartbeat check-ins.
- https://brainer.ceo/features/team — cross-check: an AI CEO leads the Product Engineer, Writer, Marketer and Outreach teammate.

## Question-to-source mapping

| Question ID | Verified fact | Source |
| --- | --- | --- |
| ceo-role | CEO plans work, assigns tasks and checks results | AI team |
| engineer-role | Product Engineer builds the website and product | AI team |
| marketer-role | Marketer writes social posts and makes ads | AI team |
| writer-role | Writer creates blog articles | AI team |
| outreach-role | Outreach finds potential customers and emails them | AI team |
| shared-documents | Teammates share company documents | AI team |
| routine-meaning | Routines are scheduled jobs | AI team |
| team-page | Team lists teammates and their work | AI team |
| skills | Skills lists what a teammate knows how to do | AI team |
| recents | Recents lists previous chats | AI team |
| engineer-tasks | Product Engineer works on tasks, not routines | AI team |
| direct-chat | New chat/chat icon allows direct teammate chat | AI team |
| requests | CEO can split work across teammates | AI team |
| founder-approval | CEO asks and waits for founder confirmation | CEO guide |
| plain-requests | Plain-language requests become teammate work | CEO guide |
| ask-anything | Ask anything opens a side-by-side CEO chat | CEO guide |
| roadmap | Phase pill opens the roadmap | CEO guide |
| brief | CEO Brief appears at the top of Dashboard | CEO guide |
| heartbeat | CEO check-ins are saved as Heartbeat | CEO guide |
| outcome-request | Describe the desired result rather than every step | CEO guide |

## Round and feedback behavior

- A round contains five distinct questions.
- Questions are shuffled and drawn without replacement from the remaining bank. The first four rounds cover all 20 questions.
- When the pool is exhausted, it is reshuffled without the immediately previous round, so consecutive rounds stay fresh.
- Play Again resets the player, score and progress but preserves the remaining pool.
- Correct/wrong labels and an explanation supplement color feedback. Next Question (or See Results) lets players read at their own pace.
- There is no canonical URL: a production address has not been supplied.

## Local checks

Run `node tests/quiz.test.js` for bank integrity, draw/reset, feedback and scoring checks. No dependencies or build step are required. For browser checks, serve the repository with `python3 -m http.server 8000` and open `http://localhost:8000`.
