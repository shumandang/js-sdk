 { AuthMethodType } from "@lit-protocol/constants";
import { BaseProvider } from "@lit-protocol/lit-auth-client";
import { AuthMethod, AuthenticateOptions, BaseProviderOptions, OtpAuthenticateOptions, OtpProviderOptions, OtpVerificationPayload, RelayerRequest, SignInWithOTPParams } from "@lit-protocol/types";
import { parseJWT } from "../utilimports";


export class OtpProvider extends BaseProvider {
  protected override getRelayerRequest(): Promise<RelayerRequest> {
    throw new Error("Method not implemented.");
  }
  private _params: SignInWithOTPParams;
  private _baseUrl: string; // TODO: REMOVE THIS HARD CODED STRING
  private _port: string;
  private _startRoute: string;
  private _checkRoute: string;
  private _verifyRoute: string;
  private _requestId: string = '';

  private _accessToken: string | undefined;

  constructor(
    params: BaseProviderOptions & SignInWithOTPParams,
    config?: OtpProviderOptions
  ) {
    super(params);
    this._params = params;
    this._baseUrl = config?.baseUrl || 'https://auth-api.litgateway.com';
    this._port = config?.port || '443';
    this._startRoute = config?.startRoute || '/api/otp/start';
    this._checkRoute = config?.checkRoute || '/api/otp/check';
    this._verifyRoute = config?.verifyRoute || '/api/otp/verify';
  }

  /**
   * Validates OTP code from {@link sendOtpCode}
   * @param options {T extends AuthenticateOptions} options used in authentication
   * @returns {Promise<AuthMethod>} Auth Method object containing Json Web Token
   */
  public async authenticate<T extends AuthenticateOptions>(
    options?: T
  ): Promise<AuthMethod> {
    if (options) {
      return this.checkOtpCode(
        (options as unknown as OtpAuthenticateOptions).code
      );
    } else {
      throw new Error(
        `Must provide authentication options for OTP check options given are: ${options}`
      );
    }
  }

  /**
   * Constructs a {@link RelayerRequest} from the access token, {@link authenticate} must be called prior.
   * @returns {Promise<RelayerRequest>} Formed request for sending to Relayer Server
   */
  

  /**
   * Starts an otp session for a given email or phone number from the {@link SignInWithOTPParams}
   * @returns {Promise<string>} returns a callback to check status of the verification session if successful
   */
  public async sendOtpCode(): Promise<string> {
    const url = this._buildUrl('start');
    this._requestId =
      this._params.requestId ??
      (Math.random() * 10000 + 1).toString(10).replace('.', '');

    let body: any = {
      otp: this._params.userId,
      request_id: this._requestId,
    };
    body = JSON.stringify(body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'api-key': '67e55044-10b1-426f-9247-bb680e5fe0c8_JsSdk',
      },
      body,
    });

    if (response.status < 200 || response.status >= 400) {
      console.warn('Something wrong with  OTP request', await response.json());
      const err = new Error('Unable to start otp verification');
      throw err;
    }
    let respBody: { status: string; callback: string } = await response.json();

    return respBody.callback;
  }

  /**
   * Validates otp code from {@link sendOtpCode}
   *
   * @param code {string} - OTP code sent to the user, should be retrieved from user input.
   * @returns {Promise<AuthMethod} - Auth method that contains Json Web Token
   */
  private async checkOtpCode(code: string): Promise<AuthMethod> {
    const url = this._buildUrl('check');

    /**
        pub struct OtpCheckRequest {
            pub otp: String,
            pub code: String,
            pub request_id: String,
        }
    */
    let body: any = {
      otp: this._params.userId,
      code,
      request_id: this._requestId,
    };
    body = JSON.stringify(body);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
        'api-key': '67e55044-10b1-426f-9247-bb680e5fe0c8_JsSdk',
      },
      body,
    });

    if (response.status < 200 || response.status >= 400) {
      console.warn('Something wrong with  OTP request', await response.json());
      const err = new Error('unsucessful otp check');
      throw err;
    }

    const respBody: any = await response.json();

    if (!respBody.token_jwt) {
      throw new Error('Invalid otp code, operation was aborted');
    }
    this._accessToken = respBody.token_jwt;

    return {
      accessToken: respBody.token_jwt,
      authMethodType: AuthMethodType.OTP,
    };
  }

  private _buildUrl(route: string): string {
    switch (route) {
      case 'start':
        return `${this._baseUrl}:${this._port}${this._startRoute}`;
      case 'check':
        return `${this._baseUrl}:${this._port}${this._checkRoute}`;

      case `verify`:
        return `${this._baseUrl}:${this._port}${this._verifyRoute}`;
      default:
        return '';
    }
  }

  async #verifyOtpJWT(jwt: string): Promise<OtpVerificationPayload> {
    const res = await fetch(this._buildUrl('verify'), {
      redirect: 'error',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': '67e55044-10b1-426f-9247-bb680e5fe0c8_relayer',
      },
      body: JSON.stringify({
        token: jwt,
      }),
    });
    if (res.status < 200 || res.status >= 400) {
      throw new Error('Error while verifying token on remote endpoint');
    }
    const respBody = await res.json();

    return respBody as OtpVerificationPayload;
  }
}
