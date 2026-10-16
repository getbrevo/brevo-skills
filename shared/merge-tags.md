### Mapping other ESPs' merge tags

Brevo doesn't translate other ESPs' personalization tags. They stay as literal text (for
example `*|FNAME|*` stays `*|FNAME|*` in the template). Scan the HTML for them:

| ESP | Pattern | Example | Suggest |
|---|---|---|---|
| Mailchimp | `*\|NAME\|*` | `*\|FNAME\|*` | `{{ contact.FIRSTNAME }}` |
| Salesforce Marketing Cloud | `%%Name%%` | `%%FirstName%%` | `{{ contact.FIRSTNAME }}` |
| Klaviyo | `{{ first_name }}`, `{{ person.first_name }}` | | `{{ contact.FIRSTNAME }}` |
| HubSpot | `{{ contact.firstname }}` (lower case) | | `{{ contact.FIRSTNAME }}` |

Common attributes: first name → `FIRSTNAME`, last name → `LASTNAME`, email → `EMAIL`.
Brevo tags (`{{ contact.X }}` in upper case, `{{ params.x }}`, `{{ unsubscribe }}`,
`{{ mirror }}`) are already correct: leave them alone.

List every foreign tag with its suggestion and ask the user to approve or correct the
mapping. The attribute must exist in their Brevo contacts. Replace **only the approved
tags**, exactly as written, and tell the user how many you replaced. Change nothing else.
