---
name: email-test-preview
description: Previews a Brevo draft email and sends a test of it. Use when the user wants to see how a draft campaign or a transactional template looks, or to receive a test email (for example "send me a test of the VIP campaign"). Gets a preview link or a server render with sample data, and sends a test only to the addresses the user names and confirms - never to an empty list, never to real recipients.
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
| Preview link for a campaign | `email_campaign_management_get_shared_template_url` (see Requirements) |
| Test-send a campaign | `email_campaign_management_send_test_email` (see Requirements) |
| Render a template with sample data | `templates_post_preview_smtp_email_templates` (see Requirements) |

If one of the first three tools isn't in your tool list, stop and tell the user their Brevo
connection doesn't offer this feature yet. For the last three, follow the fallback in each
step.

<!-- include: shared/connection.md -->

## 1. Collect the inputs

- **What to test:** a draft campaign or a transactional template, by ID or name. Read it with
  `email_campaign_management_get_email_campaign` (pass `excludeHtmlContent: true`) or
  `templates_get_smtp_template`. Fetch templates one at a time by ID: a template list returns
  the full HTML of every template, so never list many at once.
- **Test addresses**, for a test send: the addresses the user names. If they say "send me a
  test", ask for their address; don't assume it. Never add addresses of your own choosing.

## 2. Preview

**Campaign:** if `email_campaign_management_get_shared_template_url` is in your tool list,
call it with the campaign ID and give the link to the user only: anyone with the link can see
the email. Without the tool, tell the user to open the draft in Brevo (Campaigns, Email) and
use Preview there.

**Transactional template:** if `templates_post_preview_smtp_email_templates` is in your tool
list, render it on Brevo's servers:

- Pass `templateId` and `email` of an **existing contact** (the account's own email works),
  plus the sample `params` when the template uses `params.*`. With `params` alone the render
  fails with "Contact not found" whenever the template uses contact attributes.
- Use invented sample data, never a real customer's.
- Render once with the full sample, and once with empty lists and missing optional keys.
- Don't paste the rendered HTML into the chat: report the subject, whether it rendered, and
  anything that looks wrong (an empty greeting, a missing item line, literal `{{ }}`).

Without the tool, say the server preview isn't available on this connection, and offer a test
send instead.

## 3. Send a test (confirm every time)

Show, and ask "Send it?":

```
Send a test:
- Email: <campaign or template name> (ID <id>)
- To: <address 1>, <address 2>
Test sends are limited to 50 a day.
```

On a yes in this conversation:

- **Template:** `templates_send_test_template` with `templateId` and `emailTo` = exactly the
  confirmed addresses.
- **Campaign:** if `email_campaign_management_send_test_email` is in your tool list, call it
  with `campaignId` and `emailTo` = exactly the confirmed addresses. Without it, tell the user
  to use Preview & test on the draft in Brevo (Campaigns, Email).

**Never call a test send with an empty or missing `emailTo`:** Brevo then sends the test to
the account's whole test list. A new address, or a second test, needs a new confirmation.

After a success, say the test was sent, to whom, and that test sends are limited to 50 a day.

## Refusals and errors

| Response | Meaning | Tell the user |
|---|---|---|
| 400 listing addresses not found, blocked, or in no list | The test address must exist as a contact, not be blocked, and belong to a list | Which address and why; they can add it as a contact in Brevo |
| 400 "Contact not found" on a preview | The `email` passed isn't a contact, or `params` were sent alone for a template with contact attributes | Pass an existing contact's email plus the params |
| Preview link refused (405) | The campaign has no content yet, or isn't a classic campaign | Add content, then try again |
| Daily limit reached | 50 test sends a day | Try again tomorrow, or preview instead |

Don't retry a refused call in a loop: one retry at most, after the user fixed the cause.

## Requirements

Not offered to every connection yet:

- `email_campaign_management_send_test_email` (campaign test send): without it, the user sends
  the test from Brevo.
- `email_campaign_management_get_shared_template_url` (campaign preview link): without it, the
  user previews in Brevo.
- `templates_post_preview_smtp_email_templates` (render a template with a contact and sample
  params): without it, the test send is the check.

No browser or screenshot step: the preview is a link the user opens, or a server render.

<!-- include: shared/output-rules.md -->
