# Global styles (the editor's Style tab) for drag-and-drop output

**Why it matters.** A drag-and-drop template has global styles (Style tab: paragraph,
headings, links, buttons) and local styles (inline on one block). A local value always wins.
If every block carries its own font, size and colour, the email *looks* right but changing the
Style tab does nothing. The HTML-to-design conversion has no style manifest: it **infers** the
globals from the first elements of each kind in your HTML. So write those first elements on
purpose.

## What sets each global

| Global (Style tab) | Read from | Default when missing |
| --- | --- | --- |
| Paragraph font | `font-family` on `<body style>` (first family) | Arial |
| Paragraph colour, size, line height | the **first `<p>`** in the email | #333333 / 15px / 1.5 |
| Heading 1 colour, size | the first `<h1>` | #2B2B2B / 30px |
| Heading 2 / Heading 3 | the first `<h2>` / `<h3>` (colour falls back to the h1 colour) | 22px / 20px |
| Button background, radius | the first button `<td>` | #000000 / 0px |
| Link colour | the **first `<a>` with an inline `color`** that isn't white | #000000 |

## Rules

1. Put the brand font on `<body style="font-family:...">`, with a fallback stack.
2. Make the **first `<p>`** of the email carry the body text values (`color`, `font-size`,
   `line-height`). Watch what comes first: a navigation line, an eyebrow or a "View in
   browser" line above the hero is the first `<p>`. Give such a `<p>` the body values too, and
   put its small or grey look on a `<span>` inside it.
3. Make the first `<h1>`, `<h2>`, `<h3>` carry that level's `color` and `font-size`.
4. Make the **first coloured `<a>`** a body text link in the brand link colour. Never let a
   footer, unsubscribe or view-in-browser link, or a dark-on-light button label, be that first
   coloured link: give footer links their colour on an inner `<span>`. Write white as
   `#FFFFFF` (upper case): a lowercase `#ffffff` button label can become the global link
   colour, turning every text link white.
5. After the first occurrence, leave out values equal to the global: `<p>Text</p>`,
   `<a href="...">link</a>`. The block then follows the Style tab until the user overrides
   it. Keep inline values only where a block deliberately differs (a white heading on a dark
   band, a small grey footer).
6. Buttons always keep local colours after conversion (background, radius, width, text
   colour). Make every button identical so they still look like one style.
7. Dark hero: the first `<h1>` must carry the global heading colour, so if the hero heading is
   white on a dark band, put the white on a `<span>` inside a globally coloured `<h1>`, or make
   an `<h1>` on a white section come first.

## Inline styles and the editor's rich-text toolbar

Converted text, button labels and navigation items are edited with the editor's toolbar:

| HTML | What the toolbar does |
| --- | --- |
| `<p style="font-size:15px;color:#333333">`, `<h1 style>` | Reads it. A change wraps the text in a `<span style>` inside the `<p>`. "Clear formatting" removes the `<p>` style, so the block falls back to the globals |
| `<a style="...">` | A colour change **replaces the whole `style` of the `<a>`** with the new colour: `text-decoration:none`, weight and size on the `<a>` are lost |

So: put typography (font, size, weight, letter-spacing, line height, colour) on the
`<p>`/`<h*>` or on a `<span>` inside the link, never only on the `<a>`. On `<a>`, write at most
`color` and `text-decoration`, and only when they differ from the global link.

No `<script>` style manifest: scripts aren't allowed in email HTML.
