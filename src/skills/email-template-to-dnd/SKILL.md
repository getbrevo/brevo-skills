---
name: email-template-to-dnd
description: Turns email HTML into a design that opens in Brevo's drag-and-drop editor, and saves it as a template. Use when the user wants an email they can edit visually in the drag-and-drop editor, wants HTML imported as an editable design, or wants an automation email or transactional template saved as a design. Explains how to write HTML that converts cleanly, converts it with Brevo's HTML-to-design conversion, checks nothing was lost, saves it inactive after the user confirms, and lists the editor steps left to do. Needs Brevo's HTML conversion tool on the connection; without it, says so and offers the HTML route.
---

# Email HTML to drag-and-drop design

Turns finished email HTML into a drag-and-drop design with Brevo's own HTML-to-design
conversion, checks that the design still says and links the same as the HTML, and saves it
as a template in the drag-and-drop editor. It never writes a design by hand, never sends, and
saves transactional templates inactive.

| Step | Tool |
|---|---|
| Name the account | `accounts_get_account` |
| Convert the HTML into a design | Brevo's HTML-to-design conversion tool (not on the MCP server yet: see Requirements) |
| Pick an active sender | `senders_get_senders` |
| Save the design as a template | `email_editor_create_template` |
| Read the saved template back | `templates_get_smtp_template` |
| Fix the sender, or activate after a yes | `templates_update_smtp_template` (see Requirements) |
| Check the sender's domain is authenticated | `domains_get_domains` (see Requirements) |

If one of the first five tools isn't in your tool list, stop and tell the user their Brevo
connection doesn't offer this feature yet. For the conversion tool, step 1 says what to offer
instead; for the last two, follow the fallback in Requirements.

<!-- include: shared/connection.md -->

<!-- include: shared/email-cache.md -->

## 1. Collect the inputs

- **The HTML**, written for drag-and-drop output with `email-template-write` and checked with
  `email-template-check`, or HTML the user brings from elsewhere (another tool, an old
  template). Read [converter-notes.md](references/converter-notes.md) for what converts
  cleanly.
  The editor's Style tab is taken from the first paragraph, heading, button and coloured
  link, so brand fonts and colours become the template's styles only when they sit there
  (`email-template-write` writes them that way).
- **The type:** `template` (transactional) or `automation_template` (automation email).
  Campaigns aren't saved as designs through the connection: create them as HTML with
  `email-campaign-create`.
- **Name, subject, preview text** (the hidden preheader is dropped on conversion, so
  `previewText` is what reaches the inbox), **sender** (an active one from the cached
  senders, else `senders_get_senders`; never invent one; warn when its domain isn't
  authenticated or is a free mailbox domain, as `email-test-preview` step 4 describes) and
  **editor language** (`en`, `fr`, `de`, `it` or `pt`).
- If the conversion tool isn't in your tool list, stop here: say that converting HTML into
  an editable design isn't offered by their connection yet. Offer what still works: save it
  as an HTML template (`email-template-write`, transactional), or create an HTML campaign
  (`email-campaign-create`). Never build the design yourself.

## 2. Convert

Call the conversion tool with the HTML, the subject and the name. Rules:

- Pass the HTML as written; don't trim or "fix" it in the call.
- If the tool offers a clean-up pass that rewrites HTML into shapes the editor understands,
  turn it **off** for HTML written with `email-template-write` (it is already in shape, and
  the clean-up can split a button from its text) and **on** for HTML from elsewhere. Read the
  report of what it changed or dropped.
- A refusal that the HTML can't be converted (no 600px container table, broken markup) is
  explained to the user in plain words; fix the HTML and try again, at most 3 rounds.
- Keep the returned design out of the chat. It goes unchanged into step 4.

## 3. Check nothing was lost

Compare the design with the HTML before saving. Look for:

- Text: every heading, price, date and number of the HTML is in the design.
- Links and images: every link address and image of the HTML is there, on the same text.
- Order: sections and blocks in the same order.
- Template tags: every `{{ }}` and `{% %}` tag is still there. Tags that sat between section
  rows are lost (the rows then show to every contact, a loop shows once with literal tags):
  move them inside one `<p>` and convert again.
