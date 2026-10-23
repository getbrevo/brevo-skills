---
name: email-test-send
description: Send a test of one email template to addresses the user chooses, and report what happened. Use when the user asks to test, preview or send a sample of an email template to themselves or a colleague. Checks the template's sender and subject, confirms the recipients before sending, and refuses to send to an empty recipient list or to addresses the user did not give.
metadata:
  version: 1.0.1
  status: beta
  author: brevo
---
# Email test send

Send a test of one email template to the addresses the user chooses, and report what
happened. A test is a real email: it goes only to addresses the user gave you.

| Step | Tool |
|---|---|
| Read the template | `templates_get_smtp_template` |
| Send the test | `templates_send_test_template` |

If either tool is missing from your tool list, say that the user's Brevo connection doesn't
offer test sends yet, and stop.

## Brevo connection rules

- Every Brevo call goes through the Brevo MCP server's tools. The user's connection carries
  their authentication (OAuth). **Never ask for an API key, never ask the user to paste a key
  into the chat, and never put a key in a file or command.**
- If a tool returns 401 or 403, ask the user to reconnect Brevo in their agent's settings.
- If a tool a step needs is missing from your tool list, stop that step and say that the
  user's Brevo connection doesn't offer it (connections can differ). Don't improvise with
  other tools. Writing HTML never needs a tool; offer it, and the steps to finish in Brevo.
- On a sub-account, pass `subaccount_id` on every call: every Brevo tool takes it per call,
  and a call without it acts on the main account.
- Show a tool's error message as returned, after a plain-language summary. Don't invent a
  cause the tool didn't give.

## 1. Find the template

Use the template ID from the previous step if there is one (for example a template just
created from HTML). Otherwise ask the user which template, by name or ID.

Call `templates_get_smtp_template` with the ID and check, before sending anything:

- **Sender:** the template needs a sender email and name. If it has none, stop and ask the
  user to set one on the template in Brevo (**Edit** → sender), then try again.
- **Subject:** if it's empty, tell the user the test will arrive without a subject, and ask
  whether to go on.

Tell the user, in one line, which template you are about to send (its name and subject).

## 2. Confirm the recipients

- Ask which address or addresses to send the test to. Suggest the user's own address; never
  pick an address yourself, and never send to an address that came from the template,
  a contact list or a file.
- Keep it to a few addresses. The account can send **50 test emails a day** (10 a day on an
  account that isn't validated yet).
- Each recipient must already be a **contact** in the account. Brevo refuses addresses it
  doesn't know.

Confirm before sending: "I'll send a test of *<template name>* to *<addresses>*. Go ahead?"

## 3. Send

Call `templates_send_test_template` with the template ID and the confirmed addresses as the
recipient list. Never send with an empty recipient list: Brevo then sends to the whole test
list of the account.

## 4. Report

**Sent:** tell the user it's on its way, and to check their inbox (and the spam folder).
Personalization tags such as `{{ contact.FIRSTNAME }}` show the recipient contact's own
values, or appear empty when the contact has none.

**Refused:** explain it in plain words, then show the message as returned.

| Response | Meaning | Tell the user |
|---|---|---|
| 400 with `unexistingEmails` | Those addresses aren't contacts | Add them as contacts in Brevo, or use another address |
| 400 with `withoutListEmails` | Those contacts aren't in any list | Add them to a list (for example a test list), then retry |
| 400 with `blackListedEmails` | Those contacts are blocklisted | Use another address, or unblock the contact in Brevo |
| 402 | No credits left, or the 10-a-day limit of an unvalidated account | Wait until tomorrow, or validate the account |
| 403 | The 50-a-day limit, an unvalidated account, or no sender linked to the template | Wait until tomorrow, or set the template's sender |
| 404 | The template doesn't exist | Check the template ID |

Don't retry a refused send in a loop: one retry at most, after the user fixed the cause.

## Output rules

- Do one thing per request: create one template, one campaign, one list. Never create a
  second object to "fix" the first without the user's go-ahead.
- Don't paste large inputs or outputs (HTML, design JSON, full reports) into the chat
  unless the user asks. Summarize them.
- Describe problems by what the user sees ("the 'Shop the sale' button"), never by
  selectors, block types or internal field names.
- Always end with the object's name, its ID, a link to it in Brevo, and what the user
  still has to do there.
