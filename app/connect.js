const WebSocket = require("ws");
const fetch = require("node-fetch");
const { v5: uuidv5, v4: uuidv4 } = require("uuid");

const logs = [];
const consoler = {
  log: (...msgs) => {
    logs.push({ msgs, level: "info" });
    console.log(...msgs);
  },
  error: (...msgs) => {
    logs.push({ msgs, level: "error" });
    console.error(...msgs);
  },
  warn: (...msgs) => {
    logs.push({ msgs, level: "warn" });
    console.warn(...msgs);
  },
};

const generateRandomNumber = () => {
  const randomNumber = Math.random() * 100000000;
  return Math.floor(randomNumber);
};

const uuid = uuidv5(
  generateRandomNumber().toString(),
  "bed9e870-4e94-4260-a1fa-815514adfce1"
);

const BROWSER_ID_KEY = "wynd:browser_id";
const USER_ID_KEY = "wynd:user_id";
const STATUS_KEY = "wynd:status";

const STATUSES = {
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  DEAD: "DEAD",
  CONNECTING: "CONNECTING",
};

const storage = {
  [USER_ID_KEY]: "320f39fb-5f92-43d5-a783-4d931618c5b4",
  [BROWSER_ID_KEY]: uuid,
  [STATUS_KEY]: STATUSES.DISCONNECTED,
  version: "3.3.2",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

// 创建WebSocket连接
const getUnixTimestamp = () => Math.floor(Date.now() / 1000);

const isUUID = (id) => typeof id === "string" && id.length === 36;

let websocket = false;
let lastLiveConnectionTimestamp = getUnixTimestamp();
let retries = 0;
const PING_INTERVAL = 20 * 1000;

const DEFAULT_STORAGE_KEY_EXPIRE_MS = 10 * 60 * 1000; // 10 mins
const DEFAULT_STORAGE_EXPIRATION_CHECK = 60 * 1000; // 1 min
const FETCH_TIMEOUT = 10 * 1000; // 10 sec
const REDIRECT_DATA_TIMEOUT = 5 * 1000; // 5 sec
const RESPONSE_COOKIE_TIMEOUT = 5 * 1000; // 5 sec

const WEBSOCKET_URLS = [
  "wss://proxy.wynd.network:4650",
  "wss://proxy.wynd.network:4444",
];

const RPC_CALL_TABLE = {
  HTTP_REQUEST: performHttpRequest,
  AUTH: authenticate,
  PONG: () => { },
};

function nullish(v, d) {
  return v === undefined || v === null ? d : v;
}

class Mutex {

  constructor() {
    this.queue = [];
    this.isLocked = false;
  }

  async runExclusive(callback) {
    const release = await this.acquire();
    try {
      return await callback();
    } finally {
      release();
    }
  }

  acquire() {
    return new Promise((resolve) => {
      this.queue.push({ resolve });
      this.dispatch();
    });
  }

  dispatch() {
    if (this.isLocked) {
      return;
    }
    const nextEntry = this.queue.shift();
    if (!nextEntry) {
      return;
    }
    this.isLocked = true;
    nextEntry.resolve(this.buildRelease());
  }

  buildRelease() {
    return () => {
      this.isLocked = false;
      this.dispatch();
    };
  }
}

class LogsTransporter {
  static sendLogs(logs) {
    send({
      action: "LOGS",
      data: logs,
    });
  }
}

class CustomStorage {

  constructor(defaultExpireMs = DEFAULT_STORAGE_KEY_EXPIRE_MS) {
    this.defaultExpireMs = defaultExpireMs;
    this.storage = {};
    const clearExpiredInterval = setInterval(() => {
      this.clearExpired();
    }, DEFAULT_STORAGE_EXPIRATION_CHECK);
  }

  get(key) {
    this.checkKeyIsExpired(key);
    return nullish(this.storage[key]?.value, null);
  }

  set(key, value, exMs = null) {
    const expirationTimeMs = nullish(exMs, this.defaultExpireMs);
    const data = {
      value,
      metainfo: {
        expire_at: Date.now() + expirationTimeMs,
      },
    };
    this.storage[key] = data;
  }

  del(key) {
    delete this.storage[key];
  }

  exists(key) {
    this.checkKeyIsExpired(key);
    return this.storage[key] !== null && this.storage[key] !== undefined;
  }

  clearExpired() {
    Object.keys(this.storage).forEach((key) => {
      this.checkKeyIsExpired(key);
    });
  }

  checkKeyIsExpired(key) {
    const data = this.storage[key];
    if (
      data === null ||
      data === undefined ||
      Date.now() > data.metainfo.expire_at
    ) {
      delete this.storage[key];
    }
  }
}

class ResponseProcessor {

  constructor() {
    this.cookieMutex = new Mutex();
    this.redirectMutex = new Mutex();
    this.waitCookieTasks = new CustomStorage();
    this.waitRedirectTasks = new CustomStorage();
    this.cookieStorage = new CustomStorage();
    this.redirectDataStorage = new CustomStorage();
  }

  async getResponseCookies(requestId, timeoutMs) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(async () => {
        await this.cookieMutex.runExclusive(() => {
          this.waitCookieTasks.del(requestId);
          LogsTransporter.sendLogs(
            `Timeout Error: Could not get Cookies from response to request ${requestId}`
          );
          reject(
            `Timeout Error: Could not get Cookies from response to request ${requestId}`
          );
        });
      }, timeoutMs);

      await this.cookieMutex.runExclusive(() => {
        const cookies = this.cookieStorage.get(requestId);
        if (cookies !== null) {
          clearTimeout(timeout);
          resolve(cookies);
        } else {
          this.waitCookieTasks.set(requestId, (c) => {
            clearTimeout(timeout);
            resolve(c);
          });
        }
      });
    });
  }

  async setResponseCookies(requestId, cookies) {
    return this.cookieMutex.runExclusive(() => {
      const resolve = this.waitCookieTasks.get(requestId);
      if (resolve) {
        resolve(cookies);
        this.waitCookieTasks.del(requestId);
      } else {
        this.cookieStorage.set(requestId, cookies);
      }
    });
  }

  async setRedirectData(requestId, redirectData) {
    return this.redirectMutex.runExclusive(() => {
      const resolve = this.waitRedirectTasks.get(requestId);
      if (resolve) {
        resolve(redirectData);
        this.waitRedirectTasks.del(requestId);
      } else {
        this.redirectDataStorage.set(requestId, redirectData);
      }
    });
  }

  async getRedirectData(requestId, timeoutMs) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(async () => {
        await this.redirectMutex.runExclusive(() => {
          this.waitRedirectTasks.del(requestId);
          LogsTransporter.sendLogs(
            `Timeout Error: Could not get Redirect data from response to request ${requestId}`
          );
          reject(
            `Timeout Error: Could not get Redirect data from response to request ${requestId}`
          );
        });
      }, timeoutMs);

      await this.redirectMutex.runExclusive(() => {
        const redirectData = this.redirectDataStorage.get(requestId);
        if (redirectData !== null) {
          clearTimeout(timeout);
          resolve(redirectData);
        } else {
          this.waitRedirectTasks.set(requestId, (data) => {
            clearTimeout(timeout);
            resolve(data);
          });
        }
      });
    });
  }

  async registerOnErrorOccuredEvent(requestId) {
    return this.setResponseCookies(requestId, "");
  }
}

