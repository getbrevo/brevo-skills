# Email design rules

The rules Brevo's own email generator follows. Apply them to every hand-written marketing
email.

## 1. Document skeleton

Copy this skeleton. Put every section as one `<tr>` inside the 600px container table (the
`width="600"` table): header, hero, content, footer.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Subject line here</title>
<style>
body{margin:0;padding:0;-webkit-text-size-adjust:100%}table{border-collapse:collapse}img{border:0;display:block}
</style>
</head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:Arial, Helvetica, sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">Preview text that complements the subject line</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding-top:0px;padding-right:10px;padding-bottom:0px;padding-left:10px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;">
</table>
</td></tr></table>
</body>
</html>
```

Only when the email has multi-column rows, add this inside `<style>`:

```css
@media (max-width:600px){.col-50,.col-33,.col-25{display:block!important;width:100%!important;max-width:100%!important}}
```

- `lang` = the email language's two-letter code. Subject line goes in `<title>`.
- **Always include the hidden preheader** right after `<body>`, and pass the same text as
  `previewText` when the save call has that field (campaigns, drag-and-drop designs; the HTML
  transactional template tool has none, so there the `<div>` is the preview text). Without it the inbox shows the first visible text. HTML that is
  sent as written keeps the `<div>`; a drag-and-drop conversion drops it, so there only
  `previewText` reaches the inbox.
- **Outer cell padding:** keep the vertical padding of the cell around the 600px table at
  `0px`. In the drag-and-drop editor it becomes a band of body colour above and below the
  whole email. Put the top space on the first section instead.
- Style inline and keep markup compact: no indentation beyond what helps, no comments in the
  final email.
- Every `<table>` gets `role="presentation" cellspacing="0" cellpadding="0" border="0"`.
- Every `font-family` has a fallback stack, or Outlook shows Times New Roman.
- No JavaScript (scripts, `on...=` handlers, `javascript:` links). No `<video>`, `<audio>`,
  `<canvas>`, `<iframe>`, `<object>`, `<embed>`, `<svg>`, `<form>`.
- Under 100 KB in total, or Gmail cuts the email off ("clipping" at 102 KB).

### Columns

Every multi-column cell needs the `width` attribute **and** the matching class so it stacks on
phones: `50%` with `col-50`, `33.33%` with `col-33`, `25%` with `col-25`. Example:
`<td width="50%" class="col-50" valign="top" style="padding: 14px;">`. Mix in at least one
multi-column row; single-column-only emails look flat. One exception: a label and its amount
on one line (order summary, totals) stay side by side on phones, so their cells have no class.

## 2. Colour

- **White is the default background.** Tint 1 or 2 accent sections at most (highlight, promo
  block, footer).
- **Never two coloured sections in a row.** Good: white, colour, white, colour footer.
- **At most 4 distinct background colours** in the whole email. Reuse them.
- Brand colours go on text, buttons, eyebrows and accent sections, not everywhere.
- **Text contrast at least 4.5:1** against its background.
- A full-width coloured band puts the colour on the outer cell spanning all 600px (a padded
  coloured cell shows white gutters). A rounded card puts it on the inner cell.
- No decorative `border: Xpx solid`. Only a thin `border-top`/`border-bottom` divider, and
  only between two sections with the same background. Every border has a colour (Outlook
  draws a border without one in black).

## 3. Buttons (calls to action)

- **At most 2 main buttons** (per-product buttons in a list don't count). Repeats use the
  same text.
- **All buttons identical:** same radius, padding, font size, colour.
- Colour is the brand **primary colour** and must stand out from the section behind it.
- **Button text: 3 words at most**, starting with a verb ("Shop now", "Book a demo").
- A standalone call to action, including "View" on a card, is always a button, never an
  underlined link.
- A section never starts with a button: heading or image, text, then button.
- Never two clickable things in a row; no small print under buttons; no `border`, `outline`
  or `box-shadow`.

**Use a "bulletproof" button:** the background colour and padding sit on the `<td>`, not on
the `<a>`. Outlook ignores padding on links.

- **Add `width: NN%` to the button `<td>`** (a percentage of the column, e.g. 40% for a lone
  button, 80% in a product card). Without it the drag-and-drop conversion guesses a width from
  the label length.
- The `<td>` top and bottom padding become the button's inner padding in the editor.
- The `<a>` is a direct child of the `<td>` and holds only the label. White is written
  `#FFFFFF`.
- **Keep the button in the same cell as the heading and text above it.**

