# n8n-nodes-ticketzero

This is an n8n community node. It lets you use [TicketZero](https://ticketzero.de) — a GDPR-native customer messaging & helpdesk platform — in your n8n workflows.

With it you can create and manage contacts, conversations, notes, contact lists and files, send messages and emails, trigger TicketZero automations, and start workflows from TicketZero events (new message, new conversation, and more).

[Installation](#installation) · [Credentials](#credentials) · [Nodes & operations](#nodes--operations) · [Trigger events](#trigger-events) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n documentation. In short: **Settings → Community Nodes → Install** and enter `n8n-nodes-ticketzero`.

## Credentials

Create a **TicketZero API** credential:

- **API Key** — from TicketZero under _Settings → API Keys_ (format `hc_live_…` for production or `hc_test_…` for sandbox).
- **Base URL** — `https://ticketzero.de` for production, or your own base URL for local/staging instances.

The key is sent as a Bearer token and unlocks the public API (`/v1/api-public/*`).

## Nodes & operations

### TicketZero

| Resource | Operations |
| --- | --- |
| **Contact** | Create · Get · Get Many · Update · Delete |
| **Contact List** | Get Many · Add Member · Remove Member |
| **Conversation** | Get · Get Many · Update Status · Assign · Add Tag · Remove Tag · Delete |
| **Note** | Add · Get Many · Delete |
| **Message** | Send · Send Email |
| **File** | Upload · Get Many · Get Download Link · Delete |
| **Workspace** | Get Info |

Contact attributes and file uploads (n8n binary data → multipart) are supported. Internal notes are invisible to the customer.

### TicketZero Trigger

Starts a workflow when a TicketZero event occurs. When the workflow is activated the node automatically creates a webhook subscription in TicketZero and removes it on deactivation. Every event is verified with an HMAC-SHA256 signature (`X-SG-Signature`) against the secret returned when the subscription was created (±5 minute replay window).

### TicketZero Automation

Triggers a TicketZero automation via its webhook token (from an automation whose trigger is "Webhook received"). If the automation has a signing secret, the payload is HMAC-SHA256-signed.

## Trigger events

- Message Received
- Message Sent
- Conversation Created
- Status Changed
- Conversation Assigned
- Contact Created

## Compatibility

Requires n8n 1.x. No external runtime dependencies. Tested against the TicketZero public API v1.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [TicketZero](https://ticketzero.de)

## License

[MIT](LICENSE.md)
