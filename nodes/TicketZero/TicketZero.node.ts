import { createHmac } from "crypto";

import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
  type IDataObject,
  type IExecuteFunctions,
  type IHttpRequestOptions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
  type JsonObject,
} from "n8n-workflow";

import {
  ticketZeroApiRequest,
  ticketZeroApiRequestAllItems,
} from "./GenericFunctions";

export class TicketZero implements INodeType {
  description: INodeTypeDescription = {
    displayName: "TicketZero",
    name: "ticketZero",
    icon: "file:ticketzero.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      "Manage contacts, conversations, messages, notes, files and automations in TicketZero — the GDPR-native, all-in-one customer messaging and helpdesk platform.",
    defaults: { name: "TicketZero" },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: "ticketZeroApi",
        required: true,
        displayOptions: { hide: { resource: ["automation"] } },
      },
    ],
    properties: [
      // ----------------------------------------------------------------
      // Resource
      // ----------------------------------------------------------------
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          { name: "Automation", value: "automation" },
          { name: "Contact", value: "contact" },
          { name: "Contact List", value: "contactList" },
          { name: "Conversation", value: "conversation" },
          { name: "File", value: "file" },
          { name: "Message", value: "message" },
          { name: "Note", value: "note" },
          { name: "Workspace", value: "workspace" },
        ],
        default: "conversation",
      },

      // ----------------------------------------------------------------
      // Operation: Automation
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["automation"] } },
        options: [
          {
            name: "Trigger",
            value: "trigger",
            action: "Trigger an automation",
            description:
              "Trigger a TicketZero automation via its webhook token",
          },
        ],
        default: "trigger",
      },

      // ----------------------------------------------------------------
      // Fields: Automation (trigger)
      // ----------------------------------------------------------------
      {
        displayName: "Base URL",
        name: "baseUrl",
        type: "string",
        default: "https://ticketzero.de",
        required: true,
        displayOptions: {
          show: { resource: ["automation"], operation: ["trigger"] },
        },
        description:
          "Base URL of the TicketZero API (production: https://ticketzero.de)",
      },
      {
        displayName: "Webhook Token",
        name: "webhookToken",
        type: "string",
        typeOptions: { password: true },
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["automation"], operation: ["trigger"] },
        },
        description:
          'The webhook token of the TicketZero automation (trigger "Webhook received"). 32–128 hex characters.',
      },
      {
        displayName: "Signing Secret",
        name: "signingSecret",
        type: "string",
        typeOptions: { password: true },
        default: "",
        displayOptions: {
          show: { resource: ["automation"], operation: ["trigger"] },
        },
        description:
          "Optional. If the automation has a secret, the body is HMAC-SHA256-signed with it. Leave empty if the automation was created without a secret.",
      },
      {
        displayName: "Payload (JSON)",
        name: "payload",
        type: "json",
        default: "{}",
        displayOptions: {
          show: { resource: ["automation"], operation: ["trigger"] },
        },
        description:
          "Sent as the body and available in the automation as {{webhook.body.&lt;path&gt;}}",
      },

      // ----------------------------------------------------------------
      // Operation: Contact
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["contact"] } },
        options: [
          {
            name: "Create",
            value: "create",
            action: "Create a contact",
            description: "Create a new contact",
          },
          {
            name: "Delete",
            value: "delete",
            action: "Delete a contact",
            description: "Delete a contact (soft delete)",
          },
          {
            name: "Get",
            value: "get",
            action: "Get a contact",
            description: "Get a contact by ID",
          },
          {
            name: "Get Many",
            value: "getAll",
            action: "Get many contacts",
            description: "Get many contacts (optionally filtered by email)",
          },
          {
            name: "Update",
            value: "update",
            action: "Update a contact",
            description: "Update fields and custom attributes of a contact",
          },
        ],
        default: "create",
      },

      // ----------------------------------------------------------------
      // Operation: Contact List
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["contactList"] } },
        options: [
          {
            name: "Add Member",
            value: "addMember",
            action: "Add a contact to a list",
            description: "Add a contact to a list",
          },
          {
            name: "Get Many",
            value: "getAll",
            action: "Get many contact lists",
            description:
              "Get many contact lists (segments) including member counts",
          },
          {
            name: "Remove Member",
            value: "removeMember",
            action: "Remove a contact from a list",
            description: "Remove a contact from a list",
          },
        ],
        default: "getAll",
      },

      // ----------------------------------------------------------------
      // Operation: Conversation
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["conversation"] } },
        options: [
          {
            name: "Add Tag",
            value: "addTag",
            action: "Add a tag",
            description: "Add a tag to the conversation",
          },
          {
            name: "Assign",
            value: "assign",
            action: "Assign a conversation",
            description:
              "Assign the conversation to a team member (empty = unassign)",
          },
          {
            name: "Delete",
            value: "delete",
            action: "Delete a conversation",
            description: "Delete the conversation (soft delete)",
          },
          {
            name: "Get",
            value: "get",
            action: "Get a conversation",
            description: "Get a conversation including the last 50 messages",
          },
          {
            name: "Get Many",
            value: "getAll",
            action: "Get many conversations",
            description: "Get many conversations (filter by status/inbox)",
          },
          {
            name: "Remove Tag",
            value: "removeTag",
            action: "Remove a tag",
            description: "Remove a tag from the conversation",
          },
          {
            name: "Update Status",
            value: "setStatus",
            action: "Update conversation status",
            description: "Set the status (open / snoozed / done)",
          },
        ],
        default: "getAll",
      },

      // ----------------------------------------------------------------
      // Operation: Note
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["note"] } },
        options: [
          {
            name: "Add",
            value: "add",
            action: "Add a note",
            description: "Add an internal note to a conversation",
          },
          {
            name: "Delete",
            value: "delete",
            action: "Delete a note",
            description: "Delete an internal note",
          },
          {
            name: "Get Many",
            value: "getAll",
            action: "Get many notes",
            description: "Get many internal notes of a conversation",
          },
        ],
        default: "add",
      },

      // ----------------------------------------------------------------
      // Operation: Workspace
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["workspace"] } },
        options: [
          {
            name: "Get Info",
            value: "get",
            action: "Get workspace info",
            description: "Get info about the connected workspace (about me)",
          },
        ],
        default: "get",
      },

      // ----------------------------------------------------------------
      // Operation: File
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["file"] } },
        options: [
          {
            name: "Delete",
            value: "delete",
            action: "Delete a file",
            description: "Delete a file",
          },
          {
            name: "Get Download Link",
            value: "download",
            action: "Get a file download link",
            description: "Generate a short-lived download URL",
          },
          {
            name: "Get Many",
            value: "getAll",
            action: "Get many files",
            description: "Get many folders and files in the file manager",
          },
          {
            name: "Upload",
            value: "upload",
            action: "Upload a file",
            description: "Upload a file from n8n binary data",
          },
        ],
        default: "getAll",
      },

      // ----------------------------------------------------------------
      // Fields: File
      // ----------------------------------------------------------------
      {
        displayName: "File ID",
        name: "fileId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["file"], operation: ["download", "delete"] },
        },
      },
      {
        displayName: "Input Binary Field",
        name: "binaryPropertyName",
        type: "string",
        required: true,
        default: "data",
        displayOptions: { show: { resource: ["file"], operation: ["upload"] } },
        description:
          "Name of the n8n binary property that holds the file to upload",
      },
      {
        displayName: "Additional Fields",
        name: "fileUploadFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: { show: { resource: ["file"], operation: ["upload"] } },
        options: [
          {
            displayName: "File Name",
            name: "name",
            type: "string",
            default: "",
            description: "Display name (otherwise taken from the binary data)",
          },
          {
            displayName: "Folder ID",
            name: "folder_id",
            type: "string",
            default: "",
          },
        ],
      },
      {
        displayName: "Folder ID",
        name: "fileFolderId",
        type: "string",
        default: "",
        displayOptions: { show: { resource: ["file"], operation: ["getAll"] } },
        description: "Only contents of this folder (empty = root)",
      },

      // ----------------------------------------------------------------
      // Operation: Message
      // ----------------------------------------------------------------
      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["message"] } },
        options: [
          {
            name: "Send",
            value: "send",
            action: "Send a message",
            description: "Send an outbound text message in a conversation",
          },
          {
            name: "Send Email",
            value: "sendEmail",
            action: "Send an email",
            description:
              "Send an HTML email in an email conversation (with subject)",
          },
        ],
        default: "send",
      },

      // ----------------------------------------------------------------
      // Fields: Create contact
      // ----------------------------------------------------------------
      {
        displayName: "Additional Fields",
        name: "contactFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: { resource: ["contact"], operation: ["create"] },
        },
        description:
          "At least one of name/email/phone/external ID should be set",
        options: [
          {
            displayName: "Attributes (JSON)",
            name: "attributes",
            type: "json",
            default: "{}",
            description: "Freely definable attributes as a JSON object",
          },
          {
            displayName: "Email",
            name: "email",
            type: "string",
            placeholder: "name@example.com",
            default: "",
          },
          {
            displayName: "External ID",
            name: "external_id",
            type: "string",
            default: "",
            description:
              "Your own contact ID (for dedup / matching with your CRM)",
          },
          { displayName: "Name", name: "name", type: "string", default: "" },
          {
            displayName: "Phone (E.164)",
            name: "phone",
            type: "string",
            placeholder: "+491701234567",
            default: "",
            description: "Must be in E.164 format, e.g. +491701234567",
          },
        ],
      },

      // ----------------------------------------------------------------
      // Fields: Get contact
      // ----------------------------------------------------------------
      {
        displayName: "Contact ID",
        name: "contactId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["get", "update", "delete"],
          },
        },
      },

      // ----------------------------------------------------------------
      // Fields: Update contact
      // ----------------------------------------------------------------
      {
        displayName: "Update Fields",
        name: "contactUpdateFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: { resource: ["contact"], operation: ["update"] },
        },
        options: [
          {
            displayName: "Attributes (JSON)",
            name: "attributes",
            type: "json",
            default: "{}",
            description:
              "Custom attributes as a JSON object. A value of `null` removes the attribute.",
          },
          {
            displayName: "Consent Status",
            name: "consent_status",
            type: "options",
            options: [
              { name: "Double Opt-in Pending", value: "pending_double_optin" },
              { name: "Opted In", value: "opted_in" },
              { name: "Opted Out", value: "opted_out" },
            ],
            default: "opted_in",
          },
          {
            displayName: "Email",
            name: "email",
            type: "string",
            placeholder: "name@example.com",
            default: "",
          },
          { displayName: "Name", name: "name", type: "string", default: "" },
          {
            displayName: "Phone (E.164)",
            name: "phone",
            type: "string",
            placeholder: "+491701234567",
            default: "",
          },
        ],
      },

      // ----------------------------------------------------------------
      // Fields: Contact list (add / remove member)
      // ----------------------------------------------------------------
      {
        displayName: "List ID",
        name: "listId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: ["contactList"],
            operation: ["addMember", "removeMember"],
          },
        },
      },
      {
        displayName: "Contact ID",
        name: "memberContactId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: ["contactList"],
            operation: ["addMember", "removeMember"],
          },
        },
      },

      // ----------------------------------------------------------------
      // Fields: Get many contacts
      // ----------------------------------------------------------------
      {
        displayName: "Return All",
        name: "returnAll",
        type: "boolean",
        default: false,
        displayOptions: {
          show: { resource: ["contact"], operation: ["getAll"] },
        },
        description:
          "Whether to return all results or only up to a given limit",
      },
      {
        displayName: "Limit",
        name: "limit",
        type: "number",
        typeOptions: { minValue: 1 },
        default: 50,
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["getAll"],
            returnAll: [false],
          },
        },
        description: "Max number of results to return",
      },
      {
        displayName: "Filter",
        name: "contactFilters",
        type: "collection",
        placeholder: "Add Filter",
        default: {},
        displayOptions: {
          show: { resource: ["contact"], operation: ["getAll"] },
        },
        options: [
          {
            displayName: "Email",
            name: "email",
            type: "string",
            placeholder: "name@example.com",
            default: "",
            description:
              "Exact email lookup (via blind index, without decrypting all rows)",
          },
        ],
      },

      // ----------------------------------------------------------------
      // Fields: Get conversation
      // ----------------------------------------------------------------
      {
        displayName: "Conversation ID",
        name: "conversationId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: ["conversation"],
            operation: [
              "get",
              "setStatus",
              "assign",
              "addTag",
              "removeTag",
              "delete",
            ],
          },
        },
      },
      {
        displayName: "Conversation ID",
        name: "conversationId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["message"], operation: ["send", "sendEmail"] },
        },
      },

      // ----------------------------------------------------------------
      // Fields: Get many conversations
      // ----------------------------------------------------------------
      {
        displayName: "Return All",
        name: "returnAll",
        type: "boolean",
        default: false,
        displayOptions: {
          show: { resource: ["conversation"], operation: ["getAll"] },
        },
        description:
          "Whether to return all results or only up to a given limit",
      },
      {
        displayName: "Limit",
        name: "limit",
        type: "number",
        typeOptions: { minValue: 1 },
        default: 50,
        displayOptions: {
          show: {
            resource: ["conversation"],
            operation: ["getAll"],
            returnAll: [false],
          },
        },
        description: "Max number of results to return",
      },
      {
        displayName: "Filter",
        name: "conversationFilters",
        type: "collection",
        placeholder: "Add Filter",
        default: {},
        displayOptions: {
          show: { resource: ["conversation"], operation: ["getAll"] },
        },
        options: [
          {
            displayName: "Contact ID",
            name: "contact_id",
            type: "string",
            default: "",
            description:
              "Only conversations of this contact (get many conversations of a contact)",
          },
          {
            displayName: "Inbox ID",
            name: "inbox_id",
            type: "string",
            default: "",
          },
          {
            displayName: "Status",
            name: "status",
            type: "options",
            options: [
              { name: "Done", value: "done" },
              { name: "Open", value: "open" },
              { name: "Snoozed", value: "snoozed" },
            ],
            default: "open",
          },
        ],
      },

      // ----------------------------------------------------------------
      // Fields: Update status
      // ----------------------------------------------------------------
      {
        displayName: "Status",
        name: "status",
        type: "options",
        required: true,
        options: [
          { name: "Done", value: "done" },
          { name: "Open", value: "open" },
          { name: "Snoozed", value: "snoozed" },
        ],
        default: "open",
        displayOptions: {
          show: { resource: ["conversation"], operation: ["setStatus"] },
        },
      },

      // ----------------------------------------------------------------
      // Fields: Assign
      // ----------------------------------------------------------------
      {
        displayName: "Assignee User ID",
        name: "assigneeUserId",
        type: "string",
        default: "",
        displayOptions: {
          show: { resource: ["conversation"], operation: ["assign"] },
        },
        description:
          "User ID of the team member. Leave empty to remove the assignment.",
      },

      // ----------------------------------------------------------------
      // Fields: Add / remove tag
      // ----------------------------------------------------------------
      {
        displayName: "Tag",
        name: "tag",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: ["conversation"],
            operation: ["addTag", "removeTag"],
          },
        },
        description: "Only letters, digits, _ and - (will be lowercased)",
      },

      // ----------------------------------------------------------------
      // Fields: Note (resource)
      // ----------------------------------------------------------------
      {
        displayName: "Conversation ID",
        name: "noteConversationId",
        type: "string",
        required: true,
        default: "",
        displayOptions: { show: { resource: ["note"] } },
      },
      {
        displayName: "Note",
        name: "noteBody",
        type: "string",
        required: true,
        typeOptions: { rows: 3 },
        default: "",
        displayOptions: { show: { resource: ["note"], operation: ["add"] } },
      },
      {
        displayName: "Note ID",
        name: "noteId",
        type: "string",
        required: true,
        default: "",
        displayOptions: { show: { resource: ["note"], operation: ["delete"] } },
      },

      // ----------------------------------------------------------------
      // Fields: Send message
      // ----------------------------------------------------------------
      {
        displayName: "Text",
        name: "messageBody",
        type: "string",
        required: true,
        typeOptions: { rows: 4 },
        default: "",
        displayOptions: {
          show: { resource: ["message"], operation: ["send"] },
        },
        description: "The message text",
      },
      {
        displayName: "Subject",
        name: "emailSubject",
        type: "string",
        default: "",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendEmail"] },
        },
        description: "Subject of the email (optional)",
      },
      {
        displayName: "HTML Content",
        name: "emailBody",
        type: "string",
        required: true,
        typeOptions: { rows: 6 },
        default: "",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendEmail"] },
        },
        description: "The email content as HTML",
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter("resource", i) as string;
        const operation = this.getNodeParameter("operation", i) as string;
        let responseData: IDataObject | IDataObject[] = {};

        if (resource === "contact") {
          if (operation === "create") {
            const fields = this.getNodeParameter(
              "contactFields",
              i,
              {},
            ) as IDataObject;
            const body: IDataObject = {};
            for (const key of [
              "name",
              "email",
              "phone",
              "external_id",
            ] as const) {
              const value = fields[key];
              if (typeof value === "string" && value.trim() !== "")
                body[key] = value.trim();
            }
            if (fields.attributes !== undefined && fields.attributes !== "") {
              body.attributes = parseJsonParam.call(
                this,
                fields.attributes,
                "Attributes",
                i,
              );
            }
            responseData = await ticketZeroApiRequest.call(
              this,
              "POST",
              "/v1/api-public/contacts",
              body,
            );
          } else if (operation === "get") {
            const contactId = this.getNodeParameter("contactId", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "GET",
              `/v1/api-public/contacts/${encodeURIComponent(contactId)}`,
            );
          } else if (operation === "getAll") {
            const returnAll = this.getNodeParameter("returnAll", i) as boolean;
            const filters = this.getNodeParameter(
              "contactFilters",
              i,
              {},
            ) as IDataObject;
            const qs: IDataObject = {};
            if (
              typeof filters.email === "string" &&
              filters.email.trim() !== ""
            ) {
              qs.email = filters.email.trim();
            }
            if (returnAll) {
              responseData = await ticketZeroApiRequestAllItems.call(
                this,
                "GET",
                "/v1/api-public/contacts",
                qs,
              );
            } else {
              qs.limit = this.getNodeParameter("limit", i) as number;
              const resp = await ticketZeroApiRequest.call(
                this,
                "GET",
                "/v1/api-public/contacts",
                {},
                qs,
              );
              responseData = (resp?.data as IDataObject[]) ?? [];
            }
          } else if (operation === "update") {
            const contactId = this.getNodeParameter("contactId", i) as string;
            const fields = this.getNodeParameter(
              "contactUpdateFields",
              i,
              {},
            ) as IDataObject;
            const body: IDataObject = {};
            for (const key of [
              "name",
              "email",
              "phone",
              "consent_status",
            ] as const) {
              const value = fields[key];
              if (typeof value === "string" && value.trim() !== "")
                body[key] = value.trim();
            }
            if (fields.attributes !== undefined && fields.attributes !== "") {
              body.attributes = parseJsonParam.call(
                this,
                fields.attributes,
                "Attributes",
                i,
              );
            }
            responseData = await ticketZeroApiRequest.call(
              this,
              "PATCH",
              `/v1/api-public/contacts/${encodeURIComponent(contactId)}`,
              body,
            );
          } else if (operation === "delete") {
            const contactId = this.getNodeParameter("contactId", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "DELETE",
              `/v1/api-public/contacts/${encodeURIComponent(contactId)}`,
            );
          }
        } else if (resource === "contactList") {
          if (operation === "getAll") {
            const resp = await ticketZeroApiRequest.call(
              this,
              "GET",
              "/v1/api-public/contact-lists",
            );
            responseData = (resp?.data as IDataObject[]) ?? [];
          } else if (operation === "addMember") {
            const listId = this.getNodeParameter("listId", i) as string;
            const memberContactId = this.getNodeParameter(
              "memberContactId",
              i,
            ) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "POST",
              `/v1/api-public/contact-lists/${encodeURIComponent(listId)}/members`,
              { contact_id: memberContactId },
            );
          } else if (operation === "removeMember") {
            const listId = this.getNodeParameter("listId", i) as string;
            const memberContactId = this.getNodeParameter(
              "memberContactId",
              i,
            ) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "DELETE",
              `/v1/api-public/contact-lists/${encodeURIComponent(listId)}/members/${encodeURIComponent(
                memberContactId,
              )}`,
            );
          }
        } else if (resource === "conversation") {
          const conversationId =
            operation === "getAll"
              ? ""
              : (this.getNodeParameter("conversationId", i) as string);
          const convPath = `/v1/api-public/conversations/${encodeURIComponent(conversationId)}`;

          if (operation === "get") {
            responseData = await ticketZeroApiRequest.call(
              this,
              "GET",
              convPath,
            );
          } else if (operation === "getAll") {
            const returnAll = this.getNodeParameter("returnAll", i) as boolean;
            const filters = this.getNodeParameter(
              "conversationFilters",
              i,
              {},
            ) as IDataObject;
            const qs: IDataObject = {};
            if (filters.status) qs.status = filters.status;
            if (
              typeof filters.inbox_id === "string" &&
              filters.inbox_id.trim() !== ""
            ) {
              qs.inbox_id = filters.inbox_id.trim();
            }
            if (
              typeof filters.contact_id === "string" &&
              filters.contact_id.trim() !== ""
            ) {
              qs.contact_id = filters.contact_id.trim();
            }
            if (returnAll) {
              responseData = await ticketZeroApiRequestAllItems.call(
                this,
                "GET",
                "/v1/api-public/conversations",
                qs,
              );
            } else {
              qs.limit = this.getNodeParameter("limit", i) as number;
              const resp = await ticketZeroApiRequest.call(
                this,
                "GET",
                "/v1/api-public/conversations",
                {},
                qs,
              );
              responseData = (resp?.data as IDataObject[]) ?? [];
            }
          } else if (operation === "setStatus") {
            const status = this.getNodeParameter("status", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "PATCH",
              convPath,
              { status },
            );
          } else if (operation === "assign") {
            const assigneeUserId = (
              this.getNodeParameter("assigneeUserId", i) as string
            ).trim();
            responseData = await ticketZeroApiRequest.call(
              this,
              "PATCH",
              convPath,
              {
                assignee_user_id: assigneeUserId === "" ? null : assigneeUserId,
              },
            );
          } else if (operation === "addTag") {
            const tag = this.getNodeParameter("tag", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "PATCH",
              convPath,
              {
                add_tag: tag,
              },
            );
          } else if (operation === "removeTag") {
            const tag = this.getNodeParameter("tag", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "PATCH",
              convPath,
              {
                remove_tag: tag,
              },
            );
          } else if (operation === "delete") {
            responseData = await ticketZeroApiRequest.call(
              this,
              "DELETE",
              convPath,
            );
          }
        } else if (resource === "note") {
          const noteConversationId = this.getNodeParameter(
            "noteConversationId",
            i,
          ) as string;
          const notesBase = `/v1/api-public/conversations/${encodeURIComponent(
            noteConversationId,
          )}/notes`;
          if (operation === "add") {
            const noteBody = this.getNodeParameter("noteBody", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "POST",
              notesBase,
              {
                body: noteBody,
              },
            );
          } else if (operation === "getAll") {
            const resp = await ticketZeroApiRequest.call(
              this,
              "GET",
              notesBase,
            );
            responseData = (resp?.data as IDataObject[]) ?? [];
          } else if (operation === "delete") {
            const noteId = this.getNodeParameter("noteId", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "DELETE",
              `${notesBase}/${encodeURIComponent(noteId)}`,
            );
          }
        } else if (resource === "workspace") {
          if (operation === "get") {
            responseData = await ticketZeroApiRequest.call(
              this,
              "GET",
              "/v1/api-public/me",
            );
          }
        } else if (resource === "message") {
          if (operation === "send") {
            const conversationId = this.getNodeParameter(
              "conversationId",
              i,
            ) as string;
            const messageBody = this.getNodeParameter(
              "messageBody",
              i,
            ) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "POST",
              `/v1/api-public/conversations/${encodeURIComponent(conversationId)}/messages`,
              { body: messageBody },
            );
          } else if (operation === "sendEmail") {
            const conversationId = this.getNodeParameter(
              "conversationId",
              i,
            ) as string;
            const emailBody = this.getNodeParameter("emailBody", i) as string;
            const subject = (
              this.getNodeParameter("emailSubject", i, "") as string
            ).trim();
            const reqBody: IDataObject = {
              body: emailBody,
              content_type: "email_html",
            };
            if (subject !== "") reqBody.subject = subject;
            responseData = await ticketZeroApiRequest.call(
              this,
              "POST",
              `/v1/api-public/conversations/${encodeURIComponent(conversationId)}/messages`,
              reqBody,
            );
          }
        } else if (resource === "file") {
          if (operation === "getAll") {
            const folderId = (
              this.getNodeParameter("fileFolderId", i, "") as string
            ).trim();
            const qs: IDataObject = {};
            if (folderId !== "") qs.folder_id = folderId;
            responseData = await ticketZeroApiRequest.call(
              this,
              "GET",
              "/v1/api-public/files",
              {},
              qs,
            );
          } else if (operation === "download") {
            const fileId = this.getNodeParameter("fileId", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "GET",
              `/v1/api-public/files/${encodeURIComponent(fileId)}/download`,
            );
          } else if (operation === "delete") {
            const fileId = this.getNodeParameter("fileId", i) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "DELETE",
              `/v1/api-public/files/${encodeURIComponent(fileId)}`,
            );
          } else if (operation === "upload") {
            const binaryPropertyName = this.getNodeParameter(
              "binaryPropertyName",
              i,
            ) as string;
            const fields = this.getNodeParameter(
              "fileUploadFields",
              i,
              {},
            ) as IDataObject;
            const binaryData = this.helpers.assertBinaryData(
              i,
              binaryPropertyName,
            );
            const buffer = await this.helpers.getBinaryDataBuffer(
              i,
              binaryPropertyName,
            );
            const nameOverride =
              typeof fields.name === "string" && fields.name.trim() !== ""
                ? fields.name.trim()
                : "";
            const fileName = nameOverride || binaryData.fileName || "file";

            const credentials = await this.getCredentials("ticketZeroApi");
            const baseUrl = String(
              credentials.baseUrl || "https://ticketzero.de",
            ).replace(/\/+$/, "");
            const formData = new FormData();
            formData.append(
              "file",
              new Blob([buffer], {
                type: binaryData.mimeType || "application/octet-stream",
              }),
              fileName,
            );
            if (nameOverride !== "") formData.append("name", nameOverride);
            if (
              typeof fields.folder_id === "string" &&
              fields.folder_id.trim() !== ""
            ) {
              formData.append("folder_id", fields.folder_id.trim());
            }
            responseData =
              await this.helpers.httpRequestWithAuthentication.call(
                this,
                "ticketZeroApi",
                {
                  method: "POST",
                  url: `${baseUrl}/v1/api-public/files/upload`,
                  body: formData,
                },
              );
          }
        } else if (resource === "automation") {
          if (operation === "trigger") {
            const baseUrl = (
              this.getNodeParameter("baseUrl", i) as string
            ).replace(/\/+$/, "");
            const token = (
              this.getNodeParameter("webhookToken", i) as string
            ).trim();
            if (!/^[a-f0-9]{32,128}$/i.test(token)) {
              throw new NodeOperationError(
                this.getNode(),
                "Webhook token must be 32–128 hex characters",
                { itemIndex: i },
              );
            }
            const secret = (
              this.getNodeParameter("signingSecret", i, "") as string
            ).trim();
            const rawPayload = this.getNodeParameter(
              "payload",
              i,
              {},
            ) as unknown;
            const payloadObj = parseJsonParam.call(
              this,
              rawPayload,
              "Payload",
              i,
            );
            const rawBody = JSON.stringify(payloadObj);
            responseData = await triggerAutomation.call(
              this,
              baseUrl,
              token,
              secret,
              rawBody,
            );
          }
        }

        const executionData = this.helpers.constructExecutionMetaData(
          this.helpers.returnJsonArray(
            responseData as IDataObject | IDataObject[],
          ),
          { itemData: { item: i } },
        );
        returnData.push(...executionData);
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeApiError(this.getNode(), error as JsonObject);
      }
    }

    return [returnData];
  }
}