```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 24px auto 16px;">
  <tr>
    <td data-role="cta-primary" align="center" style="background-color: #1F2937; border-radius: 6px; padding: 14px 28px; width: 40%;">
      <a href="https://www.brand-example.com/shop" target="_blank" style="display: block; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #FFFFFF; text-decoration: none;">Shop now</a>
    </td>
  </tr>
</table>
```

Swap in the brand primary colour, button radius and a real URL from the brief. The outer
table only centres; no background, border or radius on it.

Placement: short email, 1 button after the content; medium, after the hero and before the
footer; long, also one mid-email.

## 4. Spacing

- **24 to 40px padding** between sections; at least 30px between major ones. Sections with
  different backgrounds touch, with that padding inside.
- Heading 12 to 18px above text; paragraphs 16 to 20px apart, `line-height` 1.7 to 1.9; image
  to text 16 to 20px; button 20 to 28px above, 12 to 16px below; card padding 16 to 22px.
- Two sections in a row add their paddings: a 32px bottom plus a 32px top is a 64px gap. Pick
  the pair, not each side on its own.

## 5. Opening order

1. **Header** (logo).
2. **Hero image**, ideally right after the header. If text must come first, one short
   headline only (no paragraph, no button).
3. **Headline (`<h1>`)**, 24 to 36px, bold. A short hook such as "Your next ride starts
   here". **Never a greeting.**
4. **First paragraph**, which starts with the greeting inline:
   `<p>Hi {{ contact.FIRSTNAME | default:"there" }}, here is our pick of the week...</p>`.

No wall of text above the hero, and no eyebrow or badge in the first section. Skip the hero
for B2B or informational emails and scannable digests. Never use a chart, map or diagram as
the hero.

## 6. Images

- **Image source:**
  1. Use an absolute `https://` URL from the brief or the brand's site.
  2. No real URL: write `src=""` and an `alt` that says which picture is wanted. Never pick a
     stand-in service (`placehold.co`, `picsum.photos`, ...) on your own.
  3. The user explicitly asks for stand-in pictures: use them, ask for PNG
     (`https://placehold.co/600x300/png`; `placehold.co` serves SVG by default), list every one
     under "Placeholders to replace", and tell the user to swap them before sending.

  Why: a drag-and-drop conversion turns only an **empty** `src` into the editor's placeholder
  picture. Any other URL, stand-in hosts included, is kept as written, so the editor and the
  sent email show the stand-in until someone replaces it.
- Always an `alt` describing the picture, inline `display: block; max-width: 100%; height: auto;`,
  and a `width` attribute (`width="600"` on the hero).
- **Hero:** full-bleed 600px, no padding, `border-radius: 0`, no text on it; for e-commerce it
  shows the promoted product. Put it in its own section `<tr>` (`<td style="padding: 0px;">`),
  not in the cell with the headline, so it stays edge to edge in the drag-and-drop editor.
- Product images: rounded, padded, large. Images in one row share an aspect ratio.
- Round portraits (speakers, authors): `border-radius` of half the width in px (`48px` on a
  96px image). Outlook desktop shows them square.
- Video: never `<video>` or `<iframe>`; a linked thumbnail image.
- **Each image URL used once** (the logo, repeated in header and footer, is the exception). No
  SVG or WEBP; use JPG, PNG or GIF. Aim for about 60% images, 40% text.

**Logo:** explicit width, `style="width: 90px; height: auto;"` in the header, `width: 60px` in
the footer. **Never `max-height`**: the Brevo editor ignores it and shows the logo full width.
Logo only in header and footer, on a background it shows up on.

## 7. Content rules

- **Never invent URLs.** Only URLs from the brief or the organisation's website, exactly as
  given (no added paths). Social profile URLs are fine in the footer.
- **No em-dashes or en-dashes.** Use commas.
- No ALL-CAPS banner bars; use an eyebrow above a headline. Strikethrough only on numbers (old
  price). One quote section at most.
- Discount-led: price or code right after the hero. Never more than 2 text-only sections in a
  row. Last section before the footer is a warm sign-off.

## 8. Footer

- **Neutral grey** background, never a saturated brand colour (`#F4F4F4` light, `#2A2A2A`
  dark; a faint tint is fine). Text a grey of the same family (`#555555` / `#CCCCCC`).
- Background and padding on the outer `<td>`: `padding: 32px 40px 32px 40px` (at least 30px
  each side). Padding on a `<table>` is ignored.
