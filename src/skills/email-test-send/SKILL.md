---
name: email-test-send
description: "Send a test of one email template to addresses the user chooses, and report what happened. Use when the user asks to test, preview or send a sample of an email template to themselves or a colleague. Checks the template's sender and subject, confirms the recipients before sending, and refuses to send to an empty recipient list or to addresses the user did not give."
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

<!-- include: shared/connection.md -->

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

<!-- include: shared/output-rules.md -->
