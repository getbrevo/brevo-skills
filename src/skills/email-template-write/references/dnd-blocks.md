# Drag-and-drop block patterns

Ready-made HTML for blocks the section snippets don't cover, in the shapes that convert to the
intended drag-and-drop editor block. The "Becomes" line says what the editor gets.

How to use:
- Each pattern is one or more section rows (`<tr>`) for the 600px container. Copy only what you need.
- Swap colours, fonts and text for the brand's. Keep the structure: the 4-side paddings, the `width="NN%"` cells, the `data-role`s and where styles sit.
- Images: `src=""` plus a descriptive `alt` when there is no real URL (the conversion puts the editor's placeholder in). Stand-in pictures only when the user asks.
- Links: replace `brand-example.com` with real URLs from the brief.
- The first `<p>`, `<h1>`-`<h3>`, button and coloured link of the email set the editor's Style tab. These patterns usually sit after the hero, so they don't set it.

## 1. Divider

Becomes: one divider block (1px solid, the colour of the `border-top`). The editor adds a fixed gap above and below the line; the section padding adds to that.

```html
<tr><td style="padding-top:8px;padding-right:40px;padding-bottom:8px;padding-left:40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" data-role="divider"><tr><td style="border-top:1px solid #E5E7EB;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
```

## 2. Spacer

Becomes: no block. The row is folded into the section above: that section's **bottom padding is replaced** by the spacer height (a 16px padding becomes 32px, not 48px). There is no HTML path to a native Spacer block. Prefer real section padding. If the user explicitly asks for a spacer, use this pattern (it gives the gap they asked for) and tell them they can swap in a Spacer block to make it resizable.

```html
<tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>
```

## 3. Quote (testimonial)

Becomes: two text blocks named "Quote" and "Attribution", on a row with the tinted background. One quote section per email at most.

```html
<tr><td style="padding-top:32px;padding-right:48px;padding-bottom:32px;padding-left:48px;background-color:#F3F4F6;text-align:center;">
<p data-role="quote" style="margin:0 0 12px;font-size:20px;line-height:1.5;font-style:italic;color:#111827;text-align:center;">"It carries the shopping, the kids and the dog."</p>
<p data-role="attribution" style="margin:0;font-size:14px;color:#6B7280;text-align:center;">Anna K., customer since 2024</p>
</td></tr>
```

## 4. Social icons row

Becomes: one Social block. Rules: link to the brand's real profile on a known platform
(instagram.com, facebook.com, x.com or twitter.com, linkedin.com, youtube.com, tiktok.com,
pinterest.com, whatsapp.com, vimeo.com); one linked image per platform, `width="32"`; don't
tint icons to the footer grey. An icon for a platform the editor doesn't know may be removed
when the design is opened: put it outside this table as a plain linked image. Use icon image
URLs the user gives; otherwise leave `src=""` with the platform name as `alt`, and tell the
user to pick the icons in the editor's Social block after import (the editor has its own icon
set). After the first open, ask the user to check that every icon is still there.

```html
<tr><td align="center" style="padding-top:24px;padding-right:40px;padding-bottom:8px;padding-left:40px;text-align:center;">
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" data-role="social-icons"><tr>
<td style="padding-right:8px;"><a href="https://www.instagram.com/brand-example"><img src="" width="32" alt="Instagram" style="width:32px;height:auto;display:block;"></a></td>
<td style="padding-right:8px;"><a href="https://www.facebook.com/brand-example"><img src="" width="32" alt="Facebook" style="width:32px;height:auto;display:block;"></a></td>
<td style="padding-right:8px;"><a href="https://x.com/brand-example"><img src="" width="32" alt="X" style="width:32px;height:auto;display:block;"></a></td>
<td><a href="https://www.linkedin.com/company/brand-example"><img src="" width="32" alt="LinkedIn" style="width:32px;height:auto;display:block;"></a></td>
</tr></table>
</td></tr>
```

## 5. Navigation links

Becomes: one text block with the links inline. Write navigation as **one `<p>`**, not a `data-role="nav"` table: a navigation table can be split into one column per link.

Global-style note: nav usually sits above the first body paragraph, so its `<p>` would set the global paragraph style. Give the `<p>` the **global** paragraph values (same as your body text) and put the small, bold look on a `<span>` inside each link. The `<a>` carries only `text-decoration` (no colour), so it does not set the global link colour either.

