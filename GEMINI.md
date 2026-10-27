<!-- Generated file. Do not edit it by hand: the next release overwrites it. -->

# Brevo

This extension connects the Brevo MCP server (`brevo`) and ships these skills:

- **brevo-cli** (`skills/brevo-cli/SKILL.md`): Use the Brevo Developer CLI to manage OAuth apps, UI apps and Brevo Functions.
- **brevo-guide** (`skills/brevo-guide/SKILL.md`): Find and load Brevo skills on any agent: from the Brevo MCP server's guides, or install them once.

When a request matches a skill, read its `SKILL.md` and follow it step by step.

## Brevo connection rules

- Every Brevo call goes through the Brevo MCP server's tools. The user's connection carries
  their authentication (OAuth). **Never ask for an API key, never ask the user to paste a key
  into the chat, and never put a key in a file or command.**
- If a tool returns 401, or 403 about the login or token, ask the user to reconnect Brevo in
  their agent's settings.
- A 403 "required scope not present" (`permission_denied`) means this connection doesn't
  allow that action; reconnecting won't change it. Say so, skip that step, and carry on with
  the fallback the skill gives (for a template render: the test send and its outcome check).
  If the skill gives no fallback for that step, stop the step and tell the user.
- If a tool a step needs is missing from your tool list, stop that step and say that the
  user's Brevo connection doesn't offer it (connections can differ). Don't improvise with
  other tools. Writing HTML never needs a tool; offer it, and the steps to finish in Brevo.
- On a sub-account, pass `subaccount_id` on every call: every Brevo tool takes it per call,
  and a call without it acts on the main account.
- Show a tool's error message as returned, after a plain-language summary. Don't invent a
  cause the tool didn't give.