class RequestFetcher {
  constructor() {
    this.usedChromeRequestIds = new CustomStorage();
    this.resolve = null;
    this.webRequestMutex = new Mutex();
    this.fetchMutex = new Mutex();
  }

  async fetch(url, requestOptions) {
    return this.fetchMutex.runExclusive(() => {
      return new Promise(async (resolve, reject) => {
        let responsePromise = null;
        const timeout = setTimeout(async () => {
          await this.webRequestMutex.runExclusive(() => {
            // for unknown reason, sometimes fetch request ignores all webRequest listeners
            // so we won't be able to propagate Set-Cookie from the response
            this.resolve = null;
            LogsTransporter.sendLogs(
              `Resolved WITHOUT REQUEST ID: ${url}, ${JSON.stringify(
                requestOptions
              )}`
            );
            resolve({
              requestId: null,
              responsePromise,
            });
          });
        }, FETCH_TIMEOUT);
        await this.webRequestMutex.runExclusive(() => {
          if (this.resolve) {
            this.resolve = null;
            clearTimeout(timeout);
            LogsTransporter.sendLogs(
              `Inconsistency detected. Waiting for more than 1 requestId: ${url}, ${JSON.stringify(
                requestOptions
              )}`
            );
            reject(
              `Inconsistency detected. Waiting for more than 1 requestId.`
            );
          }
          responsePromise = fetch(url, requestOptions).catch((e) => {
            LogsTransporter.sendLogs(
              `Fetch error for ${url} ${JSON.stringify(
                requestOptions
              )} : ${e}, ${e.stack}`
            );
            throw e;
          });
          this.resolve = (requestId) => {
            clearTimeout(timeout);
            return resolve({ requestId, responsePromise });
          };
        });
      });
    });
  }