```html
<tr><td style="padding-top:12px;padding-right:40px;padding-bottom:12px;padding-left:40px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.6;color:#374151;text-align:center;"><a href="https://www.brand-example.com/new" style="text-decoration:none;"><span style="font-size:14px;font-weight:bold;color:#374151;">New in</span></a> &nbsp;|&nbsp; <a href="https://www.brand-example.com/women" style="text-decoration:none;"><span style="font-size:14px;font-weight:bold;color:#374151;">Women</span></a> &nbsp;|&nbsp; <a href="https://www.brand-example.com/men" style="text-decoration:none;"><span style="font-size:14px;font-weight:bold;color:#374151;">Men</span></a> &nbsp;|&nbsp; <a href="https://www.brand-example.com/sale" style="text-decoration:none;"><span style="font-size:14px;font-weight:bold;color:#374151;">Sale</span></a></p>
</td></tr>
```

## 6. Promo code pill

Becomes: a text block named "Promo Code" whose `<span>` keeps every style (dark pill, white bold letter-spaced code). Put **all** pill styles on the `<span>`; a coloured `<td>` instead becomes a full-width callout and loses its text styles. Outlook desktop drops the radius and padding (the code still shows on its colour). For an OTP or verification code, use the same shape with `{{ params.code }}`.

```html
<tr><td style="padding-top:24px;padding-right:40px;padding-bottom:24px;padding-left:40px;text-align:center;">
<p style="margin:0 0 12px;text-align:center;">Use this code at checkout:</p>
<p data-role="promo-code" style="margin:0;text-align:center;"><span style="display:inline-block;background-color:#111827;color:#FFFFFF;font-size:20px;font-weight:bold;letter-spacing:3px;border-radius:8px;padding-top:10px;padding-right:20px;padding-bottom:10px;padding-left:20px;">FLASH15</span></p>
</td></tr>
```

## 7. Button (the default shape)

Becomes: a Button block with the background, radius, `width` and vertical padding written. This is the shape every button in an email should use:
- background, radius and `width:NN%` on the `<td>` (a percentage of the column; without it the conversion guesses a width from the label length);
- `padding-top`/`padding-bottom` on the `<td>` set the button height; left and right padding are ignored in the editor (the width does that job), so keep them only for the HTML version;
- the `<a>` is a direct child of the `<td>`, holds only the label, white written `#FFFFFF`;
- keep the button in the **same cell** as the heading and text above it.

Why the last rule: a button alone in its own section can get the section padding twice in the editor, so the spacing doubles.

**A centred button centres its whole section.** A button table with `align="center"` (or `margin:0 auto`) in a cell whose heading and text are left-aligned makes the editor centre every block of that section, the text included. Either centre the whole cell (`text-align:center`, as below), or, to keep the text left-aligned, put the button in its own section row right after the text, with `padding-top:0px` on that row so the spacing doesn't double.

```html
<tr><td style="padding-top:24px;padding-right:40px;padding-bottom:32px;padding-left:40px;text-align:center;">
<h2 style="margin:0 0 12px;font-size:22px;color:#111827;text-align:center;">Ready to ride?</h2>
<p style="margin:0 0 20px;text-align:center;">Free delivery this week.</p>
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td data-role="cta-primary" align="center" style="background-color:#1F4FD8;border-radius:6px;padding-top:14px;padding-bottom:14px;width:40%;"><a href="https://www.brand-example.com/shop" style="color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;">Shop now</a></td></tr></table>
</td></tr>
```

## 8. Two buttons side by side

Becomes: a 2-column row, one Button per column, each centred in its half at 80% of the column. Only `align="center"` (or `margin:0 auto`) on the button table is read; `align="right"` and `"left"` both become left, which pushes the buttons apart. So centre both. The column cells may use `0px`; the section cell around them needs `1px` or more top and bottom. Still at most 2 main buttons per email: this pattern counts as both.

```html
<tr><td style="padding-top:8px;padding-right:40px;padding-bottom:32px;padding-left:40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="50%" valign="top" style="padding-top:0px;padding-right:6px;padding-bottom:0px;padding-left:0px;">
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td data-role="cta-primary" align="center" style="background-color:#1F4FD8;border-radius:6px;padding-top:14px;padding-bottom:14px;width:80%;"><a href="https://www.brand-example.com/register" style="color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;">Register</a></td></tr></table>
</td>
<td width="50%" valign="top" style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:6px;">
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td data-role="cta-secondary" align="center" style="background-color:#1F4FD8;border-radius:6px;padding-top:14px;padding-bottom:14px;width:80%;"><a href="https://www.brand-example.com/calendar.ics" style="color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;">Add to calendar</a></td></tr></table>
</td>
</tr></table>
</td></tr>
```

## 9. Round avatar card (speaker, author, team member)

Becomes: a round image block named "Avatar" (96px) and two text blocks, no extra padding around the image. Use half the image width in px for the radius (`48px` on 96px); `50%` also converts, but px is safer in older clients. Outlook desktop shows a square. For 2 or 3 people, put one card per column cell (`width="50%"` or `"33%"`; the section cell needs at least `1px` top and bottom).

