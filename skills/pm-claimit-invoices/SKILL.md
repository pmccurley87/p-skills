---
name: pm-claimit-invoices
description: Retrieve Patrick McCurley's subscription and supplier expense invoices for Claimit, especially OpenAI ChatGPT, and prepare or send them from patrick@claimit.ai to finance@claimit.ai. Use for Patrick's expense paperwork, not courier invoice audits or client billing.
---

# Claimit expense invoices

Retrieve the requested original invoices and payment receipts, inspect them, and deliver the approved documents through Patrick's Claimit mailbox.

## Defaults and scope

- **Sender: `patrick@claimit.ai`. Recipient: `finance@claimit.ai` only.** Change either only on Patrick's explicit instruction. The supplier login or an earlier email's sender does not override these defaults.
- Match Patrick McCurley's requested charges. Exclude David Walker's and other people's charges even when the merchant name matches.
- Use the requested dates and amounts. Read currency from the billing document; do not infer it from a bare number in a charge list. A payment on the 22nd can appear on the statement on the 23rd: reconcile amount, billing period, account and payment method before treating that as a match.
- Search earlier sent emails for the same invoice number. Tell Patrick if a document was already delivered; do not silently omit a requested invoice. Resend when authorized.

## Access and retrieval

Use an available connector that supports the required account and attachments, or the signed-in Outlook desktop app through Computer Use. The desktop app may already have Patrick's mailbox even when Outlook web requires a fresh login.

For supplier websites, use **`pm-browser-ego`** and its required `ego-browser` skill. Reuse one task space for the task; follow its sign-in ladder with saved-login fill controls. Ask only for a concrete remaining blocker such as a locked vault or device approval. Keep credentials and verification codes out of narration and saved artifacts.

### OpenAI / ChatGPT account routing

Observed on 20 October 2026:

- The ChatGPT Pro subscription was under the **personal account for `patrick@xdelivered.com`**.
- The separate `patrick@claimit.ai` personal account showed Free. It also offered a Claimit workspace. Seeing Free there does not establish that Patrick has no subscription invoices.
- The Pro account's **billing email was `patrick@claimit.ai`**. Login identity, billed customer and outgoing email sender are separate fields.

Verify the current account and plan. Use an existing account-switcher entry for the subscribed account when available. In Settings → Billing, use Transaction history, then View all if needed, and open the requested subscription invoice. Exclude unrelated credit purchases unless requested. Download both the original invoice and paid receipt where available. An earlier sent email may contain a usable Stripe invoice link.

These are historical routing clues, not fixed account state. Use live UI observations and current tool documentation; never reuse old element IDs, task-space IDs, signed invoice links or tokens.

## Inspect before delivery

Save original PDFs in a clearly named local folder, with invoice number and document date in each filename. Inspect the actual documents, using the available PDF tools and a rendered page when needed. Check:

- Billed legal entity, full address, billing email and tax IDs.
- Invoice number, issue date, service period, amount and currency.
- Receipt's payment date, amount and payment method. An invoice saying "amount due" can have a separate paid receipt.

Expected Claimit details approved in October 2026:

| Field | Value |
| --- | --- |
| Legal entity | CLAIMIT LTD |
| Address | 106 Lobley Hill Road, Gateshead, NE8 4YG, United Kingdom |
| UK VAT | GB447644370 |
| Billing email | patrick@claimit.ai |

Use the latest Patrick-approved details if they change. Flag a mismatch to Patrick before delivery; do not change a billing record merely because it differs. A GOINSIGHTS OU name or personal address is not a substitute for Claimit's details.

**Before sending, show Patrick the exact local documents or accessible links and the proposed message, then wait for explicit approval, even if the initial request asks for delivery.** Respect any review and approval already completed in this task; do not ask again for the same approved send. If details are wrong, obtain approval for the specific next action. Keep the routine finance email short. Do not automatically insert a billing-discrepancy narrative into it; Patrick can approve sending the documents as issued without that note.

Example message, with actual dates, invoice numbers and currency:

> Hi Finance,
>
> Attached are the invoices and payment receipts for my ChatGPT Pro subscription:
>
> - [invoice date]: [amount and currency] - invoice [number]
> - [invoice date]: [amount and currency] - invoice [number]
>
> Total: [amount and currency], covering the requested charges.
>
> Thanks,
> Patrick

## Compose, send and verify

1. Set and verify the actual **From account is `patrick@claimit.ai`**. Recheck after any account change. Do not inherit `patrick@xdelivered.com` from a previous sent example.
2. Enter `finance@claimit.ai`, allow autocomplete to finish, and inspect the exact result before selecting it. **Do not immediately press Return or Tab after typing:** Outlook can select a stale suggestion such as Dave. Verify the resolved recipient token's email, not just its display name. Clear unintended recipients and verify To, Cc and Bcc before sending.
3. Attach every approved PDF and wait for uploads to complete. Verify each filename and the attachment count. A native file chooser can support multiple selection while Outlook's first snapshot shows only the first attachment; inspect the completed draft before adding or sending anything again.
4. Check the approved message, sender, recipient and attachments together, then send once. If interrupted or the result is uncertain, inspect Outbox and Sent before retrying to avoid duplicates.
5. Verify the sent copy: correct From, only the intended recipient, expected attachments and message. Report the result. A click on Send or a "Sending..." status alone does not establish completion.

## Future billing corrections

Only update supplier billing details when Patrick requests or specifically approves the correction. Use the approved Claimit details above, or newer approved evidence. For ChatGPT, edit Settings → Billing → Billing information; check the company name, country, address, billing email and UK VAT. Remove an unrelated tax ID only through a supported control when that correction is authorized; do not claim it was removed if it was not verified.

Save and verify the persisted billing information. Describe the change as applying to future billing; do not promise it rewrites historical PDFs. Keep this correction separate from the approved email content and do not change the subscription, payment method or plan.

Finish the browser task according to `ego-browser` cleanup instructions. Confirm the send and any verified billing update concisely. Keep invoice PDFs and private links out of the p-skills repository.