  async registerOnBeforeRequestEvent(requestId) {
    return this.webRequestMutex.runExclusive(() => {
      if (!this.usedChromeRequestIds.exists(requestId)) {
        this.processNewRequestId(requestId);
      }
    });
  }

  async registerOnBeforeRedirectEvent(requestId) {
    return this.webRequestMutex.runExclusive(() => {
      if (!this.usedChromeRequestIds.exists(requestId)) {
        this.processNewRequestId(requestId);
      }
    });
  }

  // @note
  // usually, fetch() triggers onBeforeRequest listener. But in some rare cases
  // request skips all previous events (onBeforeRequest, onResponseStarted, etc...)
  // so we may notice that SOMETHING was fetched only when fetch() is already completed
  async registerOnCompletedEvent(requestId) {
    return this.webRequestMutex.runExclusive(async () => {
      if (!this.usedChromeRequestIds.exists(requestId)) {
        this.processNewRequestId(requestId);
      }
    });
  }

  async registerOnErrorOccuredEvent(requestId) {
    return this.webRequestMutex.runExclusive(async () => {
      if (!this.usedChromeRequestIds.exists(requestId)) {
        // if fetch() is waiting for new requestId, resolve it.
        this.processNewRequestId(requestId);
      } else {
        await RESPONSE_PROCESSOR.registerOnErrorOccuredEvent(requestId);
      }
    });
  }

  // @note
  // must be called under webRequestMutex
  processNewRequestId(requestId) {
    // mark requestId as used
    this.usedChromeRequestIds.set(requestId, 1);
    const resolve = this.resolve;
    this.resolve = null;
    resolve(requestId);
  }
}

function getLocalStorage(key) {
  return Promise.resolve(storage[key]);
}

function setLocalStorage(key, value) {
  storage[key] = value;
  return Promise.resolve();
}

