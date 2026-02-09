
import CryptoJS from 'crypto-js';
import { classifySourceError, type SourceErrorCode } from './musicSourceErrors';

// Define LX types based on analysis
type LxCallback = (data: unknown, ...args: unknown[]) => Promise<unknown> | unknown;

type LxRequestCallback = (error: unknown, payload?: LxResponsePayload, body?: unknown) => void;
type LxRequestOptions = {
  method?: string;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  data?: BodyInit | null;
  formData?: FormData | Record<string, string>;
};
type LxResponsePayload = {
  body: unknown;
  bodyText: string;
  bodyJSON?: unknown;
  headers: Record<string, string>;
  statusCode: number;
};

type LxByteBuffer = {
  bytes: Uint8Array;
  toString: (encoding?: string) => string;
};

interface LxContext {
  version: string;
  env: string;
  currentScript: string | null;
  currentScriptInfo: {
    name: string;
    description: string;
    version: string;
    author?: string;
    homepage?: string;
    rawScript?: string;
  };
  EVENT_NAMES: {
    updateAlert: string;
  };
  callbacks: Record<string, LxCallback>;
  
  // Core API
  on: (event: string, callback: LxCallback) => void;
  send: (event: string, data: unknown) => void;
  request: (
    url: string,
    options?: LxRequestOptions | LxRequestCallback,
    callback?: LxRequestCallback
  ) => Promise<LxResponsePayload>;
  utils: {
    crypto: {
      md5: (input: string) => string;
      randomBytes: (length: number) => LxByteBuffer;
      aesEncrypt: (text: string, key: string, iv?: string) => string;
      rsaEncrypt: (text: string, publicKey?: string) => string;
    };
    buffer: {
      from: (str: unknown, encoding?: string) => LxByteBuffer;
      bufToString: (buf: unknown, encoding?: string) => string;
    };
  };
}

declare global {
  interface Window {
    lx?: LxContext;
  }
}

class LxPluginAdapter {
  private context: LxContext;
  private isInitialized = false;
  private debug = import.meta.env.DEV;
  private errorHooksInstalled = false;

  private formatLogArg(arg: unknown) {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.stack || arg.message || String(arg);
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }

  private appendToFile(line: string) {
    const api = window.api;
    if (!api?.log?.append) return;
    try {
      const trimmed = line.length > 4000 ? line.slice(0, 4000) + '...[truncated]' : line;
      void api.log.append(trimmed);
    } catch {
      // Ignore file logging failures
    }
  }

  private log(...args: unknown[]) {
    if (this.debug) {
      console.log(...args);
      const line = `[${new Date().toISOString()}] ${args.map((arg) => this.formatLogArg(arg)).join(' ')}`;
      this.appendToFile(line);
    }
  }

