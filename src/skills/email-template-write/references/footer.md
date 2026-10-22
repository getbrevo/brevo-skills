# Footer section

Neutral grey background, with background and padding on the section `<td>`. In the editor it
becomes one row with Logo, Address, Copyright and Unsubscribe blocks.

- The unsubscribe link carries its grey on an inner `<span>`, not on the `<a>`: in a
  drag-and-drop design, the first `<a>` with an inline colour sets the global link colour.
- Social icons, if any, go in their own section just above this one.
- Brand name, in this order: the one the user gave in the brief (the brand the email is
  for); else the brand kit's `name` (the `Brand name` line of the Brand styles block); else
  the account's company name, and say so. Use the company name first only when the user says
  to. Address from `accounts_get_account` unless the user
  gives another. Both as plain text. Never `{{ company.* }}`: it renders blank in sent email.
- Purely transactional mail usually has no unsubscribe line; keep the address.

```html
<tr data-section-id="footer-logo-minimal" data-section-type="footer">
  <td style="background-color: #F4F4F4; padding: 32px 40px 32px 40px; text-align: center;">
    <img data-role="footer-logo" src="" alt="Brand name logo" width="60" style="width: 60px; height: auto; display: block; margin: 0 auto 16px;" />
    <p data-role="address" style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: #555555; text-align: center;">[Company name], [Street], [Postcode] [City]</p>
    <p data-role="copyright" style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: #555555; text-align: center;">&copy; 2026 [Company name]. All rights reserved.</p>
    <p data-role="unsubscribe" style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: #555555; text-align: center;"><a href="{{ unsubscribe }}" style="text-decoration: none;"><span style="color: #555555; text-decoration: underline;">Unsubscribe</span></a></p>
  </td>
</tr>
```
