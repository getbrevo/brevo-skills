# Section snippets

Copy-ready sections. Each one is a single `<tr>...</tr>` that goes inside the 600px container
table, except the hero, which is two (image, then text) so the image stays full-bleed in the
drag-and-drop editor.

## How to use

- The colours and fonts are neutral defaults. Swap in the brand's values, and use the same
  value everywhere it repeats:
  - Primary colour `#1F2937` (buttons, headline accents)
  - Body text colour `#374151`, heading colour `#111827`
  - Font `Arial, Helvetica, sans-serif` (a brand web font goes first, for example
    `'Poppins', Arial, Helvetica, sans-serif`)
  - Button radius `6px`, card and image radius `8px`
- Every `https://www.brand-example.com/...` **link** is a placeholder. Replace it with a real
  absolute `https://` URL from the brief or the brand's site. Never invent a URL.
- **Images:** the snippets use `src=""` plus a descriptive `alt`. Use a real `https://` URL
  when you have one; stand-in pictures only when the user asks for them.
- **Footer values:** company name and address come from `accounts_get_account`, as plain
  text. Without a connection, keep the `[Company name]`, `[Street]`, `[Postcode] [City]`
  placeholders and list them for the user.
- Keep the `data-role` and `data-section-id` attributes; they help Brevo convert the HTML into
  drag-and-drop blocks.
- The final email has no HTML comments.

## Container (once per email)

The sections go inside this table, in order: header, hero, content sections, footer. The
document around it (head, styles, hidden preheader) is the skeleton named in the skill's
quick rules.

```html
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF;">
</table>
```

## 1. Header with logo

Use a dark background on the cell if the logo is light. The logo has an explicit 90px width,
never `max-height`.

```html
<tr data-section-id="header-centered-logo">
  <td style="padding: 20px 24px 20px 24px; text-align: center; background-color: #FFFFFF;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td data-role="logo" style="text-align: center;">
          <a href="https://www.brand-example.com/" target="_blank">
            <img src="" alt="Brand name logo" width="90" style="width: 90px; height: auto; display: inline-block;" />
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

## 2. Hero (image, headline, text, button)

Full-bleed image with no radius, then the `h1` hook (never a greeting), then the first
paragraph opening with the greeting. These are **two sections**: the image alone in a
`padding: 0` section, then headline, text and button together in one cell. The button is
bulletproof: background, padding and `width:NN%` on the `<td>`.

```html
<tr data-section-id="content-hero-full-width">
  <td data-role="hero-image" style="padding: 0px; line-height: 0;">
    <img src="" alt="Woman cycling through a sunny city street on a green cargo bike" width="600" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0; border-radius: 0;" />
  </td>
</tr>
<tr data-section-id="content-hero-text">
  <td style="padding: 32px 40px 32px 40px; text-align: center;">
    <h1 data-role="headline" style="margin: 0 0 16px; font-family: Arial, Helvetica, sans-serif; font-size: 30px; line-height: 1.2; font-weight: bold; color: #111827;">Your next ride starts here</h1>
    <p data-role="body-text" style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.7; color: #374151;">Hi {{ contact.FIRSTNAME | default:"there" }}, our new cargo bike carries the shopping, the kids and the dog, without breaking a sweat.</p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 24px auto 0;">
      <tr>
        <td data-role="cta-primary" align="center" style="background-color: #1F2937; border-radius: 6px; padding: 14px 28px; width: 50%;">
          <a href="https://www.brand-example.com/product" target="_blank" style="display: block; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #FFFFFF; text-decoration: none;">Discover the bike</a>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

## 3. Two-column split (image left, text right)

Use in mirrored pairs: repeat the row with the two cells swapped (text left, image right).
For a single item, use a full-width section instead. Keep the text short so the columns line
up. The price lines and the button are optional; strikethrough only on numbers.

