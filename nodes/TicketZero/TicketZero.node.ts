import { createHmac } from "crypto";

import {
  NodeApiError,
  NodeConnectionTypes,
  NodeOperationError,
  type IDataObject,
  type IExecuteFunctions,
  type IHttpRequestOptions,
  type ILoadOptionsFunctions,
  type INodeExecutionData,
  type INodeListSearchResult,
  type INodePropertyOptions,
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
      "Manage contacts, conversations, messages, notes, files and automations in TicketZero, the GDPR-native all-in-one customer messaging and helpdesk platform.",
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
        displayName: "File",
        name: "fileId",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
        displayOptions: {
          show: { resource: ["file"], operation: ["download", "delete"] },
        },
        modes: [
          {
            displayName: "From list",
            name: "list",
            type: "list",
            placeholder: "Select a file...",
            typeOptions: {
              searchListMethod: "searchFiles",
              searchable: true,
            },
          },
          {
            displayName: "By ID",
            name: "id",
            type: "string",
            placeholder: "e.g. fl_1234567890",
          },
        ],
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
            displayName: "Folder Name or ID",
            name: "folder_id",
            type: "options",
            default: "",
            typeOptions: { loadOptionsMethod: "getFolders" },
            description:
              'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
          },
        ],
      },
      {
        displayName: "Folder Name or ID",
        name: "fileFolderId",
        type: "options",
        default: "",
        typeOptions: { loadOptionsMethod: "getFolders" },
        displayOptions: { show: { resource: ["file"], operation: ["getAll"] } },
        description:
          'Only contents of this folder (empty = root). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
      // Fields: Contact standard fields (create / update)
      // ----------------------------------------------------------------
      {
        displayName: "Name",
        name: "name",
        type: "string",
        default: "",
        displayOptions: {
          show: { resource: ["contact"], operation: ["create", "update"] },
        },
      },
      {
        displayName: "Email",
        name: "email",
        type: "string",
        placeholder: "name@example.com",
        default: "",
        displayOptions: {
          show: { resource: ["contact"], operation: ["create", "update"] },
        },
      },
      {
        displayName: "Phone (E.164)",
        name: "phone",
        type: "string",
        placeholder: "+491701234567",
        default: "",
        displayOptions: {
          show: { resource: ["contact"], operation: ["create", "update"] },
        },
        description: "Must be in E.164 format, e.g. +491701234567",
      },
      {
        displayName: "Attributes",
        name: "attributesUi",
        type: "fixedCollection",
        placeholder: "Add Attribute",
        default: {},
        typeOptions: { multipleValues: true },
        displayOptions: {
          show: { resource: ["contact"], operation: ["create", "update"] },
        },
        description: "Custom attributes defined in your workspace",
        options: [
          {
            displayName: "Attribute",
            name: "attribute",
            values: [
              {
                displayName: "Attribute Name or ID",
                name: "attribute",
                type: "options",
                default: "",
                typeOptions: { loadOptionsMethod: "getContactAttributes" },
                description:
                  'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
              },
              {
                displayName: "Value",
                name: "value",
                type: "string",
                default: "",
              },
            ],
          },
        ],
      },
      {
        displayName: "Attributes (JSON)",
        name: "attributesJson",
        type: "json",
        default: "{}",
        displayOptions: {
          show: { resource: ["contact"], operation: ["create", "update"] },
        },
        description:
          "Advanced: ad-hoc attributes as a JSON object for keys not in the attribute definitions. A value of null removes the attribute. UI attributes above win on conflict.",
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
            displayName: "External ID",
            name: "external_id",
            type: "string",
            default: "",
            description:
              "Your own contact ID (for dedup / matching with your CRM)",
          },
        ],
      },

      // ----------------------------------------------------------------
      // Fields: Get contact
      // ----------------------------------------------------------------
      {
        displayName: "Contact",
        name: "contactId",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["get", "update", "delete"],
          },
        },
        modes: [
          {
            displayName: "From list",
            name: "list",
            type: "list",
            placeholder: "Select a contact...",
            typeOptions: {
              searchListMethod: "searchContacts",
              searchable: true,
            },
          },
          {
            displayName: "By ID",
            name: "id",
            type: "string",
            placeholder: "e.g. ct_1234567890",
          },
        ],
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
        ],
      },

      // ----------------------------------------------------------------
      // Fields: Contact list (add / remove member)
      // ----------------------------------------------------------------
      {
        displayName: "List Name or ID",
        name: "listId",
        type: "options",
        required: true,
        default: "",
        typeOptions: { loadOptionsMethod: "getContactLists" },
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        displayOptions: {
          show: {
            resource: ["contactList"],
            operation: ["addMember", "removeMember"],
          },
        },
      },
      {
        displayName: "Contact",
        name: "memberContactId",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
        displayOptions: {
          show: {
            resource: ["contactList"],
            operation: ["addMember", "removeMember"],
          },
        },
        modes: [
          {
            displayName: "From list",
            name: "list",
            type: "list",
            placeholder: "Select a contact...",
            typeOptions: {
              searchListMethod: "searchContacts",
              searchable: true,
            },
          },
          {
            displayName: "By ID",
            name: "id",
            type: "string",
            placeholder: "e.g. ct_1234567890",
          },
        ],
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
        displayName: "Conversation",
        name: "conversationId",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
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
        modes: [
          {
            displayName: "From list",
            name: "list",
            type: "list",
            placeholder: "Select a conversation...",
            typeOptions: {
              searchListMethod: "searchConversations",
              searchable: true,
            },
          },
          {
            displayName: "By ID",
            name: "id",
            type: "string",
            placeholder: "e.g. cv_1234567890",
          },
        ],
      },
      {
        displayName: "Conversation",
        name: "conversationId",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
        displayOptions: {
          show: { resource: ["message"], operation: ["send", "sendEmail"] },
        },
        modes: [
          {
            displayName: "From list",
            name: "list",
            type: "list",
            placeholder: "Select a conversation...",
            typeOptions: {
              searchListMethod: "searchConversations",
              searchable: true,
            },
          },
          {
            displayName: "By ID",
            name: "id",
            type: "string",
            placeholder: "e.g. cv_1234567890",
          },
        ],
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
            displayName: "Contact",
            name: "contact_id",
            type: "resourceLocator",
            default: { mode: "list", value: "" },
            description:
              "Only conversations of this contact (get many conversations of a contact)",
            modes: [
              {
                displayName: "From list",
                name: "list",
                type: "list",
                placeholder: "Select a contact...",
                typeOptions: {
                  searchListMethod: "searchContacts",
                  searchable: true,
                },
              },
              {
                displayName: "By ID",
                name: "id",
                type: "string",
                placeholder: "e.g. ct_1234567890",
              },
            ],
          },
          {
            displayName: "Inbox Name or ID",
            name: "inbox_id",
            type: "options",
            default: "",
            typeOptions: { loadOptionsMethod: "getInboxes" },
            description:
              'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
        displayName: "Assignee Name or ID",
        name: "assigneeUserId",
        type: "options",
        default: "",
        typeOptions: { loadOptionsMethod: "getMembers" },
        displayOptions: {
          show: { resource: ["conversation"], operation: ["assign"] },
        },
        description:
          'Leave empty to remove the assignment. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },

      // ----------------------------------------------------------------
      // Fields: Add / remove tag
      // ----------------------------------------------------------------
      {
        displayName: "Tag Name or ID",
        name: "tag",
        type: "options",
        required: true,
        default: "",
        typeOptions: { loadOptionsMethod: "getTags" },
        displayOptions: {
          show: {
            resource: ["conversation"],
            operation: ["addTag", "removeTag"],
          },
        },
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      },

      // ----------------------------------------------------------------
      // Fields: Note (resource)
      // ----------------------------------------------------------------
      {
        displayName: "Conversation",
        name: "noteConversationId",
        type: "resourceLocator",
        default: { mode: "list", value: "" },
        required: true,
        displayOptions: { show: { resource: ["note"] } },
        modes: [
          {
            displayName: "From list",
            name: "list",
            type: "list",
            placeholder: "Select a conversation...",
            typeOptions: {
              searchListMethod: "searchConversations",
              searchable: true,
            },
          },
          {
            displayName: "By ID",
            name: "id",
            type: "string",
            placeholder: "e.g. cv_1234567890",
          },
        ],
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
        displayName: "Note Name or ID",
        name: "noteId",
        type: "options",
        required: true,
        default: "",
        typeOptions: {
          loadOptionsMethod: "getNotes",
          loadOptionsDependsOn: ["noteConversationId"],
        },
        description:
          'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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

  methods = {
    loadOptions: {
      async getContactLists(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/contact-lists",
        );
        const data = (resp?.data as IDataObject[]) ?? [];
        return data.map((l) => ({
          name: String(l.name ?? l.id),
          value: String(l.id),
        }));
      },
      async getTags(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/tags",
        );
        const data = (resp?.data as IDataObject[]) ?? [];
        return data.map((t) => ({
          name: String(t.label ?? t.name),
          value: String(t.name),
        }));
      },
      async getMembers(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/members",
        );
        const data = (resp?.data as IDataObject[]) ?? [];
        return [
          { name: "None (Unassign)", value: "" },
          ...data.map((m) => ({
            name: m.email
              ? `${String(m.display_name)} (${String(m.email)})`
              : String(m.display_name ?? m.user_id),
            value: String(m.user_id),
          })),
        ];
      },
      async getInboxes(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/inboxes",
        );
        const data = (resp?.data as IDataObject[]) ?? [];
        return data.map((x) => ({
          name: x.is_default ? `${String(x.name)} (Standard)` : String(x.name),
          value: String(x.id),
        }));
      },
      async getContactAttributes(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/contact-attribute-definitions",
        );
        const data = (resp?.data as IDataObject[]) ?? [];
        return data.map((a) => ({
          name: String(a.label ?? a.key),
          value: String(a.key),
        }));
      },
      async getFolders(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/files",
        );
        const folders = (resp?.folders as IDataObject[]) ?? [];
        return [
          { name: "(Root)", value: "" },
          ...folders.map((f) => ({
            name: String(f.name ?? f.id),
            value: String(f.id),
          })),
        ];
      },
      async getNotes(
        this: ILoadOptionsFunctions,
      ): Promise<INodePropertyOptions[]> {
        const conversationId = String(
          this.getCurrentNodeParameter("noteConversationId", {
            extractValue: true,
          }) ?? "",
        ).trim();
        if (conversationId === "") return [];
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          `/v1/api-public/conversations/${encodeURIComponent(
            conversationId,
          )}/notes`,
        );
        const data = (resp?.data as IDataObject[]) ?? [];
        return data.map((n) => ({
          name: String(n.body ?? "").slice(0, 60) || String(n.id),
          value: String(n.id),
        }));
      },
    },
    listSearch: {
      async searchConversations(
        this: ILoadOptionsFunctions,
        filter?: string,
      ): Promise<INodeListSearchResult> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/conversations",
          {},
          { limit: 50 },
        );
        const data = (resp?.data as IDataObject[]) ?? [];
        let results = data.map((c) => {
          const subject = String(c.subject ?? "").trim();
          const label =
            subject ||
            [
              String(c.channel ?? "Chat"),
              new Date(String(c.created_at)).toLocaleString(),
            ].join(" · ");
          return { name: label, value: String(c.id) };
        });
        if (filter && filter.trim() !== "") {
          const needle = filter.toLowerCase();
          results = results.filter((r) => r.name.toLowerCase().includes(needle));
        }
        return { results };
      },
      async searchContacts(
        this: ILoadOptionsFunctions,
        filter?: string,
      ): Promise<INodeListSearchResult> {
        const trimmed = (filter ?? "").trim();
        let data: IDataObject[];
        if (trimmed !== "" && trimmed.includes("@")) {
          const resp = await ticketZeroApiRequest.call(
            this,
            "GET",
            "/v1/api-public/contacts",
            {},
            { email: trimmed },
          );
          data = (resp?.data as IDataObject[]) ?? [];
        } else {
          const resp = await ticketZeroApiRequest.call(
            this,
            "GET",
            "/v1/api-public/contacts",
            {},
            { limit: 50 },
          );
          data = (resp?.data as IDataObject[]) ?? [];
          if (trimmed !== "") {
            const needle = trimmed.toLowerCase();
            data = data.filter(
              (c) =>
                String(c.name ?? "")
                  .toLowerCase()
                  .includes(needle) ||
                String(c.email ?? "")
                  .toLowerCase()
                  .includes(needle),
            );
          }
        }
        const results = data.map((c) => {
          const label =
            String(c.name ?? "").trim() || String(c.email ?? "") || String(c.id);
          return { name: label, value: String(c.id) };
        });
        return { results };
      },
      async searchFiles(
        this: ILoadOptionsFunctions,
        filter?: string,
      ): Promise<INodeListSearchResult> {
        const resp = await ticketZeroApiRequest.call(
          this,
          "GET",
          "/v1/api-public/files",
        );
        const files = (resp?.files as IDataObject[]) ?? [];
        let results = files.map((f) => ({
          name: String(f.name ?? f.id),
          value: String(f.id),
        }));
        if (filter && filter.trim() !== "") {
          const needle = filter.toLowerCase();
          results = results.filter((r) => r.name.toLowerCase().includes(needle));
        }
        return { results };
      },
    },
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
            for (const key of ["name", "email", "phone"] as const) {
              const value = this.getNodeParameter(key, i, "") as string;
              if (typeof value === "string" && value.trim() !== "")
                body[key] = value.trim();
            }
            const externalId = fields.external_id;
            if (typeof externalId === "string" && externalId.trim() !== "") {
              body.external_id = externalId.trim();
            }
            const createAttributes = buildContactAttributes.call(this, i);
            if (createAttributes !== undefined) {
              body.attributes = createAttributes;
            }
            responseData = await ticketZeroApiRequest.call(
              this,
              "POST",
              "/v1/api-public/contacts",
              body,
            );
          } else if (operation === "get") {
            const contactId = this.getNodeParameter("contactId", i, "", {
              extractValue: true,
            }) as string;
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
            const contactId = this.getNodeParameter("contactId", i, "", {
              extractValue: true,
            }) as string;
            const fields = this.getNodeParameter(
              "contactUpdateFields",
              i,
              {},
            ) as IDataObject;
            const body: IDataObject = {};
            for (const key of ["name", "email", "phone"] as const) {
              const value = this.getNodeParameter(key, i, "") as string;
              if (typeof value === "string" && value.trim() !== "")
                body[key] = value.trim();
            }
            const consentStatus = fields.consent_status;
            if (
              typeof consentStatus === "string" &&
              consentStatus.trim() !== ""
            ) {
              body.consent_status = consentStatus.trim();
            }
            const updateAttributes = buildContactAttributes.call(this, i);
            if (updateAttributes !== undefined) {
              body.attributes = updateAttributes;
            }
            responseData = await ticketZeroApiRequest.call(
              this,
              "PATCH",
              `/v1/api-public/contacts/${encodeURIComponent(contactId)}`,
              body,
            );
          } else if (operation === "delete") {
            const contactId = this.getNodeParameter("contactId", i, "", {
              extractValue: true,
            }) as string;
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
              "",
              { extractValue: true },
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
              "",
              { extractValue: true },
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
              : (this.getNodeParameter("conversationId", i, "", {
                  extractValue: true,
                }) as string);
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
            const contactIdFilter = rlValue(filters.contact_id).trim();
            if (contactIdFilter !== "") {
              qs.contact_id = contactIdFilter;
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
            "",
            { extractValue: true },
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
              "",
              { extractValue: true },
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
              "",
              { extractValue: true },
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
            const fileId = this.getNodeParameter("fileId", i, "", {
              extractValue: true,
            }) as string;
            responseData = await ticketZeroApiRequest.call(
              this,
              "GET",
              `/v1/api-public/files/${encodeURIComponent(fileId)}/download`,
            );
          } else if (operation === "delete") {
            const fileId = this.getNodeParameter("fileId", i, "", {
              extractValue: true,
            }) as string;
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

/**
 * Reads the string value out of a resourceLocator parameter value.
 * When the value is an object (`{ mode, value }`) it returns `.value`,
 * otherwise it coerces the raw value to a string.
 */
function rlValue(v: unknown): string {
  if (v && typeof v === "object") {
    const val = (v as IDataObject).value;
    return typeof val === "string" ? val : String(val ?? "");
  }
  return String(v ?? "");
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

/**
 * Builds the contact `attributes` object from the `attributesUi` fixedCollection
 * and the advanced `attributesJson` field. UI key/value pairs win on conflict.
 * Returns `undefined` when no attributes were provided.
 */
function buildContactAttributes(
  this: IExecuteFunctions,
  itemIndex: number,
): IDataObject | undefined {
  const result: IDataObject = {};

  const jsonRaw = this.getNodeParameter(
    "attributesJson",
    itemIndex,
    "",
  ) as unknown;
  if (jsonRaw !== undefined && jsonRaw !== "" && jsonRaw !== "{}") {
    const parsed = parseJsonParam.call(
      this,
      jsonRaw,
      "Attributes (JSON)",
      itemIndex,
    );
    Object.assign(result, parsed);
  }

  const ui = this.getNodeParameter(
    "attributesUi",
    itemIndex,
    {},
  ) as IDataObject;
  const pairs = (ui.attribute as IDataObject[]) ?? [];
  for (const pair of pairs) {
    const key = typeof pair.attribute === "string" ? pair.attribute.trim() : "";
    if (key === "") continue;
    result[key] = pair.value ?? "";
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