```html
<tr><td style="padding-top:24px;padding-right:40px;padding-bottom:24px;padding-left:40px;text-align:center;">
<img data-role="avatar" src="" alt="Portrait of speaker Maria Lopez" width="96" height="96" style="width:96px;height:96px;border-radius:48px;display:block;margin:0 auto;">
<h3 style="margin:12px 0 4px;font-size:18px;color:#111827;text-align:center;">Maria Lopez</h3>
<p style="margin:0;font-size:14px;color:#6B7280;text-align:center;">Head of Design, Studio North</p>
</td></tr>
```

## 10. Order summary lines (label and amount)

Becomes: one 2-column row per line: label left, amount right, each an editable text block; the divider is a divider block. Write **one section per line**, not one multi-row table, which can get extra gaps between lines. Every amount comes from the payload (no arithmetic). The column cells use `0px`; the section cells use at least `1px` top and bottom.

```html
<tr><td style="padding-top:16px;padding-right:40px;padding-bottom:4px;padding-left:40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="50%" valign="top" style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;"><p style="margin:0;font-size:15px;color:#374151;">Subtotal</p></td>
<td width="50%" valign="top" style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;text-align:right;"><p style="margin:0;font-size:15px;color:#374151;text-align:right;">{{ params.subtotal }}</p></td>
</tr></table>
</td></tr>
<tr><td style="padding-top:4px;padding-right:40px;padding-bottom:4px;padding-left:40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="50%" valign="top" style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;"><p style="margin:0;font-size:15px;color:#374151;">Shipping</p></td>
<td width="50%" valign="top" style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;text-align:right;"><p style="margin:0;font-size:15px;color:#374151;text-align:right;">{{ params.shipping }}</p></td>
</tr></table>
</td></tr>
<tr><td style="padding-top:8px;padding-right:40px;padding-bottom:8px;padding-left:40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" data-role="divider"><tr><td style="border-top:1px solid #E5E7EB;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td style="padding-top:4px;padding-right:40px;padding-bottom:16px;padding-left:40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="50%" valign="top" style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;"><p style="margin:0;font-size:15px;color:#374151;font-weight:bold;">Total</p></td>
<td width="50%" valign="top" style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;text-align:right;"><p style="margin:0;font-size:15px;color:#374151;text-align:right;font-weight:bold;">{{ params.total }}</p></td>
</tr></table>
</td></tr>
```

## 11. Video thumbnail

Becomes: a full-width image block named "Thumbnail" linking to the video, then a text block with the caption link. No HTML becomes the editor's Video block. Tell the user they can swap in a Video block (Video URL = the link; the editor makes its own thumbnail with a play button). If you have a real thumbnail, it should already show a play button (baked into the picture); never `<video>` or `<iframe>`.

```html
<tr><td style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;">
<a href="https://www.youtube.com/watch?v=VIDEO_ID"><img data-role="thumbnail" src="" alt="Video thumbnail with a play button: how the bike folds" width="600" style="width:600px;max-width:100%;height:auto;display:block;"></a>
</td></tr>
<tr><td style="padding-top:12px;padding-right:40px;padding-bottom:24px;padding-left:40px;text-align:center;">
<p style="margin:0;font-size:14px;text-align:center;"><a href="https://www.youtube.com/watch?v=VIDEO_ID">Watch the video (2 min)</a></p>
</td></tr>
```

## 12. Product grid (3 cards)

Becomes: a 3-column row; each column is named "Product Card" and holds an image ("Product Image", 8px radius), a title, a "Price" text block and a Button. For 2 products use `width="50%"`. This is a stand-in: when the account has a product catalogue, tell the user they can swap it for a Product block (no HTML becomes one).