```html
<tr data-section-id="content-image-text-split">
  <td style="padding: 16px 28px 16px 28px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout: fixed;">
      <tr>
        <td data-role="product-image" width="50%" class="col-50" valign="top" style="padding: 12px;">
          <img src="" alt="Close-up of the bike's wooden cargo box holding grocery bags" width="252" style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0; border-radius: 8px;" />
        </td>
        <td width="50%" class="col-50" valign="top" style="padding: 16px 14px; word-wrap: break-word; overflow-wrap: break-word;">
          <h2 data-role="headline" style="margin: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 20px; line-height: 1.3; color: #111827;">Built to Carry</h2>
          <p data-role="body-text" style="margin: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: #374151;">Room for a week of shopping, with a frame that stays steady when fully loaded.</p>
          <p data-role="price-old" style="margin: 0 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #6B7280; text-decoration: line-through;">2,490 &euro;</p>
          <p data-role="price" style="margin: 0 0 16px; font-family: Arial, Helvetica, sans-serif; font-size: 17px; font-weight: bold; color: #111827;">2,190 &euro;</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td data-role="cta-primary" align="center" style="background-color: #1F2937; border-radius: 6px; padding: 12px 22px; width: 60%;">
                <a href="https://www.brand-example.com/product" target="_blank" style="display: block; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #FFFFFF; text-decoration: none;">Shop now</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

## 4. Product grid (3 columns)

For 2 products, use two cells with `width="50%" class="col-50"`. Each image must be a
different URL, and all images in the row share one aspect ratio (square works best). Repeat
the product-card cell for each product; the per-product button is a styled button, never a
plain text link.

```html
<tr data-section-id="content-product-grid-3col">
  <td style="padding: 24px 22px 24px 22px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout: fixed;">
      <tr>
        <td data-role="product-card" width="33.33%" class="col-33" valign="top" style="padding: 12px; text-align: center;">
          <img data-role="product-image" src="" alt="Matte black city bike, side view on white background" width="160" style="width: 100%; max-width: 100%; height: auto; display: block; margin: 0; border-radius: 8px;" />
          <h3 data-role="headline" style="margin: 14px 0 6px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.3; color: #111827;">Urban One</h3>
          <p data-role="body-text" style="margin: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: #374151;">Light frame for daily commutes.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
            <tr>
              <td data-role="cta-primary" align="center" style="background-color: #1F2937; border-radius: 6px; padding: 10px 18px; width: 80%;">
                <a href="https://www.brand-example.com/product-1" target="_blank" style="display: block; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #FFFFFF; text-decoration: none;">View</a>
              </td>
            </tr>
          </table>
        </td>
        <td data-role="product-card" width="33.33%" class="col-33" valign="top" style="padding: 12px; text-align: center;">
        </td>
        <td data-role="product-card" width="33.33%" class="col-33" valign="top" style="padding: 12px; text-align: center;">
        </td>
      </tr>
    </table>
  </td>
</tr>
```

## 5. Call-to-action band

A full-width coloured band: the colour sits on the outer cell so it runs edge to edge. Don't
place it next to another coloured section. Text must reach 4.5:1 contrast; on a dark band the
button is light, with the same radius and padding as the other buttons. In a drag-and-drop
design, a dark button label can become the global link colour: put a body text link in the
brand link colour earlier in the email.

```html
<tr data-section-id="cta-band">
  <td style="padding: 36px 40px 36px 40px; background-color: #1F2937; text-align: center;">
    <h2 data-role="headline" style="margin: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 24px; line-height: 1.3; color: #FFFFFF;">48 hours only: 15% off</h2>
    <p data-role="body-text" style="margin: 0 0 24px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: #E5E7EB;">Use code <strong style="color: #FFFFFF;">FLASH15</strong> at checkout before midnight on Sunday.</p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto;">
      <tr>
        <td data-role="cta-primary" align="center" style="background-color: #FFFFFF; border-radius: 6px; padding: 14px 28px; width: 50%;">
          <a href="https://www.brand-example.com/sale" target="_blank" style="display: block; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #1F2937; text-decoration: none;">Shop the sale</a>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

## 5b. Item list (works for HTML and drag-and-drop output)

Transactional and automation emails only (`params` is empty in campaigns; use a `feed.*` list
there). The whole loop, including the `{% empty %}` text, sits inside **one `<p>`**: it stays
one editable text block in the editor and renders correctly at send time. One line per item,
separated by `<br>`. Every amount must be a payload field (no arithmetic).

```html
<tr data-section-id="item-list">
  <td style="padding-top: 8px; padding-right: 40px; padding-bottom: 24px; padding-left: 40px;">
    <p data-role="body-text" style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.8; color: #374151;">{% for item in params.items %}<strong>{{ item.name }}</strong>, {{ item.qty }} x {% if item.price %}{{ item.price | floatformat:2 }} EUR{% endif %}<br>{% empty %}Your items are listed in your account.{% endfor %}</p>
  </td>
</tr>
```

**Rich items (a picture per item):** for drag-and-drop output, keep the one-paragraph list
above and tell the user to add pictures with a Dynamic content block in the editor; for HTML
output, a `{% for %}` around a `<tr>` works.

**A section shown only to some contacts:** for drag-and-drop output, write the section without
a condition and tell the user to add a display condition on that row in the editor (for
example `contact.VIP` "is not empty"). For a line of text, keep the condition inside one
`<p>`: `<p>{% if contact.VIP %}Your VIP code: FLASH15{% else %}Join the club for early access.{% endif %}</p>`.
