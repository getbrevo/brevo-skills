# Editor blocks no HTML produces

These are steps for the user in Brevo's drag-and-drop editor, after the design is saved. List
only the ones the email needs, in plain words.

Loops and conditions written in the HTML still work in the saved design when each sits inside
one text block; they render at send time. The display condition and Dynamic content steps
below are only for users who want the editor's native visual blocks for a whole section.
**How to say it:** "Loops and conditions work in this template; they just won't become the editor's visual condition or Dynamic content blocks. If you want those native blocks, add them in the editor."

## What to tell the user

| The email needs | What the HTML holds | Editor step for the user |
| --- | --- | --- |
| A video | A linked thumbnail image | Add a **Video** block and paste the video URL; the editor makes a thumbnail with a play button. Delete the stand-in |
| Catalogue products | Product cards | Add a **Product** block and pick up to 9 products; layout List or Grid |
| A repeating section (order items, feed items) with a picture per item | A loop inside one paragraph | Add **Dynamic content**: Data source = Custom data source (transactional or automation `params`) or Data feeds; Repeat for = the list (`items`); Variable alias = `item`; turn the item limit off for order lines; build the item with `item.` fields, then delete the text list |
| A section for some contacts only | The section, unconditional | Row settings, **Display conditions**: for example Contact attributes, `VIP`, "is not empty"; or Transactional parameters, `gift_message`, "is not empty" |
| Desktop-only or mobile-only content | - | Block settings, **Content visibility**: Only on desktop / Only on mobile |
| A resizable gap | Section padding | Add a **Spacer** block |
| A view-in-browser row | An optional first text row with `{{ mirror }}` | The converter adds the editor's own row, switched off; the Style tab switch "Show 'View in Browser' link" turns it on. Use one or the other, not both |
| Social icons | A Social block | After the first open, check every icon is still there; re-add the Social block if one vanished (icons for platforms the editor doesn't know may be removed) |
| Template tags kept as text | `{% if %}` or `{% for %}` inside a paragraph | Edit them in the text block; conditions on a loop's `item` can be edited only in the editor's code view |

## Reading a saved design (when the user asks what is in it)

- A **display condition** is an expression on a row or block, shown as an eye badge;
  "is not empty" is the bare attribute. Conditions in one group are joined with `and`, groups
  with `or`.
- A **Dynamic content** row repeats for each item of its list, with an alias such as `item`.
- A **converted button** carries its own background, radius, width and text colour, so it
  doesn't follow the Style tab's button settings until the user resets it.
- **Data feeds:** a feed's name gives its loop key (hyphens become underscores:
  `test-data-feed` is `feed.test_data_feed.data`). Never copy a feed's credentials into HTML,
  chat or files.