- Contains `<a href="{{ unsubscribe }}">Unsubscribe</a>`, company name and postal address,
  and a copyright line.
- Footer links: put the grey on a `<span>` inside the `<a>`
  (`<a href="{{ unsubscribe }}" style="text-decoration:none;"><span style="color:#555555;text-decoration:underline;">Unsubscribe</span></a>`).
  In a drag-and-drop design, a grey `<a style="color:...">` can become the template's global
  link colour.
- Social icons: known platforms only, linking to the brand's real profile (a link whose
  host doesn't match its network is flagged to the user, not used); don't tint icons to the
  footer grey. In HTML output the icon images are placeholders the user replaces with their
  own (list them under "Placeholders to replace"); in drag-and-drop output the editor's
  Social block supplies the icons.

## 9. Structure that converts to the drag-and-drop editor

Hand-written HTML converts into drag-and-drop blocks best when: the email is **one 600px
container table**; each section is **one direct `<tr>`** of it; multi-column rows are
**nested tables** with `width="%"` cells (plus `col-*` class); and elements carry
**`data-role` attributes**. Most useful roles:

| `data-role` | Put it on |
|---|---|
| `logo` / `footer-logo` | Header / footer logo cell |
| `hero-image` | Full-width hero image cell |
| `headline` | Any `h1`/`h2`/`h3` |
| `body-text` | Paragraph text |
| `cta-primary` / `cta-secondary` | The `<td>` of a solid button |
| `product-image` / `product-card` | Product photo / column holding one product |
| `price` / `price-old` | Current price / struck-through old price |
| `promo-code` | The `<p>` holding a coupon code pill |
| `divider` | A one-cell table whose cell has a `border-top` |
| `quote` / `attribution` | Testimonial text / its author line |
| `avatar` / `thumbnail` | A round portrait / a video thumbnail |
| `social-icons` | The table of social icons |
| `address` / `copyright` / `unsubscribe` | Footer lines |

Navigation has no role to use: write it as one `<p>` with the links inline.

## 10. Spacing in the drag-and-drop editor

The editor spaces things differently from plain HTML, so HTML that looks right in an inbox
can look loose or shifted on the editor canvas. Write the spacing you want the reader to see,
as plain HTML; don't subtract the editor's gaps yourself. Pick structures that convert
cleanly:

| HTML | Becomes in the editor |
| --- | --- |
| Padding on a section's `<td>` (the direct `<tr><td>` of the 600px table) | The row's padding, inside the row background |
| A side you leave out of that padding | **15px**. Write all four sides, `0px` included |
| `0px` top or bottom padding on the section `<td>` of a **multi-column** section | May be read as unset (15px). Write `1px` (or the real gap) there |
| Columns (`<td width="50%">`) | Grid columns with no gap between them. A column cell's own padding becomes the column padding |
| `margin` on `<p>` / `<h1>`-`<h6>` | Stays inside that text block. Margins of neighbouring blocks **add**, they don't merge |
| `margin` on a button's wrapper `<table>` | The button's space above and below |
| A `data-role="divider"` table | A divider with a fixed gap above and below |
| A spacer row (`<tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>`) | No row: the section above gets that height as its bottom padding, **replacing** what it had |
| Two sections one after the other | Two rows whose paddings **add** |

Rules:

1. **Write all four padding sides on every section cell**, for example
   `padding: 32px 40px 32px 40px` or `padding: 0px`. In multi-column sections, use `1px`
   instead of `0px` top and bottom on the section cell; the column cells inside may use `0px`.
2. **A full-bleed image is its own section**: one `<tr>` whose `<td>` has `padding: 0px` and
   holds only the image, `width="600"`.
3. **Keep things that belong together in one cell.** Heading, text and button of one block go
   in the same section `<td>`. Split over several sections, their paddings add into big gaps.
4. **Space text with one margin direction:** `margin: 0 0 16px` (bottom only) on headings and
   paragraphs, `margin: 0` on the last one in a cell. The one place for a top margin is the
   first text after an image (`margin: 12px 0 4px` on a card title under its picture).
5. **Two buttons side by side:** two 50% columns, each button table `align="center"` and
   `width:80%`. `align="right"` or `"left"` on a button table pushes the buttons apart.
6. **Column width:** inner width of a column = (600 - section left padding - section right
   padding) x column share - the column cell's own side padding. Size column images to it.
7. **Prefer real section padding to spacer rows.**
8. **One text block per template construct.** `{% if %}` / `{% for %}` and everything they wrap
   stay inside one `<p>`.
