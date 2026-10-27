# What converts cleanly

How Brevo's HTML-to-design conversion reads email HTML, and how to write HTML it reads well.
These are rules for the HTML; the conversion itself happens on Brevo's side.

## The email container

The conversion looks for the email's main table, in this order:

1. A `<table>` with `width="600"`.
2. A `<table>` whose `style` has both `max-width` and `600px`.
3. Otherwise the second `<table>` on the page.

No table at all: the conversion is refused. Wrap the email in an outer 100% table holding the
600px table. The page background comes from the outer table's `background-color`, then the
`<body>`. Vertical padding on the cell around the 600px table becomes a band of body colour
above and below the email: write `0px`.

## Sections and blocks

- Each `<tr>` directly inside the 600px table is one section (one row in the editor).
- Only the **first** `<td>` of a section row is read. Put the whole section in one cell.
- A section whose first cell is hidden (`display:none`, or `max-height:0` with
  `overflow:hidden`) is skipped. Every `display:none` element is removed first, which is why
  the hidden preheader is dropped: pass its text as `previewText`.
- A row that holds only whitespace with `font-size:0` or `line-height:0` is a spacer: it isn't
  a row, its height replaces the bottom padding of the row above.
- Inside a section cell:
  - one inner table whose first row has several `<td>`s with `width` attributes becomes
    columns (a "card" when the inner table has a radius or its own background);
  - several tables, or tables mixed with other elements, become several rows;
  - otherwise the content is split into blocks.
- Block mapping: `<img>` or `<a><img></a>` becomes an image; `<p>`, `<h1>` to `<h6>`,
  `<span>`, `<div>` and a text-only `<a>` become text; `<hr>` becomes a divider; a cell with
  only inline tags (`a span strong em b i u br sup sub`) becomes one text block.
- **Lists are dropped:** `<ul>`, `<ol>`, `<li>` have no block. Use `<p>` lines.
- Column widths come from the `width` attributes of the column cells. A cell without one isn't
  treated as a column.
- Styles are read from inline `style` attributes. A `<style>` block isn't read for layout.

## Spacing

| HTML | In the editor |
| --- | --- |
| Padding on a section's `<td>` | The row's padding |
| A padding side left out | 15px: write all four sides, `0px` included |
| `0px` top or bottom on the section cell of a multi-column section | May become 15px: write `1px` |
| Columns | No gap between them; put the gap in the column cells' padding |
| `<p>` / `<h*>` margins | Kept inside each text block; neighbouring margins add up |
| Button `<td>` top and bottom padding | The button's inner padding (12px when missing) |
| A button alone in its section | Can get the section padding twice: keep it in the cell of its text |
| A centred button in a cell with left-aligned text | The whole section is centred, text included: centre the cell, or give the button its own row with `padding-top:0px` |
| Divider | A fixed gap above and below, whatever the HTML says |

## Template tags

Tags are kept only as **text inside the block that holds them**:

- A whole `{% if %}...{% endif %}` or `{% for %}...{% endfor %}` inside one `<p>` or heading:
  kept, renders at send time.
- Tags between section rows, between the rows of a nested table, or across cells: **lost**.
  The rows show to every contact, a loop shows once with literal tags.
- Tags around several blocks of one cell: each tag becomes its own loose text block. Still
  sends, but awkward to edit.
- Tags outside the 600px table that don't wrap it (for example in the hidden preheader):
  dropped.
- Inside a tag, a double quote may be stored as `&#34;`; the editor and the send-time
  renderer turn it back into `"`.

Loops and conditions inside one text block work in the saved design and render at send time
with `params` and contact data. What the conversion doesn't do is turn a whole section wrapped
in `{% if %}` or `{% for %}` into the editor's native display condition or Dynamic content
block (those row-level tags are lost), and a repeating section with a picture per item has no
HTML-only form here. If the user wants those native blocks, they add them in the editor after
the save. **How to say it:** "Loops and conditions work in this template; they just won't become the editor's visual condition or Dynamic content blocks. If you want those native blocks, add them in the editor." Never say loops or conditions can't be built from HTML.

## `data-role` hints

`data-role` on an element (or its nearest ancestor that has one) tells the conversion what a
block is. Unknown values are ignored.

| Role | Put it on | Effect |
| --- | --- | --- |
| `cta-primary`, `cta-secondary` | the button `<td>`, with an `<a>` directly inside | Makes a button. The `<a>` must have text |
| `divider`, `divider-dashed`, `divider-short` | a table, or its parent `<td>` | Makes a divider (dashed; or short, using the table's `width`) |
| `social-icons` | a table, or its parent `<td>` | Makes a Social block |
| `logo`, `footer-logo` | inside the section `<tr>` | The section becomes the header (or footer) and its image the brand logo |
| `icon` | first cell of an icon-plus-text row | Treated as an icon next to text |
| `color-swatch` | an empty cell | Kept so its background colour shows |

Roles that only name the block in the editor's sidebar (no layout change): `headline`,
`eyebrow`, `body-text`, `quote`, `attribution`, `hero-image`, `product-image`, `product-card`,
`thumbnail`, `avatar`, `price`, `price-old`, `promo-code`, `address`, `copyright`,
`unsubscribe`, `legal`, `tagline`.

A navigation table (`data-role="nav"`) can be split into one column per link: write
navigation as one `<p>` with the links inline.

## What no HTML produces

No HTML becomes a native Spacer, Navigation, Video, Product or Dynamic content block, or a
display condition. A first row with `{{ mirror }}` stays a normal text row, not the editor's
own view-in-browser row. Tell the user which of these to add in the editor.

The converter does add its own view-in-browser row (with `{{ mirror }}`) at the top of every
design, switched off: it isn't in the sent email, and the Style tab's "Show 'View in Browser'
link" switch turns it on.

A `<p>` with no inline `line-height` gets `1.5` in the design, not the global line height:
write `line-height` on every paragraph.

## Images

- An **empty** `src=""` becomes the editor's placeholder picture.
- Any other URL is kept as written, stand-in hosts too: the stand-in (or a broken picture)
  shows until someone replaces it.
- A `{{ }}` in an image `src` is kept as written; it becomes a picture only at send time.
