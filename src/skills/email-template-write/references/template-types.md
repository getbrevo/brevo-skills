# Brevo template types

Brevo stores every email design with a `type`. Pick the type first: it decides which
variables work, whether you must add a footer, and how the email is saved and tested.

## The three types

| | Campaign | Automation email | Transactional template |
| --- | --- | --- | --- |
| Stored `type` | `classic` | `automation_template` | `template` |
| What it is | One-off marketing send to lists or segments | Email sent by an automation workflow step | Reusable template sent through the transactional API, also usable as a starting design |
| Reusable | No (read-only once sending starts) | Yes | Yes |
| `contact.*` | Yes | Yes | Yes (the recipient must exist as a contact; `params` can't override `contact.*`) |
| `params.*` | **No: always empty** | Yes: the trigger's event data | Yes: the `params` sent with the API call |
| `feed.*` | Yes (paid plans) | Yes, plus the triggering object's data | Yes |
| Footer | Without `{{ unsubscribe }}`, Brevo appends its default footer | **No footer is added: include `{{ unsubscribe }}` yourself** | No footer is added. Purely transactional mail (receipt, reset) needs no unsubscribe link; mail that mixes in marketing does |
| Preview text | `previewText` field | `previewText` field | HTML: the hidden preheader `<div>` only (the HTML create tool has no `previewText`); drag-and-drop design: `previewText` |
| Special | A/B tests, multi-language variants | Attached to a workflow's send-email step in the automation editor | Must be **active** before live sends; test sends work on an inactive template |

**Preview text:** always write the hidden preheader `<div>` right after `<body>`.

- Campaign, and drag-and-drop design: also pass the same text as `previewText` when saving.
  The conversion to a design loses the hidden preheader, so there `previewText` becomes the
  preheader.
- Transactional template saved as HTML: `templates_create_smtp_template` has no `previewText`
  field. The hidden preheader is the preview text.

**Activating a transactional template** lets live API sends use it. Save it inactive; activate
only after the user says yes (`templates_update_smtp_template` with `isActive: true`), or let
them do it in Brevo. Test sends don't need it.

## How each type is saved

| Type | As HTML (code editor) | As a drag-and-drop design | Test |
| --- | --- | --- | --- |
| Campaign | The `email-campaign-create` skill (draft, no send time) | Not offered through the connection yet: save it as HTML | `email-test-preview` |
| Transactional | `templates_create_smtp_template`, inactive, after the user confirmed name, subject and sender | `email-template-to-dnd`, type `template` (created inactive) | `email-test-preview` (test send, preview with sample `params`) |
| Automation email | No tool accepts automation HTML today: give the HTML, the user pastes it into a new automation email in Brevo | `email-template-to-dnd`, type `automation_template`; attaching it to a workflow step is done in the automation editor | A test from the automation editor in Brevo |

Every save follows the safety rules: confirm the account, drafts or inactive templates only,
no send without an explicit yes.

## Output: HTML or drag-and-drop

Every type can be saved as HTML, and HTML keeps all loops and conditions exactly. Choose
drag-and-drop when the user wants to edit the design visually later.

| Choose | When |
| --- | --- |
| HTML (default) | The user only needs it sent, or the email needs conditions or loops around whole sections, or repeating rows with a picture per item that must work without a step in the editor |
| Drag-and-drop | The user wants to edit the design visually later |

### Drag-and-drop rules

The HTML-to-design conversion keeps template tags only as **text inside a text block**:

| Pattern | After conversion |
| --- | --- |
| `{% if %}...{% endif %}` or `{% for %}...{% endfor %}` entirely **inside one `<p>` or heading** | Kept as text in that block; renders correctly at send time. **Use this.** |
| An inline `{% if %}` whose branches hold only plain text and `{{ }}` variables | The editor shows it as an editable If/Else pill. With HTML tags inside a branch it stays raw text (it still renders) |
| Tags that wrap several `<p>` or blocks of one cell | Each tag becomes its own text block. Still sends, but the tags are loose blocks in the editor |
| `{% if %}` / `{% for %}` between section `<tr>` rows, around the whole container, or between the rows or cells of a nested table | **Lost.** The rows show to every contact, a loop renders once with literal `{{ item.name }}`, the `{% empty %}` row always shows |
| `<ul>`, `<ol>`, `<li>` | Content dropped |
| Hidden preheader `<div style="display:none">` | Dropped: pass the text as `previewText` |

Write it like this:

- A condition on a line: `<p>{% if contact.VIP %}Your VIP code: FLASH15{% else %}Join the club for early access.{% endif %}</p>`.
  Keep HTML tags outside the branches so the editor offers the If/Else pill:
  `<p><strong>{% if contact.VIP %}VIP{% else %}Member{% endif %}</strong> offer</p>`.
- A list: the whole loop in one `<p>`, one item per `<br>` (the item-list section).
- A whole section for some contacts only: write it unconditionally, and tell the user to add
  a display condition on that row in the editor (for example `contact.VIP` "is not empty";
  transactional: "Transactional parameters", `params.gift_message` "is not empty").
- **A picture per item in a loop** (abandoned cart, order items): no HTML shape converts to a
  repeating row with a picture. Do this:
  1. Write the items as the text loop in one `<p>`. It lists every item correctly at send time.
  2. Tell the user: "To show a picture per item, add a Dynamic content block in the editor
     (Data source: Custom data source, Repeat for `items`, Variable alias `item`, item limit
     off), put an image and text in it with `{{ item.image_url }}` and `{{ item.name }}`, then
     delete the text list."
  3. If the pictures must be in the email with no editor step, use HTML output instead: there
     `{% for %}` around a `<tr>` works.

  Don't add a `params.items.0` example row next to the loop: it shows the first item twice. A
  `{{ }}` in an image `src` is kept as written, so it only becomes a picture at send time (the
  editor canvas shows it broken).
- Conditions on the loop alias (`{% if item.variant %}` inside a loop) render fine, but the
  editor's variable builder can't open them: tell the user to edit those in the editor's code
  view only, or send a preformatted param instead.

## Transactional templates: specifics

- **Agree the `params` shape first** and write variable names exactly as the developer sends
  them (case-sensitive): `{{ params.order_id }}`, nested `{{ params.shipping.address.city }}`,
  by index `{{ params.items.0.name }}`. A name that doesn't match renders empty, with no error.
- **Keep a sample payload** with the HTML, using every placeholder, plus one variant with
  empty lists and missing optional keys. `email-template-check` reads the email against both.
  Use an optional key only inside an `{% if %}` that tests it
  (`{% if params.express %}...{{ params.express }}...{% endif %}`).
- **Links:** keep each whole URL in one param (`href="{{ params.reset_url }}"`); don't build
  it from pieces inside the `href`.
- **HTML from a param** is escaped unless written `{{ params.note | safe }}`. Use it only for
  HTML the sender controls.
- **No arithmetic:** every total comes from the payload. **No currency filter:** write the
  symbol in the template or send a preformatted string; `floatformat:2` needs a number, not a
  string.
- **Dates:** `{% if params.order_date %}{{ params.order_date | time_parse:"2006-01-02" | date:"02/01/2006" }}{% endif %}`,
  or `date_i18n:"fr,2 January 2006"` (en, fr, it, es, de, pt). Always inside the `{% if %}`:
  on an empty value `time_parse` fails the whole email, and a test send has no params.
- **Filters that need a value** (`time_parse`, `time_parse_rfc3339`, `date`, `date_i18n`,
  `floatformat`, `time_add_date` on a param) always sit inside `{% if params.x %}...{% endif %}`
  that tests the same param.
- **Sender, reply-to, subject, tags and attachments** are template settings, not HTML. The
  subject goes in `<title>` and in the save call. A `params` value in the subject is blank in
  a test send: word the subject so it still reads well without it.
- **Sender domain:** a sender on a domain that isn't authenticated in the account, or on a
  free mailbox domain (gmail.com, yahoo.com), is rejected or bounced by Gmail and Yahoo
  (DMARC). Warn the user when choosing such a sender (`email-test-preview` step 3 says how to
  check).
- **Legacy syntax** (`%VAR%`, `[DEFAULT_UNSUBSCRIBE]`): never.

Safe layouts:

| Email | Structure |
| --- | --- |
| Password reset / magic link | Logo, `h1`, one `<p>`, one button `href="{{ params.reset_url }}"`, a small `<p>` with the expiry ("valid for {{ params.expires_in \| default:'30' }} minutes"), and the plain URL as a fallback. No images, no unsubscribe |
| OTP / verification code | The code as a pill with `{{ params.code }}`, then the expiry line |
| Order confirmation / receipt | Header; greeting `{{ contact.FIRSTNAME \| default:"there" }}`; order number and date; items as one `<p>` loop; totals as one 2-column section per line; shipping and billing addresses side by side; one "View order" button |
| Shipping / tracking | Status headline from params, tracking button `{{ params.tracking_url }}`, carrier and arrival lines, short items summary |

## Automation emails: event data

- `params.*` is the trigger's event data. Its shape depends on the event. Ask the user for a
  sample payload or the event definition. Without one, use keys that read clearly
  (`params.items[].name`, `params.items[].price`, `params.cart_url`), mark them as
  assumptions in the summary, and keep them in one sample payload the user can correct.
- One sample payload per automation email.
- An automation email that uses no `params.*` needs no sample; say so.
- Include `{{ unsubscribe }}`: no footer is added.
