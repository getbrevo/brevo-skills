---
name: email-test-preview
description: "Previews a Brevo draft email and sends a test of it. Use when the user wants to see how a draft campaign or a transactional template looks, or to receive a test email (for example \"send me a test of the VIP campaign\"). Gets a preview link or a server render with sample data, and sends a test only to the addresses the user names and confirms - never to an empty list, never to real recipients."
metadata:
  version: 1.0.0
  status: beta
  author: brevo
---
# Preview and test-send an email

Shows the user how a draft campaign or a transactional template looks, and sends a test of it
to addresses they name. A test send emails someone, so each one needs the user's explicit
confirmation of the addresses. It never sends a campaign to its recipients.

| Step | Tool |
|---|---|
| Find the draft campaign | `email_campaign_management_get_email_campaign` |
| Find the template, one at a time | `templates_get_smtp_template` |
| Test-send a transactional template | `templates_send_test_template` |
| Test-send a campaign | `email_campaign_management_send_test_email` |
| Render a template with sample data | `templates_post_preview_smtp_email_templates` |
| Check what happened to a template test send | `campaign_analytics_get_email_event_report` |
| Check the sender's domain is authenticated | `domains_get_domains` |

If a tool a step needs isn't in your tool list, stop that step and tell the user their Brevo
connection doesn't offer it (connection rules below).

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

## Where this skill comes from

- You already have this skill: it is in your context, whether installed, from the plugin, uploaded
  or fetched with `get_brevo_guide`. Don't call `get_brevo_guide` for it again in this
  conversation.
- To have it without a tool call next time, install it once: the Brevo plugin from
  `getbrevo/brevo-skills`, `npx skills add getbrevo/brevo-skills`, or, with a shell, the Brevo CLI
  (`npm i -g @getbrevo/cli`, then `brevo skill install`). `brevo skill check` lists copies that are
  behind.
- Once per conversation, call `list_brevo_guides` with `installed` set to the version in the
  `metadata` of each Brevo skill you have, if the tool accepts `installed`; otherwise call it
  with no arguments and compare the versions yourself. For a `stale` one, follow its `update`
  hint.
- If you don't have the skill, call `get_brevo_guide` with its name: it returns the current text.

## Working rules for every step

- Follow the steps in order. Don't skip, merge or reorder them, and don't add steps this skill
  doesn't have.
- Use only the tools this skill names, with the arguments it describes. Never invent a tool, a
  parameter, an ID or an email address; ask the user instead, one question at a time.
- Before anything is created, changed or sent, say in plain words what will happen and wait for
  the user's yes. A yes covers only what you described.
- Read each Brevo object once per conversation and reuse it. Re-read only after something
  changed it.
- Report a result only from what the tool returned. If a call failed or returned nothing,
  say so; never describe it as done.
- Reply in the user's language, and keep names, IDs and addresses exactly as Brevo shows them.

## Conversation cache (every email skill)

Keep what you read from Brevo in this conversation and reuse it, instead of calling the same
tool again. The cache is your own notes in the conversation, never a file. Key every entry by
account **and** sub-account ID (none for the main account), and note when you fetched it
(`fetchedAt`). Never show or reuse an entry from another account or sub-account.

| What | Keep it | Fetch again when |
|---|---|---|
| Account (company, address, own email), senders, contact attributes | About 10 minutes | Time is up. An attribute in the email isn't in the cached list and the cache is more than about a minute old: fetch the attributes once more before reporting it (the user may have just added it). The user switches account or sub-account, or says they changed it in Brevo |
| Sender domains (whether each is authenticated) | Same as senders | Same as senders |
| Brand kit | The whole conversation (one read) | The user says they changed it in Brevo, or switches account. After this conversation's own save, update the cache with the approved values; don't read it back |
| Templates this conversation created or read | The whole conversation | The user says they edited it in Brevo's editor (fetch it before a preview or test). After this conversation's own update, apply the change to the cache |
| Lists and segments | Not cached | Fetch when needed |