async function authenticate() {
  let browser_id = await getLocalStorage(BROWSER_ID_KEY);
  const user_id = await getLocalStorage(USER_ID_KEY);
  const version = await getLocalStorage("version");
  const userAgent = await getLocalStorage("userAgent");

  if (!isUUID(browser_id)) {
    return;
  }

  const authenticationResponse = {
    browser_id,
    user_id: null,
    user_agent: userAgent,
    timestamp: getUnixTimestamp(),
    device_type: "extension",
    version,
  };

  if (Boolean(user_id)) {
    authenticationResponse.user_id = user_id;
  }

  return authenticationResponse;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const RESPONSE_PROCESSOR = new ResponseProcessor();
const REQUEST_FETCHER = new RequestFetcher();

async function performHttpRequest(params) {
  const request_options = {
    method: params.method,
    // mode: "cors",
    // cache: "no-cache",
    // credentials: "omit",
    headers: params.headers,
    redirect: "manual",
  };

  if (params.body) {
    const fetchURL = `data:application/octet-stream;base64,${params.body}`;
    const fetchResp = await fetch(fetchURL);
    request_options.body = await fetchResp.blob();
  }

  const { requestId, responsePromise } = await REQUEST_FETCHER.fetch(
    params.url,
    request_options
  ).catch((e) => {
    consoler.error(`Error occurred while extracting requestId: ${e}`);
    LogsTransporter.sendLogs(
      `Error occurred while extracting requestId ${params.url
      }, ${JSON.stringify(request_options)}: ${e}, ${e.stack}`
    );
    return { requestId: undefined, responsePromise: undefined };
  });

  if (responsePromise === undefined) {
    // Empty response.
    return null;
  }

  const response = await responsePromise.catch((e) => {
    consoler.error(`Error occurred while performing fetch: ${e}`);
    LogsTransporter.sendLogs(
      `Error occurred while performing fetch <${requestId}> ${params.url
      }, ${JSON.stringify(request_options)}: ${e}, ${e.stack}`
    );
  });

  if (!response) {
    return {
      url: params.url,
      status: 400,
      status_text: "Bad Request",
      headers: {},
      body: "",
    };
  }

  // process redirects manually
  if (response.type === "opaqueredirect") {
    if (!requestId) {
      consoler.error(`No requestId for redirect.`);
      LogsTransporter.sendLogs(
        `Error occurred in redirect ${params.url}, ${JSON.stringify(
          request_options
        )}: No requestId for redirect`
      );
      // Empty response.
      return null;
    }
    const redirectResponse = await RESPONSE_PROCESSOR.getRedirectData(
      requestId,
      REDIRECT_DATA_TIMEOUT
    )
      .then((redirectData) => {
        const responseMetadata = JSON.parse(redirectData);
        if (Object.hasOwn(responseMetadata.headers, "Set-Cookie")) {
          responseMetadata.headers["Set-Cookie"] = JSON.parse(
            responseMetadata.headers["Set-Cookie"]
          );
        }
        return {
          url: response.url,
          status: responseMetadata.statusCode,
          status_text: "Redirect",
          headers: responseMetadata.headers,
          body: "",
        };
      })
      .catch((e) => {
        consoler.error(
          `Error occured while processing redirect metadata : ${e}`
        );
        LogsTransporter.sendLogs(
          `Error occured while processing redirect metadata <${requestId}> ${params.url
          }, ${JSON.stringify(request_options)}: ${e}, ${e.stack}`
        );
        // Empty response.
        return null;
      });
    return redirectResponse;
  }

  const headers = {};
  // response.headers is an iterable object Headers (not a json)
  // so we must manually copy before returning
  response.headers.forEach((value, key) => {
    // remove Content-Encoding header
    if (key.toLowerCase() !== "content-encoding") {
      headers[key] = value;
    }
  });

  if (requestId) {
    await RESPONSE_PROCESSOR.getResponseCookies(
      requestId,
      RESPONSE_COOKIE_TIMEOUT
    )
      .then((responseCookies) => {
        // onErrorOccurred listener sets cookies = ''
        if (responseCookies !== "") {
          const cookies = JSON.parse(responseCookies);
          if (cookies.length !== 0) {
            headers["Set-Cookie"] = cookies;
          }
        }
      })
      .catch((e) => {
        // could not extract response cookies. Just skip
        consoler.error(`Error occured while processing response cookies: ${e}`);
        LogsTransporter.sendLogs(
          `Error occured while processing response cookies <${requestId}> ${params.url
          }, ${JSON.stringify(request_options)}: ${e}, ${e.stack}`
        );
      });
  }

  return {
    url: response.url,
    status: response.status,
    status_text: response.statusText,
    headers: headers,
    body: arrayBufferToBase64(await response.arrayBuffer()),
  };
}

async function initialize() {
  const browserId = await getLocalStorage(BROWSER_ID_KEY);
  if (!browserId) {
    consoler.warn("[INITIALIZE] Browser ID is blank. Cancelling connection...");
    return;
  }

  const websocketUrl = WEBSOCKET_URLS[retries % WEBSOCKET_URLS.length];
  websocket = new WebSocket(websocketUrl);

  websocket.onopen = async function (e) {
    consoler.log("Websocket Open");
    lastLiveConnectionTimestamp = getUnixTimestamp();
    await setLocalStorage(STATUS_KEY, STATUSES.CONNECTED);
  };

  websocket.onmessage = async function (event) {
    consoler.log("Recieve Message");
    // Update last live connection timestamp
    lastLiveConnectionTimestamp = getUnixTimestamp();

    let parsed_message;
    try {
      parsed_message = JSON.parse(event.data);
      consoler.log(parsed_message);
    } catch (e) {
      consoler.error("Could not parse WebSocket message!", event.data);
      consoler.error(e);
      return;
    }

    if (parsed_message.action in RPC_CALL_TABLE) {
      try {
        const result = await RPC_CALL_TABLE[parsed_message.action](
          parsed_message.data
        );
        send({
          // Use same ID so it can be correlated with the response
          id: parsed_message.id,
          origin_action: parsed_message.action,
          result: result,
        });
      } catch (e) {
        LogsTransporter.sendLogs(
          `RPC encountered error for message ${JSON.stringify(
            parsed_message
          )}: ${e}, ${e.stack}`
        );
        consoler.error(
          `RPC action ${parsed_message.action} encountered error: `,
          e
        );
      }
    } else {
      consoler.error(`No RPC action ${parsed_message.action}!`);
    }
  };

  websocket.onclose = async function (event) {
    if (event.wasClean) {
      consoler.log(
        `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
      );
    } else {
      consoler.log("[close] Connection died");
      retries++;
    }
  };

  websocket.onerror = function (error) {
    consoler.log(error);
    consoler.log(`[error] ${error}`);
  };
}

function send(data) {
  const message = JSON.stringify(data);
  consoler.log(`Send Message: ${message}`);
  websocket.send(message);
}

setInterval(async () => {
  const PENDING_STATES = [
    0, // CONNECTING
    2, // CLOSING
  ];

  if (websocket) {
    if (websocket.readyState === 1) {
      await setLocalStorage(STATUS_KEY, STATUSES.CONNECTED);
    } else if (websocket.readyState === 3) {
      await setLocalStorage(STATUS_KEY, STATUSES.DISCONNECTED);
    }
  }

  // Check WebSocket state and make sure it's appropriate
  if (PENDING_STATES.includes(websocket.readyState)) {
    consoler.log("WebSocket not in appropriate state for liveness check...");
    return;
  }

  // Check if timestamp is older than ~15 seconds. If it
  // is the connection is probably dead and we should restart it.
  const current_timestamp = getUnixTimestamp();
  const seconds_since_last_live_message =
    current_timestamp - lastLiveConnectionTimestamp;

  if (seconds_since_last_live_message > 29 || websocket.readyState === 3) {
    consoler.log("[over live time, reconnect]");
    consoler.error(
      "WebSocket does not appear to be live! Restarting the WebSocket connection..."
    );

    try {
      websocket.close();
    } catch (e) {
      // Do nothing.
    }
    initialize();
    return;
  }

  send({
    id: uuidv4(),
    version: "1.0.0",
    action: "PING",
    data: {},
  });
}, PING_INTERVAL);

initialize();
// export async function reconnect() {
//   try {
//     websocket.close();
//   } catch (e) {
//     // Do nothing.
//   }
//   await initialize();
// }

// export async function changeUser(newUserId) {
//   try {
//     await setLocalStorage(STATUS_KEY, STATUSES.CONNECTING);
//     websocket.close(1000, "Reconnecting");
//   } catch (e) {
//   }
//   await initialize();
// }

// module.exports = {
//   logs: () => logs,
//   status: () => storage[STATUS_KEY],
// }

export default {
  logs: () => logs,
  status: () => storage[STATUS_KEY]
}
