# Brevo template language

Brevo renders email HTML with a Django-like template language. Tags are processed when each
email is sent, per contact.

## Namespaces

| Namespace | Holds | Available in |
| --- | --- | --- |
| `contact` | Contact attributes, e.g. `contact.FIRSTNAME`, `contact.EMAIL` | Campaigns, automations, transactional |
| `params` | Data sent with the event or API call, e.g. `params.ORDER_ID` | Transactional and automation emails only |
| `feed` | Items from a data feed configured in the account | Where a feed is configured |
| `unsubscribe` | Unsubscribe URL | All marketing emails |
| `mirror` | "View in browser" URL | Campaigns |
| `update_profile` | Profile-update form URL | Campaigns |
| `doubleoptin` | Double opt-in confirmation URL | Double opt-in emails |
| `time_now` | Send time, e.g. `{{ time_now \| date:"02/01/2006" }}` | All |

Attribute names are exactly as defined in the account: check them with
`attributes_get_attributes` before use.

### Editor-only placeholders (never in HTML sent through the API)

| Placeholder | Why it fails | Write instead |
| --- | --- | --- |
| `{{ company.name }}`, `{{ company.address }}`, `{{ company.ADDRESS }}`, `{{ company.city }}`, `{{ company.postalCode }}`, `{{ company.zip }}`, `{{ company.email }}` | Filled in only inside the drag-and-drop editor; the send-time renderer has no `company` namespace, so it renders blank | The literal values from `accounts_get_account` |
| `{{ label.template.* }}` | Editor translation tokens, also replaced inside the editor only | The literal text in the email's language |

## Variables

```
Hello {{ contact.FIRSTNAME }}
Hello {{ contact.FIRSTNAME | default:"there" }}
Your order {{ params.ORDER_ID }}
<a href="{{ unsubscribe }}">Unsubscribe</a>
```

- Always add `default` when the value may be empty.
- Inside a double-quoted HTML attribute, use single quotes: `title="{{ contact.FIRSTNAME | default:'there' }}"`.
- Values are HTML-escaped automatically in the email body.
- Write each tag on one line (`{% if contact.VIP %}`).

## Conditions

```
{% if contact.FIRSTNAME %}
  Hi {{ contact.FIRSTNAME }},
{% else %}
  Hi there,
{% endif %}

{% if contact.COUNTRY == "FR" %}Bonjour{% elif contact.COUNTRY == "DE" %}Hallo{% else %}Hello{% endif %}

{% if contact.AGE > 18 and contact.COUNTRY == "US" %} ... {% endif %}
{% if "express" in params.shipping_method %} ... {% endif %}
```

Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `and`, `or`, `not`, `in`. Compare text with
quotes, numbers without.

A bare variable is a "not empty" check (lists included). Don't compare decimal numbers; send
them as strings.

**Drag-and-drop output:** keep the whole `{% if %} ... {% endif %}` inside ONE `<p>` or
heading. Between section rows it is lost (the rows show to everyone). With only plain text
and `{{ }}` in the branches, the editor shows it as an editable If/Else pill; HTML tags inside
a branch make it raw text (it still renders).

## Loops

```
{% for item in params.items %}
  <tr><td>{{ item.name }}</td><td>{{ item.price }}</td></tr>
{% empty %}
  <tr><td>No items</td></tr>
{% endfor %}
```

- Loop over lists in `params` (transactional, automation) or `feed`.
- **HTML output:** inside a table, put the loop tags between rows (`</tr>{% for %}<tr>`),
  never inside a `<td>` that is meant to repeat.
- **Drag-and-drop output:** the whole loop, `{% empty %}` text included, inside ONE `<p>`, one
  item per `<br>`: `<p>{% for item in params.items %}{{ item.name }}<br>{% empty %}No items.{% endfor %}</p>`.
  Loops between rows are lost there (the row renders once with literal tags).
- **Empty list:** use `{% empty %}`. **Never `{% else %}` inside a `{% for %}`**: the preview
  and the drag-and-drop save fail with "Tag 'else' not found".
  `{% if params.items %}{% for ... %}...{% endfor %}{% else %}...{% endif %}` also works.
- Modifiers: `{% for item in params.items limit:5 %}`, `reversed`, and `{{ params.items | slice:"0:3" }}`.
- Loop helpers: `forloop.Counter`, `forloop.First`, `forloop.Last`. Check with a test send if
  you rely on them.
- The loop variable (`item` above) exists only between `{% for %}` and `{% endfor %}`.
- Store a value with `{% set total = params.total %}` and use `{{ total }}` afterwards.

## Useful filters

Standard Django-style filters such as `default`, `upper`, `lower`, `capfirst`, `title`,
`floatformat`, `truncatechars`, `length`, `first`, `last`, `join` and `date`, plus Brevo
filters including `date_i18n`, `time_parse`, `time_add_date`, `json_encode`, `contains_any`,
`batch_slice`, `hash_sha256` and `base64_encode`.

| Need | Filter |
| --- | --- |
| Numbers | `floatformat:2` (the value must be a number), `integer`, `float`, `lang_format:"fr,%.2f"`. No currency filter |
| Dates | `time_parse:"2006-01-02"` then `date:"02/01/2006"` or `date_i18n:"fr,2 January 2006"` (en, fr, it, es, de, pt); also `time_parse_rfc3339`, `time_in_location:"Europe/Paris"`, `time_add_date:"0,0,3"`, `time_add_duration:"30m"`. Reference date: `Mon Jan 2 15:04:05 2006`. Guard every one with `{% if %}` (rule below) |
| HTML from a param | `safe` (otherwise escaped) |
| Chains | left to right: `{{ params.name \| lower \| capfirst }}` |

Write the fallback as `| default:"x"` (colon form). The parenthesis form `default("x")` doesn't
parse, and neither do `raw` or `number_format`.

```
{% if params.price %}{{ params.price | floatformat:2 }}{% endif %}
{% if params.order_date %}{{ params.order_date | time_parse:"2006-01-02" | date:"02/01/2006" }}{% endif %}
{{ contact.FIRSTNAME | default:"there" | capfirst }}
```

**Guard every filter that needs a value.** `time_parse`, `time_parse_rfc3339`, `date`,
`date_i18n`, `time_add_date`, `time_add_duration` and `floatformat` on a `params` or
`contact` value go inside `{% if <same value> %}...{% endif %}`. On an empty value they can
fail the **whole** email, not just the line: nothing is sent. Test sends carry no `params`,
so an unguarded date filter makes every test fail. (`time_now` always has a value.)

### No arithmetic

The template language can't multiply, add or sum. Every amount shown must already be in the
data:

- Line totals: use `item.line_total` (or similar) from the payload. If the payload only has a
  unit price and a quantity, ask for a line total, or show the unit price labelled clearly,
  e.g. `{{ item.qty }} x {% if item.price %}{{ item.price | floatformat:2 }}{% endif %}`. Never label a unit price as the
  line price.
- Subtotal, shipping, discount and total come from the payload too.

## Don't

- Write `{#` anywhere (it opens a template comment), including in CSS or text.
- Put template tags in HTML comments: they are still processed, and invalid syntax there
  breaks the whole email. Better: no HTML comments at all.
- Use other tools' variable syntaxes (`*|FNAME|*`, `{{{name}}}`, `%name%`).
- URL-encode or HTML-encode the braces.
- Use `params` in a campaign: it will be empty.
