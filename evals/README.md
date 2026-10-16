# Evals

Each skill has `evals/<skill>/cases.json`: prompts, fixtures, and what a correct run must do.
(A router's cases check routing and the account confirmation; run them with every skill installed.)
They test the **agent's behaviour with the skill**, not the API: which tools it calls, what
it asks, and what it refuses to do.

## Running a case

1. Use a Brevo **test account**, never a customer account.
2. Install the skill on the agent under test (see the root README) and connect the Brevo MCP
   server for that platform.
3. Give the agent the case's `prompt`, with its fixture (a `fixtures/` folder next to
   `cases.json` may hold files or a generator script for them).
4. Score each line of `expect` as met or not. A case passes when every line is met.

Run every case on each platform the skill targets (Claude, ChatGPT or Codex, Gemini) before
moving a skill from `beta` to `public`, and record the results in the pull request.

## Adding a case

Add an entry to `cases.json` with a short `id`, the `prompt`, the `fixture` (or `null`) and a
list of observable `expect` lines. Write expectations a reviewer can check from the
transcript: a tool call, a question, a refusal, a line in the reply.
