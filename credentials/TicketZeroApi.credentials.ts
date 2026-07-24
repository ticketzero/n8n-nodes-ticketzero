import type {
  Icon,
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

/**
 * TicketZero API-key credential.
 *
 * The API key (format `hc_live_…` / `hc_test_…`; older `sg_live_…` keys are
 * also accepted) is sent as `Authorization: Bearer <key>` and unlocks the
 * `/v1/api-public/*` endpoints. The base URL is configurable so local/staging
 * instances (e.g. http://localhost:3001) can be tested.
 */
export class TicketZeroApi implements ICredentialType {
  name = 'ticketZeroApi';

  displayName = 'TicketZero API';

  icon: Icon = 'file:ticketzero.svg';

  documentationUrl = 'https://ticketzero.de';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description:
        'API key from TicketZero (Settings → API Keys). Format hc_live_… (production) or hc_test_… (sandbox).',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://ticketzero.de',
      required: true,
      description:
        'Base URL of the TicketZero API. Production: https://ticketzero.de. For local development: http://localhost:3001.',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  // Connection test when saving the credential: a cheap, side-effect-free list
  // call. 200 = key valid, 401 = invalid.
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v1/api-public/contacts',
      qs: { limit: 1 },
    },
  };
}