- **A failed fetch never blocks.** Skip the check that needed it, say so in one line ("I
  couldn't read your contact attributes, so that check was skipped"), and go on.
- **Errors:** a 5xx is retried once, then the user is told it is on Brevo's side. A 404 on a
  cached template: drop it from the cache and tell the user it no longer exists. A 429 on
  the brand kit: keep the cached kit and say the hourly limit is reached.
- **"What do you have cached?"** List each entry (what, account, when fetched) without
  secrets. **"Refresh"** clears everything; fetch again as each step needs it.
- If you can't tell how much time has passed, fetch the 10-minute items again when the user
  starts a new email.
- Never keep API keys, tokens or passwords in the cache or anywhere in the conversation.

**Call budget** for a transactional template (write, check, save, preview, test): about 11
calls with the cache (account, senders, attributes, brand kit, save, 3 sample renders,
sender domains, test send, outcome) against about 16 without it (the account read 3 times,
attributes and senders twice, and the template read back). Each fix round that re-checks
attributes would add one more call without it.

## 1. Collect the inputs

- **What to test:** a draft campaign or a transactional template, by ID or name. Read it with
  `email_campaign_management_get_email_campaign` (pass `excludeHtmlContent: true`) or
  `templates_get_smtp_template`, or use the cached copy (see the cache table). Fetch
  templates one at a time by ID: a template list returns the full HTML of every template, so
  never list many at once.
- **Test addresses**, for a test send: the addresses the user names. If they say "send me a
  test", ask for their address; don't assume it. Never add addresses of your own choosing.

## 2. Preview

**Campaign:** nothing to render through the connection; step 3 gives the link. Don't give
the "shared template" link as a preview: it is a link to import the email into another Brevo
account, and opens a sign-in page, not the email.

**Template:** render it on Brevo's servers with
`templates_post_preview_smtp_email_templates`:

- Pass `templateId` and `email` of an **existing contact** (the account's own email works),
  plus the sample `params` when the template uses `params.*`. With `params` alone (no
  `email`) the render fails with 400 "Contact not found" whenever the template uses
  `contact.*` tags.
- The unsubscribe link renders with an empty `href` in the preview: expected, not a fault
  (it is filled in for real sends).
- Use invented sample data, never a real customer's.
- Render three times: with the full sample; with empty lists and missing optional keys; and
  with `params: {}`, which is what a test send uses (see step 4). A drag-and-drop copy of HTML
  that already passed these three renders needs one render, with `params: {}`: each render
  returns the whole HTML, so don't repeat what the HTML version proved.
- Don't paste the rendered HTML into the chat: report the subject, whether it rendered, and
  anything that looks wrong (an empty greeting, a missing item line, literal `{{ }}`).
- 403 "required scope not present": the connection doesn't allow renders. Say so once, skip
  the renders, and go on to step 3. Tell the user the test send's outcome check (step 4) is
  then the only render check, and that it uses no `params`.

## 3. Share the preview link, then stop

Before any test send, give the user a link to look at the email themselves, and wait:

- **Template** (drag-and-drop or HTML): `https://app.brevo.com/templates/email/edit/<id>`.
  The user signs in to Brevo and uses Preview there.
- **Campaign:** `https://app.brevo.com/marketing-campaign/edit/<id>`.

Say that the link shows the saved email without the sample data (no `params`, no sample
contact). Ask: "Open it and tell me if it looks right. Shall I send a test, and to which
address?" Send nothing until the user answers yes in this conversation. If they ask for
changes, go back to `email-template-write`; after the update, the cached template carries
the change. Then render once with `params: {}`, give the link again, and wait for a new yes:
an earlier yes doesn't cover the changed template.

## 4. Send a test (confirm every time)

**A template test send carries no `params`.** Every `{{ params.* }}`, in the body and in the
subject, renders blank, and a filter that needs a value (for example `time_parse` on an empty
date) fails the whole email, so nothing arrives. Tell the user before sending that the test
shows the layout and contact data only, not their sample order; the `params: {}` render in
step 2 shows what the test will look like. A test works on an inactive template.

**Check the sender's domain first.** Read the sender (template or campaign) and look for the sender's email domain in the
account's domains (cached with the senders). When the domain isn't there or isn't
authenticated, or it is a free or shared mailbox domain (gmail.com, yahoo.com and the
like), warn: Gmail and Yahoo reject or bounce mail from unauthenticated domains (DMARC),
so the test may never arrive. Suggest authenticating the domain in Brevo (Senders,
Domains) or using a sender on an authenticated domain. Let the user decide; don't block the
test.

Show, and ask "Send it?":

```
Send a test:
- Email: <campaign or template name> (ID <id>)
- From: <sender email> (domain authenticated: yes | no | not checked)
- To: <address 1>, <address 2>
Test sends carry no params and are limited to 50 a day.
```

On a yes in this conversation:

- **Template:** `templates_send_test_template` with `templateId` and `emailTo` = exactly the
  confirmed addresses.
- **Campaign:** `email_campaign_management_send_test_email` with `campaignId` and `emailTo` =
  exactly the confirmed addresses.

**Never call a test send with an empty or missing `emailTo`:** Brevo then sends the test to
the account's whole test list. A new address, or a second test, needs a new confirmation.

### Check the outcome

A success response (204) only means Brevo **queued** the test. The send can still fail
afterwards (a render error, a missing sender, a bounce). Never say "sent" or "delivered" on
the response alone.

- **Template:** say the test was **queued**, and offer to check what happened to it. Events
  take a minute or more to appear, so don't wait or poll. When the user asks, call
  `campaign_analytics_get_email_event_report` with `templateId`, `email` = one test address
  and `days: 1`. Report the newest events for this send: `delivered` means it reached the
  mail server; `error`, `softBounces`, `hardBounces`, `blocked` or `invalid` mean it didn't.
  Quote the `reason` and explain it in plain words ("the date filter got an empty value", "the
  sender email is missing", "Gmail refused the unauthenticated sender domain"). An empty
  report, or only `requests`: not logged yet; say it is still queued and offer to check again.
  Never read either as success or failure.
- **Campaign:** say the test was **queued**, not that it arrived. Ask the user to check
  their inbox and spam folder. When the domain check said "no", say it will very likely not
  arrive.

Then say to whom it went and that test sends are limited to 50 a day.

## Refusals and errors

| Response | Meaning | Tell the user |
|---|---|---|
| 400 listing addresses not found, blocked, or in no list | The test address must exist as a contact, not be blocked, and belong to a list | Which address and why; they can add it as a contact in Brevo |
| 400 "Contact not found" on a preview | The `email` passed isn't a contact, or `params` were sent alone for a template with contact attributes | Pass an existing contact's email plus the params |
| A cached template returns 404 | It was deleted in Brevo | Drop it from the cache; tell the user it no longer exists |
| Daily limit reached | 50 test sends a day | Try again tomorrow, or preview instead |
| Event `error` with a template error (for example `time_parse`) | The template failed to render without params | Guard the line with `{% if params.x %}` (`email-template-check`), save, test again |
| Event `error` "From field is missing" | The template has a sender ID but no sender email | Set the sender on the template (`email-template-to-dnd` step 4), or in Brevo |
| Soft or hard bounce mentioning DMARC or authentication | The sender's domain isn't authenticated | Authenticate the domain in Brevo, or use a sender on an authenticated domain |
| 403 "required scope not present" on a render | The connection doesn't allow template renders | Skip the renders (step 2); the test send's outcome check stands in |

Don't retry a refused call in a loop: one retry at most, after the user fixed the cause.

## Requirements

- `email_campaign_management_send_test_email`: campaign test send.
- `templates_post_preview_smtp_email_templates`: render a template with an existing
  contact's email and sample params.
- `campaign_analytics_get_email_event_report`: events of a template test send, with the
  error or bounce reason.
- `domains_get_domains`: the account's domains and whether each is authenticated.
- On a sub-account, every call passes `subaccount_id`.

No tool reads the outcome of a campaign test send: the user checks their inbox.

No browser or screenshot step: the preview is a link the user opens, or a server render.
The shared template link (`email_campaign_management_get_shared_template_url`) isn't used:
it is an import link for another account, not a preview.

## Output rules

- Do one thing per request: create one template, one campaign, one list. Never create a
  second object to "fix" the first without the user's go-ahead.
- Don't paste large inputs or outputs (HTML, design JSON, full reports) into the chat
  unless the user asks. Summarize them.
- Describe problems by what the user sees ("the 'Shop the sale' button"), never by
  selectors, block types or internal field names.
- Always end with the object's name, its ID, a link to it in Brevo, and what the user
  still has to do there.
