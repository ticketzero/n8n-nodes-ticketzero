import type {
  IDataObject,
  IExecuteFunctions,
  IHookFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  ILoadOptionsFunctions,
  IWebhookFunctions,
} from 'n8n-workflow';

type TicketZeroContext =
  | IExecuteFunctions
  | ILoadOptionsFunctions
  | IHookFunctions
  | IWebhookFunctions;

/**
 * A single authenticated request against the TicketZero public API.
 * The base URL comes from the credential; the bearer token is set by
 * `httpRequestWithAuthentication` from the `authenticate` block.
 */
export async function ticketZeroApiRequest(
  this: TicketZeroContext,
  method: IHttpRequestMethods,
  endpoint: string,
  body: IDataObject = {},
  qs: IDataObject = {},
): Promise<IDataObject> {
  const credentials = await this.getCredentials('ticketZeroApi');
  const baseUrl = String(credentials.baseUrl || 'https://ticketzero.de').replace(/\/+$/, '');

  const options: IHttpRequestOptions = {
    method,
    url: `${baseUrl}${endpoint}`,
    body,
    qs,
    json: true,
  };
  if (Object.keys(body).length === 0) delete options.body;
  if (Object.keys(qs).length === 0) delete options.qs;

  return this.helpers.httpRequestWithAuthentication.call(this, 'ticketZeroApi', options);
}

/**
 * Walks a cursor-paginated list (`{ data, next_cursor }`) to completion.
 * TicketZero paginates via `?cursor=<iso8601>`; we follow `next_cursor` until
 * it is null. Limit per page = 100 (API hard cap).
 */
export async function ticketZeroApiRequestAllItems(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: IHttpRequestMethods,
  endpoint: string,
  qs: IDataObject = {},
): Promise<IDataObject[]> {
  const returnData: IDataObject[] = [];
  let cursor: string | undefined;

  do {
    const query: IDataObject = { ...qs, limit: 100 };
    if (cursor) query.cursor = cursor;
    const responseData = await ticketZeroApiRequest.call(this, method, endpoint, {}, query);
    const items = (responseData?.data as IDataObject[]) ?? [];
    returnData.push(...items);
    cursor = (responseData?.next_cursor as string | undefined) ?? undefined;
  } while (cursor);

  return returnData;
}