/**
 * Triggers a TicketZero automation via its public webhook token.
 *
 * We sign and send exactly the same byte sequence that we POST (the endpoint
 * verifies against the raw body), so we serialize the payload ourselves and
 * send it as a string. No API key is used — the token is the authorization.
 */
async function triggerAutomation(
  this: IExecuteFunctions,
  baseUrl: string,
  token: string,
  secret: string,
  rawBody: string,
): Promise<IDataObject> {
  const headers: IDataObject = { "Content-Type": "application/json" };
  if (secret !== "") {
    headers["X-SG-Signature"] = `sha256=${createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")}`;
  }

  const options: IHttpRequestOptions = {
    method: "POST",
    url: `${baseUrl}/v1/public/automations/${token}/trigger`,
    headers,
    body: rawBody,
    json: false,
  };
  const response = await this.helpers.httpRequest(options);

  if (response && typeof response === "object") {
    return response as IDataObject;
  }
  try {
    return JSON.parse(String(response)) as IDataObject;
  } catch {
    return { response: String(response) };
  }
}

/** Parses a JSON string/object parameter or throws a clear node error. */
function parseJsonParam(
  this: IExecuteFunctions,
  value: unknown,
  label: string,
  itemIndex: number,
): IDataObject {
  if (value && typeof value === "object") return value as IDataObject;
  try {
    return JSON.parse(String(value)) as IDataObject;
  } catch {
    throw new NodeOperationError(this.getNode(), `${label} is not valid JSON`, {
      itemIndex,
    });
  }
}
