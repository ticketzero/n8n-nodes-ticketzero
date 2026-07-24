import { createHmac } from 'crypto';

import {
  NodeOperationError,
  type IDataObject,
  type IExecuteFunctions,
  type IHttpRequestOptions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Triggers a TicketZero automation from the outside.
 *
 * POST /v1/public/automations/:token/trigger — the token comes from an
 * automation with the trigger "Webhook received". If the automation has a
 * secret, the body is HMAC-SHA256-signed (`X-SG-Signature: sha256=<hex>`).
 *
 * IMPORTANT: We sign and send exactly the same byte sequence (the endpoint
 * verifies against the raw body). That is why we serialize the payload
 * ourselves and send it as a string instead of letting n8n serialize the JSON.
 *
 * This node needs NO API key (the token is the authorization); the base URL is
 * taken from a node parameter.
 */
export class TicketZeroAutomation implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'TicketZero Automation',
    name: 'ticketZeroAutomation',
    icon: 'file:ticketzero.svg',
    group: ['output'],
    version: 1,
    subtitle: '=Trigger automation',
    description: 'Triggers a TicketZero automation via its webhook token',
    defaults: { name: 'TicketZero Automation' },
    usableAsTool: true,
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Base URL',
        name: 'baseUrl',
        type: 'string',
        default: 'https://ticketzero.de',
        required: true,
        description: 'Base URL of the TicketZero API (production: https://ticketzero.de)',
      },
      {
        displayName: 'Webhook Token',
        name: 'webhookToken',
        type: 'string',
        typeOptions: { password: true },
        required: true,
        default: '',
        description:
          'The webhook token of the TicketZero automation (trigger "Webhook received"). 32–128 hex characters.',
      },
      {
        displayName: 'Signing Secret',
        name: 'signingSecret',
        type: 'string',
        typeOptions: { password: true },
        default: '',
        description:
          'Optional. If the automation has a secret, the body is HMAC-SHA256-signed with it. Leave empty if the automation was created without a secret.',
      },
      {
        displayName: 'Payload (JSON)',
        name: 'payload',
        type: 'json',
        default: '{}',
        description: 'Sent as the body and available in the automation as {{webhook.body.&lt;path&gt;}}',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const baseUrl = (this.getNodeParameter('baseUrl', i) as string).replace(/\/+$/, '');
        const token = (this.getNodeParameter('webhookToken', i) as string).trim();
        if (!/^[a-f0-9]{32,128}$/i.test(token)) {
          throw new NodeOperationError(
            this.getNode(),
            'Webhook token must be 32–128 hex characters',
            { itemIndex: i },
          );
        }
        const secret = (this.getNodeParameter('signingSecret', i, '') as string).trim();
        const rawPayload = this.getNodeParameter('payload', i, {}) as unknown;

        const payloadObj =
          rawPayload && typeof rawPayload === 'object'
            ? (rawPayload as IDataObject)
            : (safeParse.call(this, String(rawPayload), i) as IDataObject);
        const rawBody = JSON.stringify(payloadObj);

        const headers: IDataObject = { 'Content-Type': 'application/json' };
        if (secret !== '') {
          headers['X-SG-Signature'] = `sha256=${createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex')}`;
        }

        const options: IHttpRequestOptions = {
          method: 'POST',
          url: `${baseUrl}/v1/public/automations/${token}/trigger`,
          headers,
          body: rawBody,
          json: false,
        };
        const response = await this.helpers.httpRequest(options);

        let parsed: IDataObject;
        if (response && typeof response === 'object') {
          parsed = response as IDataObject;
        } else {
          try {
            parsed = JSON.parse(String(response)) as IDataObject;
          } catch {
            parsed = { response: String(response) };
          }
        }

        returnData.push({ json: parsed, pairedItem: { item: i } });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}

function safeParse(this: IExecuteFunctions, value: string, itemIndex: number): IDataObject {
  try {
    return JSON.parse(value) as IDataObject;
  } catch {
    throw new NodeOperationError(this.getNode(), 'Payload is not valid JSON', { itemIndex });
  }
}
