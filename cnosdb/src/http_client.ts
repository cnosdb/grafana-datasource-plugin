import axios, {
  AxiosInstance,
  AxiosInterceptorManager,
  AxiosRequestConfig,
  AxiosResponse,
  CancelToken,
  CancelTokenSource,
} from 'axios';
import { defer, map, Observable } from 'rxjs';

export const AXIOS_SYSTEM_ERROR_CODE = [
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ECONNRESET',
  'ECONNABORTED',
  'EHOSTDOWN',
  'ENETDOWN',
  'ENETRESET',
  'ENETUNREACH',
  'ETIMEDOUT',
];

export type PlainObject = {
  [key: string]:
    | string
    | string[]
    | number
    | number[]
    | boolean
    | boolean[]
    | PlainObject
    | PlainObject[]
    | null
    | undefined;
};

export type BodyData = string | PlainObject | ArrayBuffer | ArrayBufferView | URLSearchParams | FormData | File | Blob;

export type HttpParameter = PlainObject | URLSearchParams;

export type HttpHeader = {
  user_id: '123';
};

/**
 * The Axios interceptors configuration
 */
export type Interceptors = {
  request: AxiosInterceptorManager<AxiosRequestConfig>;
  response: AxiosInterceptorManager<AxiosResponse<any>>;
};

/**
 * The common HTTP client service class implements the Observer pattern to handle Restful request
 * @example
 *
 * import { HttpClient } from 'path/to/http-client'
 *
 * const client = new HttpClient();
 *
 * // GET request
 * client.get('/foo', { id: 1 })
 *  .subscribe(data => console.log('data', data));
 */
class HttpClient {
  private readonly service: AxiosInstance;

  /**
   * Create a new HttpClient instance with default configuration to call Restful Service
   */
  constructor() {
    this.service = axios.create({
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      maxContentLength: Infinity,
      httpsAgent: Infinity,
      withCredentials: false,
      timeout: 1200,
      baseURL: 'http://localhost:8086',
      responseType: 'json',
    });

    this.service.interceptors.response.use(
      (r) => r,
      async (error) => {
        if (AXIOS_SYSTEM_ERROR_CODE.includes(error.errno)) {
          console.log('Response has AXIOS_SYSTEM_ERROR_CODE', error);
        } else {
          // if (error.response.status === 401) {
          //     localStorage.removeItem('IC_SRV_AUTHORIZATION_TOKEN');
          //     window.location.replace('/login')
          // }
          console.log('Other errors', error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all interceptors of current Axios instance
   */
  get interceptors(): Interceptors {
    return this.service.interceptors;
  }

  /**
   * Create a cancellation token source
   * @returns The cancellation token source
   */
  getCancelTokenSource(): CancelTokenSource {
    return axios.CancelToken.source();
  }

  /**
   * Performs `GET` JSON request. This methods is shorthand for `axios.get(url, { headers: {'content-type': 'application/json', responseType: 'json' }})`
   * @param path is the server resource path that will be used for the request
   * @param queryParams are the URL parameters / query string to be sent with the request. Must be a `plain object` or a `URLSearchParams` object
   * @param cancelToken is Cancellation token to cancelling the request
   * @returns An `Observable` of Axios GET request instance with response type force to `JSON`
   */
  getJSON<T = any>(path: string, queryParams?: HttpParameter, cancelToken?: CancelToken): Observable<T> {
    return this.createDeferredObservable(
      this.service.get<T>(path, {
        params: queryParams,
        headers: { 'content-type': 'application/json' },
        responseType: 'json',
        cancelToken,
      })
    );
  }

  /**
   * Performs `GET` request
   * @param path is the server resource path that will be used for the request
   * @param queryParams are the URL parameters / query string to be sent with the request. Must be a plain object or a `URLSearchParams` object
   * @param headers are custom headers to be sent
   * @param cancelToken is Cancellation token to cancelling the request
   * @returns An `Observable` of Axios GET request instance
   */
  get<T = any>(
    path: string,
    queryParams?: HttpParameter,
    headers?: HttpHeader,
    cancelToken?: CancelToken
  ): Observable<T> {
    return this.createDeferredObservable(
      this.service.get<T>(path, {
        params: queryParams,
        headers: headers,
        cancelToken,
      })
    );
  }

  /**
   * Performs `POST` request
   * @param path is the server resource path that will be used for the request
   * @param body is the request method to be used when making the request
   * @param queryParams are the URL parameters / query string to be sent with the request. Must be a `plain object` or a `URLSearchParams` object
   * @param headers are custom headers to be sent
   * @param cancelToken is Cancellation token to cancelling the request
   * @returns An `Observable` of Axios POST request instance
   */
  post<T = any>(
    path: string,
    body: BodyData,
    queryParams?: HttpParameter,
    headers?: HttpHeader,
    cancelToken?: CancelToken
  ): Observable<T> {
    return this.createDeferredObservable(
      this.service.post<T>(path, body, {
        params: queryParams,
        headers: headers,
        cancelToken,
      })
    );
  }

  /**
   * Performs `PUT` request
   * @param path is the server resource path that will be used for the request
   * @param body is the request method to be used when making the request
   * @param queryParams are the URL parameters / query string to be sent with the request. Must be a `plain object` or a `URLSearchParams` object
   * @param headers are custom headers to be sent
   * @param cancelToken is Cancellation token to cancelling the request
   * @returns An `Observable` of Axios PUT request instance
   */
  put<T = any>(
    path: string,
    body: BodyData,
    queryParams?: HttpParameter,
    headers?: HttpHeader,
    cancelToken?: CancelToken
  ): Observable<T> {
    return this.createDeferredObservable(
      this.service.put<T>(path, body, {
        headers: headers,
        params: queryParams,
        cancelToken,
      })
    );
  }

  /**
   * Performs `DELETE` request
   * @param path is the server resource path that will be used for the request
   * @param queryParams are the URL parameters / query string to be sent with the request. Must be a `plain object` or a `URLSearchParams` object
   * @param headers are custom headers to be sent
   * @param cancelToken is cancellation token to cancelling the request
   * @returns An `Observable` of Axios DELETE request instance
   */
  delete<T = any>(
    path: string,
    queryParams?: HttpParameter,
    headers?: HttpHeader,
    cancelToken?: CancelToken
  ): Observable<T> {
    return this.createDeferredObservable(
      this.service.delete<T>(path, {
        params: queryParams,
        headers: headers,
        cancelToken,
      })
    );
  }

  /**
   * Perfoms a custom Axios request
   * @param config An AxiosRequestConfig
   * @returns An `Observable` of Axios request instance
   */
  request<T = any>(config: AxiosRequestConfig): Observable<T> {
    return this.createDeferredObservable(this.service.request<T>(config));
  }

  /**
   * Create a deferred observable from Axios request
   * @param axiosRequest The Axios request
   * @returns A deferred `Observable` from the Axios request
   */
  private createDeferredObservable<T>(axiosRequest: Promise<AxiosResponse<T>>): Observable<T> {
    return defer(() => axiosRequest).pipe(map((r) => r.data));
  }
}

const httpClient = new HttpClient();

// Export default instance of HttpClient as default
export default httpClient;

// Export HttpClient class, support for typing and create another instance
export { HttpClient };