  private toHex(bytes: Uint8Array) {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  private toBase64(bytes: Uint8Array) {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  private wrapBytes(bytes: Uint8Array): LxByteBuffer {
    return {
      bytes,
      toString: (encoding: string = 'hex') => {
        const enc = encoding.toLowerCase();
        if (enc === 'hex') return this.toHex(bytes);
        if (enc === 'base64') return this.toBase64(bytes);
        if (enc === 'utf8' || enc === 'utf-8') {
          return new TextDecoder('utf-8').decode(bytes);
        }
        return this.toHex(bytes);
      }
    };
  }

  private decodeHexUrl(raw: string) {
    if (!raw) return raw;
    const match = raw.match(/^([0-9a-fA-F]+)(.*)$/);
    if (!match) return raw;
    const hexPart = match[1];
    const rest = match[2] || '';
    if (hexPart.length < 8 || hexPart.length % 2 !== 0) return raw;
    try {
      const decoded = hexPart
        .match(/.{1,2}/g)
        ?.map((byte) => String.fromCharCode(parseInt(byte, 16)))
        .join('') ?? '';
      if (decoded.startsWith('http')) {
        return decoded + rest;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  private normalizeRequestArgs(url: string, options?: unknown, callback?: unknown) {
    if (typeof options === 'function') {
      return { url, options: {}, callback: options as LxRequestCallback };
    }

    return {
      url,
      options: options && typeof options === 'object' ? options : {},
      callback: typeof callback === 'function' ? (callback as LxRequestCallback) : undefined
    };
  }

  private installErrorHooks() {
    if (this.errorHooksInstalled) return;
    this.errorHooksInstalled = true;

    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }

    window.addEventListener('error', (event) => {
      this.log('[LX][window.error]', event?.message, event?.filename, event?.lineno, event?.colno, event?.error);
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.log('[LX][unhandledrejection]', event?.reason);
    });
  }

  private buildFallbackUrls(sourceUrl: string) {
    const urls: string[] = [];
    const add = (url: string | null) => {
      if (!url) return;
      if (!urls.includes(url)) urls.push(url);
    };

    const ghproxyPrefix = 'https://ghproxy.net/';
    const rawGithubPrefix = 'https://raw.githubusercontent.com/';
    const rawGitmirrorPrefix = 'https://raw.gitmirror.com/';

    add(sourceUrl);

    let normalized = sourceUrl;
    if (normalized.startsWith(ghproxyPrefix)) {
      normalized = normalized.slice(ghproxyPrefix.length);
    }
    if (normalized.startsWith(rawGitmirrorPrefix)) {
      normalized = rawGithubPrefix + normalized.slice(rawGitmirrorPrefix.length);
    }

    if (normalized.startsWith(rawGithubPrefix)) {
      add(`${ghproxyPrefix}${normalized}`);
      add(normalized);
      add(`${rawGitmirrorPrefix}${normalized.slice(rawGithubPrefix.length)}`);
    }

    return urls;
  }

  constructor() {
    this.context = {
      version: '2.1.3',
      env: 'desktop',
      currentScript: null,
      currentScriptInfo: {
        name: '',
        description: '',
        version: '',
        rawScript: '',
      },
      EVENT_NAMES: {
        updateAlert: 'updateAlert'
      },
      callbacks: {},

      on: (event: string, callback: LxCallback) => {
        this.log('[LX][on]', event);
        this.context.callbacks[event] = callback;
        if (event === 'init' && !this.isInitialized) {
           this.isInitialized = true;
           // Trigger init immediately if script registers it
           setTimeout(() => callback({}), 0);
        }
      },

      send: (event: string, data: unknown) => {
        this.log('[LX][send]', event, data);
      },

      request: async (url: string, options: unknown = {}, callback?: LxRequestCallback) => {
        const normalized = this.normalizeRequestArgs(url, options, callback);
        const finalOptions = normalized.options as LxRequestOptions;
        const requestCallback = normalized.callback;

        const method = finalOptions.method || 'GET';
        let requestUrl = this.decodeHexUrl(url);
        if (finalOptions.params && typeof finalOptions.params === 'object') {
          const params = Object.entries(finalOptions.params).reduce<Record<string, string>>((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {});
          const query = new URLSearchParams(params).toString();
          requestUrl += (requestUrl.includes('?') ? '&' : '?') + query;
        }

        let body: BodyInit | null | undefined = finalOptions.body ?? finalOptions.data;
        if (!body && finalOptions.formData) {
          if (finalOptions.formData instanceof FormData) {
            body = finalOptions.formData;
          } else if (typeof finalOptions.formData === 'object') {
            body = new URLSearchParams(finalOptions.formData).toString();
          }
        }

        this.log('[LX][request]', method, requestUrl, finalOptions);
        
        try {
          const headers: Record<string, string> = finalOptions.headers || {};
          // Remove unsafe headers that browser might block (though webSecurity: false helps)
          delete headers['Host'];
          delete headers['Origin'];
          delete headers['Referer'];
          // Electron main process hook will handle User-Agent and Origin stripping

          if (typeof body === 'string' && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
          }

          const response = await fetch(requestUrl, {
            method,
            headers: headers,
            body: body,
          });

          // Some scripts expect specific response structure
          // LX usually returns { body, headers, statusCode }
          const responseBody = await response.text();
          let bodyJSON: unknown | undefined = undefined;
          try {
            bodyJSON = JSON.parse(responseBody);
          } catch (e) {
            // keep as text
          }

          const payload: LxResponsePayload = {
            body: bodyJSON ?? responseBody,
            bodyText: responseBody,
            bodyJSON,
            headers: Object.fromEntries(response.headers.entries()),
            statusCode: response.status
          };
          this.log('[LX][response]', response.status, requestUrl);
          if (typeof requestCallback === 'function') {
            requestCallback(null, payload, payload.bodyText ?? payload.body);
          }
          return payload;
        } catch (error) {
          this.log('[LX][request][error]', error);
          if (typeof requestCallback === 'function') {
            requestCallback(error);
            return { body: null, bodyText: '', headers: {}, statusCode: 0 };
          }
          throw error;
        }
      },

      utils: {
        crypto: {
          md5: (input: string) => CryptoJS.MD5(input).toString(),
          randomBytes: (length: number) => {
            if (window.crypto?.getRandomValues) {
              const bytes = new Uint8Array(length);
              window.crypto.getRandomValues(bytes);
              return this.wrapBytes(bytes);
            }
            const fallback = CryptoJS.lib.WordArray.random(length);
            const hex = fallback.toString();
            const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []);
            return this.wrapBytes(bytes);
          },
          aesEncrypt: (text: string, key: string, iv?: string) => {
            const keyWords = CryptoJS.enc.Utf8.parse(key);
            const ivWords = iv ? CryptoJS.enc.Utf8.parse(iv) : undefined;
            const options = ivWords ? { iv: ivWords, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 } : undefined;
            return CryptoJS.AES.encrypt(text, keyWords, options).toString();
          },
          rsaEncrypt: () => {
            // Placeholder for scripts that probe existence; replace if a script needs RSA.
            return '';
          }
        },
        buffer: {
          from: (str: unknown, encoding: string = 'utf8') => {
             // Simple buffer polyfill for scripts using Buffer.from
             // Note: Full Buffer polyfill is heavy, scripts usually use it for base64
             if (typeof str === 'string') {
               if (encoding === 'base64') {
                 const bytes = Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
                 return this.wrapBytes(bytes);
               }
               const bytes = new TextEncoder().encode(str);
               return this.wrapBytes(bytes);
             }
             if (str instanceof ArrayBuffer) {
               return this.wrapBytes(new Uint8Array(str));
             }
             if (ArrayBuffer.isView(str)) {
               return this.wrapBytes(new Uint8Array(str.buffer));
             }
             const bytes = new TextEncoder().encode(String(str ?? ''));
             return this.wrapBytes(bytes);
          }
          ,
          bufToString: (buf: unknown, encoding: string = 'utf-8') => {
            if (typeof buf === 'string') return buf;
            if (buf instanceof ArrayBuffer) {
              return new TextDecoder(encoding).decode(new Uint8Array(buf));
            }
            if (ArrayBuffer.isView(buf)) {
              return new TextDecoder(encoding).decode(new Uint8Array(buf.buffer));
            }
            return String(buf ?? '');
          }
        }
      }
    };

    // Expose to window
    window.lx = this.context;
    this.log('[LX] utils.crypto keys:', Object.keys(this.context.utils.crypto));
    this.log('[LX] utils.buffer keys:', Object.keys(this.context.utils.buffer));
  }

  async loadScript(url: string): Promise<{ success: boolean; error?: string; code?: SourceErrorCode }> {
    try {
      this.installErrorHooks();
      this.log('[LX] Loading script from:', url);
      const urlsToTry = this.buildFallbackUrls(url);
      let lastError: string | null = null;

      for (const fetchUrl of urlsToTry) {
        try {
          this.log('[LX] Fetching script:', fetchUrl);
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 15000);
          const response = await fetch(fetchUrl, { signal: controller.signal });
          window.clearTimeout(timeoutId);
          this.log('[LX] Fetch response:', response.status, response.statusText);
          if (!response.ok) {
            lastError = `HTTP ${response.status} ${response.statusText}`;
            this.log('[LX] Fetch failed:', lastError);
            continue;
          }
          const scriptContent = await response.text();
          this.log('[LX] Script length:', scriptContent.length);
          const scriptInfo = this.extractScriptInfo(scriptContent);
          scriptInfo.rawScript = scriptContent;

          // Execute script in global scope
          try {
            this.context.currentScriptInfo = scriptInfo;
            const scriptFn = new Function(scriptContent);
            scriptFn();

            this.context.currentScript = fetchUrl;
            this.log('[LX] Script loaded successfully');
            this.log('[LX] callbacks:', Object.keys(this.context.callbacks));
            window.setTimeout(() => {
              const keys = Object.keys(this.context.callbacks);
              if (keys.length === 0) {
                this.log('[LX] callbacks still empty after delay');
              }
            }, 1500);
            return { success: true };
          } catch (evalError) {
            this.log('[LX] Script execution failed:', evalError);
            const message = evalError instanceof Error ? evalError.message : String(evalError);
            return {
              success: false,
              error: `Script execution failed: ${message}`,
              code: classifySourceError(message)
            };
          }
        } catch (fetchError: unknown) {
          lastError = fetchError instanceof Error ? fetchError.message : String(fetchError);
          this.log('[LX] Fetch error:', lastError);
        }
      }

      this.log('[LX] All fetch attempts failed:', lastError);
      return {
        success: false,
        error: lastError || 'Failed to fetch script',
        code: classifySourceError(lastError || '')
      };
    } catch (error: unknown) {
      this.log('[LX] Failed to load script:', error);
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, code: classifySourceError(message) };
    }
  }

  async loadScriptContent(content: string, label?: string): Promise<{ success: boolean; error?: string; code?: SourceErrorCode }> {
    try {
      this.installErrorHooks();
      const scriptInfo = this.extractScriptInfo(content);
      scriptInfo.rawScript = content;
      this.context.currentScriptInfo = scriptInfo;
      const scriptFn = new Function(content);
      scriptFn();
      this.context.currentScript = label ? `local:${label}` : 'local:script';
      this.log('[LX] Script content loaded successfully');
      this.log('[LX] callbacks:', Object.keys(this.context.callbacks));
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.log('[LX] Script content execution failed:', message);
      return { success: false, error: message, code: classifySourceError(message) };
    }
  }

  private extractScriptInfo(scriptContent: string) {
    const header = scriptContent.slice(0, 2000);
    const getMeta = (key: string) => {
      const match = header.match(new RegExp(`@${key}\\s+([^\\n\\r]*)`, 'i'));
      return match ? match[1].trim() : '';
    };

    const info: LxContext['currentScriptInfo'] = {
      name: getMeta('name'),
      description: getMeta('description'),
      version: getMeta('version'),
      author: getMeta('author'),
      homepage: getMeta('homepage')
    };
    return info;
  }

  // Bridge methods for our app to call into the script
  async search(query: string, page: number = 1): Promise<unknown> {
    if (this.context.callbacks['search']) {
      try {
        // lx search signature: (keyword, page, limit, source)
        // We assume the script handles its own sources internally or we pass specific ones
        const result = await this.context.callbacks['search'](query, page, 30);
        return result;
      } catch (e) {
        console.error("Search error in LX script:", e);
        return null;
      }
    }
    return null;
  }

  async getMusicUrl(songInfo: unknown, quality: string = '128k'): Promise<string | null> {
    if (this.context.callbacks['getMusicUrl']) {
        // Some scripts register 'musicUrl' instead of 'getMusicUrl'? 
        // Or they listen to 'request' event with action='musicUrl'.
        // Let's check common patterns.
        // Standard LX v2+ uses lx.on('request', ({action, info}) => ...)
        // But simplified scripts might use specific events.
        // Let's try calling direct callback if exists.
        const res = await this.context.callbacks['getMusicUrl'](songInfo, quality);
        if (typeof res === 'string') return res;
        if (res && typeof res === 'object' && 'url' in res && typeof (res as { url?: unknown }).url === 'string') {
          return (res as { url: string }).url;
        }
        return null;
    } 
    
    // Fallback: Check if there is a generic 'request' handler (LX architecture)
    if (this.context.callbacks['request']) {
       const res = await this.context.callbacks['request']({
          action: 'musicUrl',
          source: songInfo && typeof songInfo === 'object' && 'source' in songInfo ? (songInfo as { source?: unknown }).source : undefined,
          info: {
             type: quality,
             musicInfo: songInfo
          }
       });
       if (typeof res === 'string') return res;
       if (res && typeof res === 'object' && 'url' in res && typeof (res as { url?: unknown }).url === 'string') {
         return (res as { url: string }).url;
       }
       return null;
    }

    return null;
  }
}

export const lxAdapter = new LxPluginAdapter();
