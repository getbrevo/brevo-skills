---
name: email-template-to-dnd
description: Turns email HTML into a design that opens in Brevo's drag-and-drop editor, and saves it as a template. Use when the user wants an email they can edit visually in the drag-and-drop editor, wants HTML imported as an editable design, or wants an automation email, transactional or campaign template saved as a design. Explains how to write HTML that converts cleanly, converts it with Brevo's HTML-to-design conversion (email_editor_convert_html), tells the user what the conversion changed or dropped, saves the design unchanged after the user confirms, and lists the editor steps left to do.
---

# Email HTML to drag-and-drop design

Turns finished email HTML into a drag-and-drop design with Brevo's own HTML-to-design
conversion, checks that the design still says and links the same as the HTML, and saves it
as a template in the drag-and-drop editor. It never writes a design by hand, never sends, and
saves transactional templates inactive.

| Step | Tool |
|---|---|
| Name the account | `accounts_get_account` |
| Convert the HTML into a design (saves nothing) | `email_editor_convert_html` |
| Pick an active sender | `senders_get_senders` |
| Save the design as a template | `email_editor_create_template` |
| Read the saved template back | `templates_get_smtp_template` |
| Fix the sender, or activate after a yes | `templates_update_smtp_template` |
| Check the sender's domain is authenticated | `domains_get_domains` |

If a tool a step needs isn't in your tool list, stop that step and tell the user their Brevo
connection doesn't offer it (connection rules below). Never build a design yourself instead.

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
- **The type:** `template` (a transactional or campaign template) or `automation_template`
  (automation email). Always pass it: the save tool defaults to `automation_template`. A
  campaign template is picked by the user when they create the campaign in Brevo; a campaign
  draft from HTML is `email-campaign-create`.
- **Name, subject, preview text** (the hidden preheader is dropped on conversion, so
  `previewText` is what reaches the inbox), **sender** (an active one from the cached
  senders, else `senders_get_senders`; never invent one; warn when its domain isn't
  authenticated or is a free mailbox domain, as `email-test-preview` step 4 describes) and
  **editor language** (`en`, `fr`, `de`, `it` or `pt`).

## 2. Convert

Call `email_editor_convert_html` once. It saves nothing.

| Input | Value |
|---|---|
| `html` | The HTML as written; don't trim or "fix" it in the call. Required, not blank, at most 2 MiB |
| `name`, `subject` | The template name and subject, stored on the design |
| `format` | Leave it out (`json`, the default). Never `yaml`: that is a readable string the save tool doesn't accept |
| `normalize` | Leave it out (on by default): the HTML is first rewritten into shapes the converter understands. Send `false` only when the user asks to convert the HTML exactly as written. HTML over 128 KiB is never normalized |
| `subaccount_id` | On a sub-account |

It returns `design` (the editor's design, an object) and `normalizer`: `applied` (whether
the rewrite ran), `changes` (each `rule`, `where`, `what`), `dropped` (content that was
removed), `remaining` (problems left in the HTML) and `warning` (for example: too large to
normalize).

- Keep `design` out of the chat, and never change it: it goes unmodified into step 4.
- A refusal that the HTML can't be converted (no 600px container table, broken markup, too
  large) is explained to the user in plain words; fix the HTML and try again, at most 3
  rounds.

## 3. Check nothing was lost

**Report the normalizer first.** Before asking to save, tell the user in plain words about
everything in `normalizer.dropped` (content removed) and `normalizer.remaining` (problems
left), and any `normalizer.warning`. Summarise `changes` in one line (how many, of what
kind). Empty lists: say the rewrite dropped nothing.

Then compare the design with the HTML. Look for:

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
- Type: transactional template | campaign template | automation email
- Subject: <subject>  Preview text: <preview text>
- Sender: <sender name> <sender email>
```

On a yes, call `email_editor_create_template` once with `name` (at most 100 characters),
`type` (always: `template` or `automation_template`), `subject`, `previewText`, `senderId`
(the confirmed sender's ID; always pass it when a sender is known, or the template is saved
with no sender), `senderName`, `locale` and `newsletterContent` = the `design` object exactly
as `email_editor_convert_html` returned it: never the YAML form, never edited. The save
neither checks nor repairs it. It returns the new template's `id`. No HTML tags in name,
subject, preview text or sender name (merge tags are fine). A refusal usually means a broken template tag, for example `{% else %}` inside a
`{% for %}`: fix the HTML, convert again, retry once.

**Read it back and check the sender.** The save can store the sender ID without the sender
email, and it doesn't keep the sender name you pass (the template shows the account's
default name). A template with no sender email fails every send, test sends included, with
"From field is missing". Call `templates_get_smtp_template` with the new ID:

- `sender.email` empty: call `templates_update_smtp_template` with
  `sender` = `{"id": <the confirmed sender id>}`. Don't read it back again: its success
  response, plus the sender email (`fromEmail`) in the `params: {}` render that
  `email-test-preview` makes next, confirm it; if that render still shows no sender email,
  say so.
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
| Conversion refused (HTML can't be converted) | No email container table found, markup the converter can't read, blank HTML, or HTML over 2 MiB | What to change, in plain words; then the error as returned |
| Save refused with a template error | A tag is broken (often `{% else %}` inside `{% for %}`) | Which tag; fix, convert, retry once |
| 401 / 403 | Connection expired or not allowed | Reconnect Brevo in the agent's settings |

## Requirements

- `email_editor_convert_html` converts only; `email_editor_create_template` saves.
  `templates_update_smtp_template` fixes a missing sender email and activates a template;
  `domains_get_domains` says whether the sender's domain is authenticated. On a
  sub-account, every call passes `subaccount_id`.
- `email_editor_create_template` creates the template directly from the design (no campaign is
  created first). It accepts the types `template` and `automation_template` only. To send the
  design as a campaign, the user picks the saved template when creating the campaign in Brevo.

<!-- include: shared/output-rules.md -->
