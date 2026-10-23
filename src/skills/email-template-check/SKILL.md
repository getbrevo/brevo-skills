---
name: email-template-check
description: Checks Brevo email HTML against Brevo's template rules and fixes what fails. Use when email HTML was just written or changed, before a campaign or template is created from it, or when the user asks to check, review or debug an email template (broken personalization, a variable that shows empty, a template that won't save). Goes through a fixed checklist - template syntax, contact attributes that exist in the account, params only where they work, absolute https images, size, unsubscribe link - fixes failures by editing only the affected lines, at most 3 rounds, and reports honestly that the check was done by hand.
---

# Check an email template

Checks one email's HTML and template language against Brevo's rules, fixes what fails, and
reports the result in one line. Brevo has no automatic template check through the
connection, so this is a checklist you apply yourself, and the report says so. It never
saves or sends anything.

| Step | Tool |
|---|---|
| The account's contact attribute names | `attributes_get_attributes` |
| An existing contact email for a preview (the account's own email) | `accounts_get_account` |
| Read a saved template to check it, one at a time | `templates_get_smtp_template` |
| Render a saved template on Brevo's servers (step 4) | `templates_post_preview_smtp_email_templates` |

If a tool a step needs isn't in your tool list, stop that step and tell the user their Brevo
connection doesn't offer it (connection rules below).

<!-- include: shared/connection.md -->

<!-- include: shared/email-cache.md -->

## 1. Collect the inputs

- **The HTML.** From the conversation, or a saved template: fetch it by ID with
  `templates_get_smtp_template` (or the cached copy). Never list all templates to find one: a template list
  returns the full HTML of every template. Ask the user for the ID or the name; if you must
  list, ask for one result at a time.
- **The type:** campaign, automation email or transactional. It decides which variables work
  and whether a missing unsubscribe link is an error.
- **Attribute names:** from the cache, else call `attributes_get_attributes` once. If the
  fetch fails, skip item 6 with a warning and go on. Without a connection, use
  `FIRSTNAME`, `LASTNAME`, `EMAIL` plus the names the user gave, and say the attribute check
  used assumed names.
- **A sample payload** (automation and transactional only): from the user, or the one written
  with the email. Without one, `params.*` paths can't be checked; say so.

## 2. Go through the checklist

Check every item against the HTML. Note each failure with what the user sees ("the greeting
in the first paragraph"), not by line number alone.

Items 1, 2, 4, 5 and 15 are about template tags and visible markup: skip the CSS inside
`<style>` for them (item 3 still applies there).
The skeleton's own rules (`-webkit-text-size-adjust:100%}`, `width:100%!important}}` in a
media query, `img{border:0}`) are not stray `}}` or borders without a colour.

**Template syntax**

1. Every `{{` has its `}}` and every `{%` its `%}`; no single-brace closings, no stray `}}`.
2. Each `if` has its `endif`, each `for` its `endfor`; `elif` and `else` sit inside an `if`,
   `empty` inside a `for`. **Never `{% else %}` inside a `{% for %}`**: use `{% empty %}`.
3. No `{#` anywhere (it opens a template comment), including in CSS and text. No template
   tags inside HTML comments.
4. Inside tags: straight quotes only (no curly quotes), no HTML (`{{ contact.<b>NAME</b> }}`),
   no HTML entities (`&quot;`), no URL-encoded braces (`%7B%7B`).
5. Only Brevo filters, in the colon form: `| default:"there"`. No `default("x")`, `raw` or
   `number_format`. No arithmetic: every amount is a field in the data.

**Variables**

6. Every `contact.X` is an attribute returned by `attributes_get_attributes`, written exactly
   (upper case). List every `contact.X` in the HTML and the subject, and compare each one
   against that list, letter by letter. A name missing from a cache older than about a
   minute: fetch the attributes once more before reporting it. A misspelt name (`FIRST_NAME`
   for `FIRSTNAME`) saves and sends without any error and silently shows its default, so this
   check is the only one that catches it. Suggest the closest name; never keep it silently.
7. Every `contact.X` shown in text has `| default:"…"` or sits inside `{% if contact.X %}`.
8. `params.*` only in automation and transactional emails; **in a campaign it is always
   empty**. Every `params` path exists in the sample payload. Read the email once with the
   sample, and once with empty lists and missing optional keys: an optional key is used only
   inside an `{% if %}` that tests it. A filter that needs a value (`time_parse`,
   `time_parse_rfc3339`, `date`, `date_i18n` or `floatformat` on a param) always sits inside
   `{% if params.x %}`: on an empty value it can fail the whole email, and test sends have no
   params.
9. No `{{ company.* }}` or `{{ label.* }}`: they render blank in sent email. The company name
   and address are plain text.
10. No other tools' merge tags (`*|FNAME|*`, `%%FirstName%%`, `{{ first_name }}`). List any
    you find with the Brevo equivalent and ask before replacing.

**Footer and action**

11. `{{ unsubscribe }}` link present: required in automation emails (no footer is added) and
    in campaigns (otherwise Brevo appends its default footer: a warning, not an error).
    Purely transactional mail (receipt, password reset) doesn't need one.
12. At least one call-to-action link. No `javascript:` links, no spaces inside an `href`.

**Email HTML**

13. Images: absolute `https://` URLs (no relative paths, no `http://`), an `alt` on each, a
    `width` attribute; no SVG or WEBP; each image URL used once (the logo excepted). An empty
    `src=""` is a placeholder: list it for the user.
14. No `<script>`, `<iframe>`, `<form>`, `<video>`, `<audio>`, `<object>`, `<embed>`, `<svg>`;
    no `display:flex`, `grid` or `position`.
15. Every border has a colour (Outlook draws a border without one in black).
16. A doctype and a viewport meta tag.
17. Size under 100 KB (Gmail clips the email at 102 KB).

**Drag-and-drop output only** (the HTML will be converted into an editable design)

18. Every `{% if %}` and `{% for %}` with its branches sits inside ONE `<p>` or heading.
    Between section rows, between the rows of a nested table, or across cells, it is lost on
    conversion.
19. No `<ul>`, `<ol>`, `<li>` (their content is dropped).
20. Every section cell sets all four padding sides; the hidden preheader text is also passed
    as `previewText` (the `<div>` is dropped on conversion).

**Subject line** (the template's subject, or the `<title>` of the HTML)

21. Same syntax rules as the body: closed tags, colon-form filters, straight quotes.
    `contact.X` only with attributes that exist, with a default.
22. `params.*` only in a transactional or automation subject, never in a campaign's (it is
    always empty there). Word the subject so it still reads well with the value blank
    ("Your order is confirmed", not "Order  confirmed"): a test send has no params, so the
    test's subject shows it empty.

## 3. Fix and check again

- Fix every failure by editing only the affected lines, never by rewriting the whole email.
- Never delete content the user asked for to make a check pass. When a fix needs a decision
  (an attribute that doesn't exist, a missing payload field), ask.
- Go through the checklist again. **Stop after 3 rounds** and show the user what is still
  wrong, with your suggestion for each.

## 4. Preview a saved template

A saved template is rendered on Brevo's servers with
`templates_post_preview_smtp_email_templates`, which catches template errors the checklist
can miss:

- Pass `templateId` and `email` of an **existing contact**: the account's own email (cached
  from `accounts_get_account`) works. For automation and transactional templates, also pass the
  sample `params`. With `params` alone (no `email`), the preview fails with 400 "Contact not
  found" whenever the template uses `contact.*` tags.
- The unsubscribe link renders with an empty `href` in a preview. That is expected, not a
  failure: check that `{{ unsubscribe }}` is in the HTML instead.
- Render three times: with the full sample; with empty lists and missing optional keys; and
  with `params: {}`. The last one is what a test send renders: **test sends carry no params**,
  so every `params` line and `params` in the subject come out blank, and a filter that needs
  a value (`time_parse` on an empty date) fails the whole email. Wrap such lines in
  `{% if params.x %}...{% endif %}` until the `params: {}` render passes.
- An error in the response is a real failure: fix it and check again (it counts as a round).
- Don't paste the rendered HTML into the chat; say whether it rendered, and quote any error.

HTML that isn't saved yet has no server render: skip this step and say so in the report.

## 5. Report in one line

Be honest about what ran. For example:

- "Checked by hand against Brevo's rules (no automatic validation was run): 0 problems left;
  fixed 2 (greeting without a default, image without alt)."
- "Checked by hand against Brevo's rules (no automatic validation was run): 1 problem left:
  `contact.TIER` isn't an attribute in your account. Use `contact.VIP`, or create the
  attribute in Brevo?"

Add "Rendered on Brevo's servers: no errors" only when step 4 ran. Then offer a test send
(`email-test-preview`) as the real check in an inbox.

## Requirements

`templates_post_preview_smtp_email_templates` renders a saved template with a contact and
sample `params` (step 4). There is no automatic template-validation tool on the Brevo MCP
server: this skill is a checklist, and its report always says no automatic validation was
run.

<!-- include: shared/output-rules.md -->
