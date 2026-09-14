import { config, getRedactedToken } from './config.js';

export interface RingApiStatusResponse {
  valid: boolean;
  httpStatus: number;
  statusText: string;
  endpointChecked: string;
  requestId?: string;
  serverHeader?: string;
  redactedToken: string;
  message: string;
  playgroundUrl: string;
}

export interface RingDevice {
  id: string;
  description?: string;
  device_type?: string;
  location_id?: string;
  status?: string;
}

export class RingPartnerClient {
  private baseUrl: string;
  private token: string;

  constructor(token?: string, baseUrl?: string) {
    this.token = (token ?? config.ringAccessToken).trim();
    this.baseUrl = (baseUrl ?? config.ringApiBaseUrl).replace(/\/+$/, '');
  }

  get hasToken(): boolean {
    return this.token.length > 0;
  }

  get redactedToken(): string {
    return getRedactedToken(this.token);
  }

  /**
   * Probes the Ring Partner API endpoint to verify token validity.
   * Proves real round-trip connectivity to Amazon Vision Envoy infrastructure.
   */
  async checkTokenStatus(): Promise<RingApiStatusResponse> {
    const endpoint = `${this.baseUrl}/devices`;
    const playgroundUrl = 'https://developer.amazon.com/ring/console/playground';

    if (!this.hasToken) {
      return {
        valid: false,
        httpStatus: 401,
        statusText: 'Unauthorized',
        endpointChecked: endpoint,
        redactedToken: '(none)',
        message: 'No Ring Playground token set. Obtain a 30-minute sandbox token from the Developers Playground.',
        playgroundUrl
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
          'User-Agent': 'Doorstep-EventDescriptor/1.0 (Hackathon)'
        }
      });

      const requestId = response.headers.get('x-request-id') || response.headers.get('request-id') || undefined;
      const serverHeader = response.headers.get('server') || undefined;

      if (response.status === 200) {
        return {
          valid: true,
          httpStatus: 200,
          statusText: response.statusText,
          endpointChecked: endpoint,
          requestId,
          serverHeader,
          redactedToken: this.redactedToken,
          message: 'Ring Partner API token is valid and authorized.',
          playgroundUrl
        };
      }

      if (response.status === 401) {
        return {
          valid: false,
          httpStatus: 401,
          statusText: 'Unauthorized',
          endpointChecked: endpoint,
          requestId,
          serverHeader,
          redactedToken: this.redactedToken,
          message: 'Ring Playground token has expired or is invalid. Tokens expire after 30 minutes. Generate a new token at the Developers Playground.',
          playgroundUrl
        };
      }

      return {
        valid: false,
        httpStatus: response.status,
        statusText: response.statusText,
        endpointChecked: endpoint,
        requestId,
        serverHeader,
        redactedToken: this.redactedToken,
        message: `Ring API returned HTTP ${response.status} (${response.statusText}).`,
        playgroundUrl
      };
    } catch (err: any) {
      return {
        valid: false,
        httpStatus: 0,
        statusText: 'NetworkError',
        endpointChecked: endpoint,
        redactedToken: this.redactedToken,
        message: `Failed to connect to Ring Partner API: ${err.message}`,
        playgroundUrl
      };
    }
  }

  /**
   * Fetches list of Ring devices
   */
  async getDevices(): Promise<{ devices: RingDevice[]; rawResponse: any }> {
    const endpoint = `${this.baseUrl}/devices`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Ring API error ${response.status} ${response.statusText} fetching devices.`);
    }

    const data = (await response.json()) as any;
    const devices: RingDevice[] = Array.isArray(data?.devices)
      ? data.devices
      : Array.isArray(data)
      ? data
      : [];

    return { devices, rawResponse: data };
  }

  /**
   * Fetches the latest image snapshot for a device.
   * Returns binary buffer of the image (containing server-side watermark).
   */
  async fetchSnapshot(deviceId: string): Promise<Buffer> {
    const endpoint = `${this.baseUrl}/devices/${encodeURIComponent(deviceId)}/snapshots`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'image/jpeg, image/png, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch snapshot for device ${deviceId}: HTTP ${response.status} ${response.statusText}`);
    }

    const arrayBuf = await response.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}