- Lists (`ul`, `ol`) dropped, the hidden preheader dropped: expected for the preheader; for a
  list, rewrite it as `<p>` lines.

When something is lost and you can't fix it in the HTML within 3 rounds, tell the user exactly
what is missing. Never hand over a design that lost content as if it were fine.

## 4. Confirm and save

Show, in one message, and ask "Save it?":

```
Save as a drag-and-drop template:
- Name: <name>
- Type: transactional template | automation email
- Subject: <subject>  Preview text: <preview text>
- Sender: <sender name> <sender email>
```

On a yes, call `email_editor_create_template` once with `name`, `type`, `subject`, `previewText`,
`senderId`, `senderName`, `locale` and `newsletterContent` = the design exactly as the
conversion returned it. No HTML tags in name, subject, preview text or sender name (merge tags
are fine). A refusal usually means a broken template tag, for example `{% else %}` inside a
`{% for %}`: fix the HTML, convert again, retry once.

**Read it back and check the sender.** The save can store the sender ID without the sender
email, and it doesn't keep the sender name you pass (the template shows the account's
default name). A template with no sender email fails every send, test sends included, with
"From field is missing". Call `templates_get_smtp_template` with the new ID:

- `sender.email` empty: if `templates_update_smtp_template` is in your tool list, call it with
  `sender` = `{"id": <the confirmed sender id>}`. Don't read it back again: its success
  response, plus the sender email (`fromEmail`) in the `params: {}` render that
  `email-test-preview` makes next, confirm it; if that render still shows no sender email,
  say so. Without the tool, tell the user to set the sender on the template in Brevo before
  any test.
- Sender name not the one confirmed: say so; it can be set the same way (`sender` with
  `name` and `email`) or in Brevo.

Cache the template as read back (with any sender fix applied). The new template opens at
`https://app.brevo.com/templates/email/edit/<id>`. A transactional
template is created **inactive**: test sends work, live sends need it active. Activate it only
after the user says yes (`templates_update_smtp_template` with `isActive: true`), or tell them
to activate it in Brevo.

## 5. Tell the user what is left in the editor

Read [native-blocks.md](references/native-blocks.md) and list only the steps this email needs.
Loops and conditions inside text blocks already work; the editor steps are only for native
blocks: display conditions if the user wants a whole section shown to some contacts, a
Dynamic content block for a picture per item, Video or Product blocks to swap in, checking the Social block after the first open,
and picking the brand's uploaded font in the Style tab when the brand kit has one (HTML
carries only its fallback).
Then go to `email-test-preview`: render with sample data, share the preview link above and
wait for the user's yes before any test send.

## Refusals and errors

| Response | Meaning | Tell the user |
|---|---|---|
| Conversion refused (HTML can't be converted) | No email container table found, or markup the converter can't read | What to change, in plain words; then the error as returned |
| Save refused with a template error | A tag is broken (often `{% else %}` inside `{% for %}`) | Which tag; fix, convert, retry once |
| 401 / 403 | Connection expired or not allowed | Reconnect Brevo in the agent's settings |

## Requirements

- **HTML-to-design conversion tool:** not on the Brevo MCP server yet. Until it is, this skill
  stops at step 1 and offers the HTML route. Its proposed name and parameters will be set
  here when it ships.
- `templates_update_smtp_template` fixes a missing sender email and activates a template. If
  a connection lacks it, the user sets the sender and activates the template in Brevo.
- `domains_get_domains` (whether the sender's domain is authenticated): without it, warn that
  an unauthenticated or free mailbox domain is bounced by Gmail and Yahoo, and let the user
  check in Brevo (Senders, Domains).
- `email_editor_create_template` creates the template directly from the design (no campaign is
  created first). It accepts the types `template` and `automation_template` only. To send the
  design as a campaign, the user picks the saved template when creating the campaign in Brevo.

<!-- include: shared/output-rules.md -->