```html
<tr><td style="padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td data-role="product-card" width="33%" valign="top" style="padding-top:0px;padding-right:8px;padding-bottom:0px;padding-left:8px;text-align:center;">
<img data-role="product-image" src="" alt="Matte black city bike, side view" width="168" style="width:100%;max-width:168px;height:auto;display:block;margin:0 auto;border-radius:8px;">
<h3 style="margin:12px 0 4px;font-size:16px;color:#111827;text-align:center;">Urban One</h3>
<p data-role="price" style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;text-align:center;">&euro;1,290</p>
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td data-role="cta-primary" align="center" style="background-color:#1F4FD8;border-radius:6px;padding-top:10px;padding-bottom:10px;width:80%;"><a href="https://www.brand-example.com/urban-one" style="color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;">View</a></td></tr></table>
</td>
<td data-role="product-card" width="33%" valign="top" style="padding-top:0px;padding-right:8px;padding-bottom:0px;padding-left:8px;text-align:center;">
<img data-role="product-image" src="" alt="Green cargo bike with wooden box" width="168" style="width:100%;max-width:168px;height:auto;display:block;margin:0 auto;border-radius:8px;">
<h3 style="margin:12px 0 4px;font-size:16px;color:#111827;text-align:center;">Cargo Two</h3>
<p data-role="price" style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;text-align:center;">&euro;2,190</p>
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td data-role="cta-primary" align="center" style="background-color:#1F4FD8;border-radius:6px;padding-top:10px;padding-bottom:10px;width:80%;"><a href="https://www.brand-example.com/cargo-two" style="color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;">View</a></td></tr></table>
</td>
<td data-role="product-card" width="33%" valign="top" style="padding-top:0px;padding-right:8px;padding-bottom:0px;padding-left:8px;text-align:center;">
<img data-role="product-image" src="" alt="Folding bike, folded, front view" width="168" style="width:100%;max-width:168px;height:auto;display:block;margin:0 auto;border-radius:8px;">
<h3 style="margin:12px 0 4px;font-size:16px;color:#111827;text-align:center;">Fold Three</h3>
<p data-role="price" style="margin:0 0 12px;font-size:15px;font-weight:bold;color:#111827;text-align:center;">&euro;890</p>
<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td data-role="cta-primary" align="center" style="background-color:#1F4FD8;border-radius:6px;padding-top:10px;padding-bottom:10px;width:80%;"><a href="https://www.brand-example.com/fold-three" style="color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;">View</a></td></tr></table>
</td>
</tr></table>
</td></tr>
```

## 13. Footer links (keep them out of the global link colour)

Becomes: two text blocks on the grey row. The first `<a>` in the email with an inline `color` sets the template's global link colour (Style tab, Links). A grey footer link written `<a style="color:#555555">` would make every body link grey when no body link comes first. So in the footer, the `<a>` carries only `text-decoration:none`, and the grey and underline sit on a `<span>` inside it.

The company name and address are literal text from `accounts_get_account`, never `{{ company.* }}` (blank at send time). Purely transactional mail usually has no unsubscribe link; keep the address line.

```html
<tr data-section-type="footer"><td style="padding-top:32px;padding-right:40px;padding-bottom:32px;padding-left:40px;background-color:#F4F4F4;text-align:center;">
<p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#555555;text-align:center;">Brand Ltd, 1 Main Street, 75001 Paris</p>
<p style="margin:0;font-size:12px;line-height:1.6;color:#555555;text-align:center;"><a href="{{ update_profile }}" style="text-decoration:none;"><span style="color:#555555;text-decoration:underline;">Preferences</span></a> &nbsp;|&nbsp; <a href="{{ unsubscribe }}" style="text-decoration:none;"><span style="color:#555555;text-decoration:underline;">Unsubscribe</span></a></p>
</td></tr>
```

## 14. View-in-browser line (optional, first row)

Becomes: a plain first text row with the `{{ mirror }}` link. It is **not** the editor's own view-in-browser row, so the Style tab's "Show 'View in Browser' link" switch doesn't control it. Add it only when the user wants a web-version link (campaigns; `{{ mirror }}` isn't documented for transactional sends). Its `<p>` and `<a>` repeat the **global** paragraph and link values, and the small grey look sits on the `<span>`, because this row can be read first for the global styles. Don't repeat `{{ mirror }}` in the footer.

```html
<tr data-role="view-in-browser"><td style="padding-top:8px;padding-right:40px;padding-bottom:8px;padding-left:40px;text-align:center;">
<p style="margin:0;font-size:16px;line-height:1.6;color:#374151;text-align:center;"><a href="{{ mirror }}" style="color:#1F4FD8;text-decoration:underline;"><span style="font-size:12px;color:#858588;">View in browser</span></a></p>
</td></tr>
```

## Blocks with no HTML path (tell the user)

No HTML becomes these blocks. Build the stand-in, then tell the user what to swap in the editor:

| Want | Stand-in in the HTML | Tell the user |
| --- | --- | --- |
| Video block | Pattern 11 | Swap in a Video block with the video URL |
| Product block | Pattern 12 | Swap in a Product block and pick the products |
| Spacer block | Section padding, or pattern 2 | Drop in a Spacer block if they want a resizable gap |
| Dynamic content (repeat a whole section per item, for example with a picture) | A loop inside one `<p>` | Add a Dynamic content block (Custom data source, list `items`, alias `item`), build the item with `item.` fields, then delete the text list. Pictures needed with no editor step: HTML output |
| Display condition on a whole section | Write the section unconditionally | Add a display condition on the row, e.g. `contact.VIP` is not empty |
| Native navigation block | Pattern 5 | Optional: swap in a Navigation block |
| Countdown timer | Static text ("48 hours left") or a timer image from a timer service | - |
| Native view-in-browser row | Pattern 14, or nothing | The Style tab switch "Show 'View in Browser' link" only shows or hides a native row; it never adds one |
