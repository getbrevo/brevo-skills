# Brand kit field rules

What Brevo accepts when a part of the brand kit is saved. Check values against these before
asking the user to confirm a save, so the save doesn't fail halfway.

## Save calls

`branding_update_brand` saves either **one part**, named by `partialUpdateField` (one name
only), or **all four parts** at once, without it. The save answers only "Data stored
successfully"; it doesn't return the kit.

| Save | Call body |
|---|---|
| Logo | `{"partialUpdateField": "logo", "logo": "https://www.example.com/logo.png"}` |
| Colours (the whole list, first colour first) | `{"partialUpdateField": "colors", "colors": ["#0B5FFF", "#FFFFFF", "#101828"]}` |
| Fonts (the whole list) | `{"partialUpdateField": "fonts", "fonts": [{"name": "Georgia", "role": "headings", "type": "standard"}, {"name": "Verdana", "role": "paragraph", "type": "standard"}]}` |
| Social links (the whole list) | `{"partialUpdateField": "socialMediaLinks", "socialMediaLinks": [{"name": "instagram", "url": "https://www.instagram.com/brand-example"}]}` |
| All four parts (two or more approved) | `{"logo": "...", "colors": [...], "fonts": [...], "socialMediaLinks": [...]}`: approved parts as approved, the others copied exactly from the kit as read. Replaces those four parts (an empty or missing one is emptied); leaves the website, name, custom icons and lookup counters alone. Never add `socialLinks` |

Website: `branding_update_website` with `{"website": "https://www.example.com"}`.
Custom icon: `branding_upsert_social_icon` with `{"title": "Podcast", "thumbnailUrl": "https://www.example.com/podcast.png"}`, plus `"id"` to change an existing one.

## Field rules

| Field | Rule |
|---|---|
| `logo` | A URL (an `https://` image the user's emails can load), or empty to remove the logo |
| `colors` | Each exactly `#` and six hex digits. `#FFF` becomes `#FFFFFF`; `rgb(11, 95, 255)` becomes `#0B5FFF`. Show the rewrite to the user. Order matters: the editor uses the first colour for buttons and links; the rest are swatches |
| `fonts[].role` | `paragraph` or `headings` |
| `fonts[].type` | `standard`, `webfont` or `custom` |
| `standard` font `name` | One of the 12 fonts below |
| `webfont` `name` | A font in Brevo's web-font list (the editor's font menu). Needs a `fallback` from the 12 fonts below. The website lookup can suggest one without a fallback: add one (Arial for sans-serif, Georgia for serif) and show it before the save |
| `custom` font | A font file the account uploaded in Brevo: needs its `id` and a `fallback` from the 12 fonts below. It can't be uploaded through the connection |
| `socialMediaLinks[].name` | A network from the list below |
| `socialMediaLinks[].url` | An `http(s)://` link, a `mailto:` address or a `tel:` number, on the network's own host (`facebook` on facebook.com); `website`, `link` and `custom-icon` can point anywhere |
| `custom-icon` link | Also needs the `id` of an existing custom icon (the kit's `socialMediaIcons`) |
| Custom icon `title` | 1 to 50 characters: letters, digits, spaces, `_` or `-`, starting with a letter or digit |
| `website` | A real website address; an empty value clears it |

## Standard fonts

Arial, Arial Black, Comic Sans MS, Courier New, Georgia, Impact, Lucida Sans Unicode,
Palatino, Tahoma, Times New Roman, Trebuchet MS, Verdana.

## Social networks

facebook, twitter, youtube, instagram, linkedin, gplus, flickr, pinterest, vimeo, website,
xing, archello, apple-music, bandcamp, deezer, discord, github, goodreads, houzz, line,
medium, messenger, mixcloud, reddit, rss, skype, snapchat, soundcloud, spotify, telegram,
tiktok, tripadvisor, whatsapp, link, wordpress, twitch, custom-icon.

`twitter` is the network name for X. `link` is a generic link with a plain icon; `website`
is the brand's own site.
