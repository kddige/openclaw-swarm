var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value2) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value2 }) : obj[key] = value2;
var __publicField = (obj, key, value2) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value2);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value2) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value2);
var __privateSet = (obj, member, value2, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value2) : member.set(obj, value2), value2);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _isDone, _isExecuteComplete, _cleanup, _next, _StandardRPCSerializer_instances, serialize_fn, deserialize_fn;
import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
function resolveMaybeOptionalOptions(rest) {
  return rest[0] ?? {};
}
function toArray(value2) {
  return Array.isArray(value2) ? value2 : value2 === void 0 || value2 === null ? [] : [value2];
}
function readAsBuffer(source) {
  if (typeof source.bytes === "function") {
    return source.bytes();
  }
  return source.arrayBuffer();
}
const ORPC_NAME = "orpc";
const ORPC_SHARED_PACKAGE_NAME = "@orpc/shared";
const ORPC_SHARED_PACKAGE_VERSION = "1.13.5";
class AbortError extends Error {
  constructor(...rest) {
    super(...rest);
    this.name = "AbortError";
  }
}
function sequential(fn) {
  let lastOperationPromise = Promise.resolve();
  return (...args) => {
    return lastOperationPromise = lastOperationPromise.catch(() => {
    }).then(() => {
      return fn(...args);
    });
  };
}
const SPAN_ERROR_STATUS = 2;
const GLOBAL_OTEL_CONFIG_KEY = `__${ORPC_SHARED_PACKAGE_NAME}@${ORPC_SHARED_PACKAGE_VERSION}/otel/config__`;
function getGlobalOtelConfig() {
  return globalThis[GLOBAL_OTEL_CONFIG_KEY];
}
function startSpan(name, options = {}, context) {
  var _a;
  const tracer = (_a = getGlobalOtelConfig()) == null ? void 0 : _a.tracer;
  return tracer == null ? void 0 : tracer.startSpan(name, options, context);
}
function setSpanError(span, error, options = {}) {
  var _a;
  if (!span) {
    return;
  }
  const exception = toOtelException(error);
  span.recordException(exception);
  if (!((_a = options.signal) == null ? void 0 : _a.aborted) || options.signal.reason !== error) {
    span.setStatus({
      code: SPAN_ERROR_STATUS,
      message: exception.message
    });
  }
}
function toOtelException(error) {
  if (error instanceof Error) {
    const exception = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
    if ("code" in error && (typeof error.code === "string" || typeof error.code === "number")) {
      exception.code = error.code;
    }
    return exception;
  }
  return { message: String(error) };
}
async function runWithSpan({ name, context, ...options }, fn) {
  var _a;
  const tracer = (_a = getGlobalOtelConfig()) == null ? void 0 : _a.tracer;
  if (!tracer) {
    return fn();
  }
  const callback = async (span) => {
    try {
      return await fn(span);
    } catch (e) {
      setSpanError(span, e, options);
      throw e;
    } finally {
      span.end();
    }
  };
  if (context) {
    return tracer.startActiveSpan(name, options, context, callback);
  } else {
    return tracer.startActiveSpan(name, options, callback);
  }
}
async function runInSpanContext(span, fn) {
  const otelConfig = getGlobalOtelConfig();
  if (!span || !otelConfig) {
    return fn();
  }
  const ctx = otelConfig.trace.setSpan(otelConfig.context.active(), span);
  return otelConfig.context.with(ctx, fn);
}
class AsyncIdQueue {
  constructor() {
    __publicField(this, "openIds", /* @__PURE__ */ new Set());
    __publicField(this, "queues", /* @__PURE__ */ new Map());
    __publicField(this, "waiters", /* @__PURE__ */ new Map());
  }
  get length() {
    return this.openIds.size;
  }
  get waiterIds() {
    return Array.from(this.waiters.keys());
  }
  hasBufferedItems(id) {
    var _a;
    return Boolean((_a = this.queues.get(id)) == null ? void 0 : _a.length);
  }
  open(id) {
    this.openIds.add(id);
  }
  isOpen(id) {
    return this.openIds.has(id);
  }
  push(id, item) {
    this.assertOpen(id);
    const pending = this.waiters.get(id);
    if (pending == null ? void 0 : pending.length) {
      pending.shift()[0](item);
      if (pending.length === 0) {
        this.waiters.delete(id);
      }
    } else {
      const items = this.queues.get(id);
      if (items) {
        items.push(item);
      } else {
        this.queues.set(id, [item]);
      }
    }
  }
  async pull(id) {
    this.assertOpen(id);
    const items = this.queues.get(id);
    if (items == null ? void 0 : items.length) {
      const item = items.shift();
      if (items.length === 0) {
        this.queues.delete(id);
      }
      return item;
    }
    return new Promise((resolve, reject) => {
      const waitingPulls = this.waiters.get(id);
      const pending = [resolve, reject];
      if (waitingPulls) {
        waitingPulls.push(pending);
      } else {
        this.waiters.set(id, [pending]);
      }
    });
  }
  close({ id, reason } = {}) {
    var _a;
    if (id === void 0) {
      this.waiters.forEach((pendingPulls, id2) => {
        const error2 = reason ?? new AbortError(`[AsyncIdQueue] Queue[${id2}] was closed or aborted while waiting for pulling.`);
        pendingPulls.forEach(([, reject]) => reject(error2));
      });
      this.waiters.clear();
      this.openIds.clear();
      this.queues.clear();
      return;
    }
    const error = reason ?? new AbortError(`[AsyncIdQueue] Queue[${id}] was closed or aborted while waiting for pulling.`);
    (_a = this.waiters.get(id)) == null ? void 0 : _a.forEach(([, reject]) => reject(error));
    this.waiters.delete(id);
    this.openIds.delete(id);
    this.queues.delete(id);
  }
  assertOpen(id) {
    if (!this.isOpen(id)) {
      throw new Error(`[AsyncIdQueue] Cannot access queue[${id}] because it is not open or aborted.`);
    }
  }
}
function isAsyncIteratorObject(maybe) {
  if (!maybe || typeof maybe !== "object") {
    return false;
  }
  return "next" in maybe && typeof maybe.next === "function" && Symbol.asyncIterator in maybe && typeof maybe[Symbol.asyncIterator] === "function";
}
const fallbackAsyncDisposeSymbol = Symbol.for("asyncDispose");
const asyncDisposeSymbol = Symbol.asyncDispose ?? fallbackAsyncDisposeSymbol;
class AsyncIteratorClass {
  constructor(next, cleanup) {
    __privateAdd(this, _isDone, false);
    __privateAdd(this, _isExecuteComplete, false);
    __privateAdd(this, _cleanup);
    __privateAdd(this, _next);
    __privateSet(this, _cleanup, cleanup);
    __privateSet(this, _next, sequential(async () => {
      if (__privateGet(this, _isDone)) {
        return { done: true, value: void 0 };
      }
      try {
        const result = await next();
        if (result.done) {
          __privateSet(this, _isDone, true);
        }
        return result;
      } catch (err) {
        __privateSet(this, _isDone, true);
        throw err;
      } finally {
        if (__privateGet(this, _isDone) && !__privateGet(this, _isExecuteComplete)) {
          __privateSet(this, _isExecuteComplete, true);
          await __privateGet(this, _cleanup).call(this, "next");
        }
      }
    }));
  }
  next() {
    return __privateGet(this, _next).call(this);
  }
  async return(value2) {
    __privateSet(this, _isDone, true);
    if (!__privateGet(this, _isExecuteComplete)) {
      __privateSet(this, _isExecuteComplete, true);
      await __privateGet(this, _cleanup).call(this, "return");
    }
    return { done: true, value: value2 };
  }
  async throw(err) {
    __privateSet(this, _isDone, true);
    if (!__privateGet(this, _isExecuteComplete)) {
      __privateSet(this, _isExecuteComplete, true);
      await __privateGet(this, _cleanup).call(this, "throw");
    }
    throw err;
  }
  /**
   * asyncDispose symbol only available in esnext, we should fallback to Symbol.for('asyncDispose')
   */
  async [asyncDisposeSymbol]() {
    __privateSet(this, _isDone, true);
    if (!__privateGet(this, _isExecuteComplete)) {
      __privateSet(this, _isExecuteComplete, true);
      await __privateGet(this, _cleanup).call(this, "dispose");
    }
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
_isDone = new WeakMap();
_isExecuteComplete = new WeakMap();
_cleanup = new WeakMap();
_next = new WeakMap();
function asyncIteratorWithSpan({ name, ...options }, iterator) {
  let span;
  return new AsyncIteratorClass(
    async () => {
      span ?? (span = startSpan(name));
      try {
        const result = await runInSpanContext(span, () => iterator.next());
        span == null ? void 0 : span.addEvent(result.done ? "completed" : "yielded");
        return result;
      } catch (err) {
        setSpanError(span, err, options);
        throw err;
      }
    },
    async (reason) => {
      try {
        if (reason !== "next") {
          await runInSpanContext(span, () => {
            var _a;
            return (_a = iterator.return) == null ? void 0 : _a.call(iterator);
          });
        }
      } catch (err) {
        setSpanError(span, err, options);
        throw err;
      } finally {
        span == null ? void 0 : span.end();
      }
    }
  );
}
function onError(callback) {
  return async (options, ...rest) => {
    try {
      return await options.next();
    } catch (error) {
      await callback(error, options, ...rest);
      throw error;
    }
  };
}
function intercept(interceptors, options, main) {
  const next = (options2, index) => {
    const interceptor = interceptors[index];
    if (!interceptor) {
      return main(options2);
    }
    return interceptor({
      ...options2,
      next: (newOptions = options2) => next(newOptions, index + 1)
    });
  };
  return next(options, 0);
}
function parseEmptyableJSON(text) {
  if (!text) {
    return void 0;
  }
  return JSON.parse(text);
}
function stringifyJSON(value2) {
  return JSON.stringify(value2);
}
function getConstructor(value2) {
  var _a;
  if (!isTypescriptObject(value2)) {
    return null;
  }
  return (_a = Object.getPrototypeOf(value2)) == null ? void 0 : _a.constructor;
}
function isObject(value2) {
  if (!value2 || typeof value2 !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value2);
  return proto === Object.prototype || !proto || !proto.constructor;
}
function isTypescriptObject(value2) {
  return !!value2 && (typeof value2 === "object" || typeof value2 === "function");
}
const NullProtoObj = /* @__PURE__ */ (() => {
  const e = function() {
  };
  e.prototype = /* @__PURE__ */ Object.create(null);
  Object.freeze(e.prototype);
  return e;
})();
function value(value2, ...args) {
  if (typeof value2 === "function") {
    return value2(...args);
  }
  return value2;
}
function overlayProxy(target, partial) {
  const proxy = new Proxy(typeof target === "function" ? partial : target, {
    get(_, prop) {
      const targetValue = prop in partial ? partial : value(target);
      const v = Reflect.get(targetValue, prop);
      return typeof v === "function" ? v.bind(targetValue) : v;
    },
    has(_, prop) {
      return Reflect.has(partial, prop) || Reflect.has(value(target), prop);
    }
  });
  return proxy;
}
function tryDecodeURIComponent(value2) {
  try {
    return decodeURIComponent(value2);
  } catch {
    return value2;
  }
}
class EventEncoderError extends TypeError {
}
class EventDecoderError extends TypeError {
}
class ErrorEvent extends Error {
  constructor(options) {
    super((options == null ? void 0 : options.message) ?? "An error event was received", options);
    __publicField(this, "data");
    this.data = options == null ? void 0 : options.data;
  }
}
function decodeEventMessage(encoded) {
  var _a;
  const lines = encoded.replace(/\n+$/, "").split(/\n/);
  const message = {
    data: void 0,
    event: void 0,
    id: void 0,
    retry: void 0,
    comments: []
  };
  for (const line of lines) {
    const index = line.indexOf(":");
    const key = index === -1 ? line : line.slice(0, index);
    const value2 = index === -1 ? "" : line.slice(index + 1).replace(/^\s/, "");
    if (index === 0) {
      message.comments.push(value2);
    } else if (key === "data") {
      message.data ?? (message.data = "");
      message.data += `${value2}
`;
    } else if (key === "event") {
      message.event = value2;
    } else if (key === "id") {
      message.id = value2;
    } else if (key === "retry") {
      const maybeInteger = Number.parseInt(value2);
      if (Number.isInteger(maybeInteger) && maybeInteger >= 0 && maybeInteger.toString() === value2) {
        message.retry = maybeInteger;
      }
    }
  }
  message.data = (_a = message.data) == null ? void 0 : _a.replace(/\n$/, "");
  return message;
}
class EventDecoder {
  constructor(options = {}) {
    __publicField(this, "incomplete", "");
    this.options = options;
  }
  feed(chunk) {
    this.incomplete += chunk;
    const lastCompleteIndex = this.incomplete.lastIndexOf("\n\n");
    if (lastCompleteIndex === -1) {
      return;
    }
    const completes = this.incomplete.slice(0, lastCompleteIndex).split(/\n\n/);
    this.incomplete = this.incomplete.slice(lastCompleteIndex + 2);
    for (const encoded of completes) {
      const message = decodeEventMessage(`${encoded}

`);
      if (this.options.onEvent) {
        this.options.onEvent(message);
      }
    }
  }
  end() {
    if (this.incomplete) {
      throw new EventDecoderError("Event Iterator ended before complete");
    }
  }
}
class EventDecoderStream extends TransformStream {
  constructor() {
    let decoder;
    super({
      start(controller) {
        decoder = new EventDecoder({
          onEvent: (event) => {
            controller.enqueue(event);
          }
        });
      },
      transform(chunk) {
        decoder.feed(chunk);
      },
      flush() {
        decoder.end();
      }
    });
  }
}
function assertEventId(id) {
  if (id.includes("\n")) {
    throw new EventEncoderError("Event's id must not contain a newline character");
  }
}
function assertEventRetry(retry) {
  if (!Number.isInteger(retry) || retry < 0) {
    throw new EventEncoderError("Event's retry must be a integer and >= 0");
  }
}
function assertEventComment(comment) {
  if (comment.includes("\n")) {
    throw new EventEncoderError("Event's comment must not contain a newline character");
  }
}
const EVENT_SOURCE_META_SYMBOL = Symbol("ORPC_EVENT_SOURCE_META");
function withEventMeta(container, meta) {
  var _a;
  if (meta.id === void 0 && meta.retry === void 0 && !((_a = meta.comments) == null ? void 0 : _a.length)) {
    return container;
  }
  if (meta.id !== void 0) {
    assertEventId(meta.id);
  }
  if (meta.retry !== void 0) {
    assertEventRetry(meta.retry);
  }
  if (meta.comments !== void 0) {
    for (const comment of meta.comments) {
      assertEventComment(comment);
    }
  }
  return new Proxy(container, {
    get(target, prop, receiver) {
      if (prop === EVENT_SOURCE_META_SYMBOL) {
        return meta;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
function getEventMeta(container) {
  return isTypescriptObject(container) ? Reflect.get(container, EVENT_SOURCE_META_SYMBOL) : void 0;
}
class HibernationEventIterator extends AsyncIteratorClass {
  constructor(hibernationCallback) {
    super(async () => {
      throw new Error("Cannot iterate over hibernating iterator directly");
    }, async (reason) => {
      if (reason !== "next") {
        throw new Error("Cannot cleanup hibernating iterator directly");
      }
    });
    /**
     * this property is not transferred to the client, so it should be optional for type safety
     */
    __publicField(this, "hibernationCallback");
    this.hibernationCallback = hibernationCallback;
  }
}
function generateContentDisposition(filename) {
  const escapedFileName = filename.replace(/"/g, '\\"');
  const encodedFilenameStar = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%(7C|60|5E)/g, (str, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  return `inline; filename="${escapedFileName}"; filename*=utf-8''${encodedFilenameStar}`;
}
function getFilenameFromContentDisposition(contentDisposition) {
  const encodedFilenameStarMatch = contentDisposition.match(/filename\*=(UTF-8'')?([^;]*)/i);
  if (encodedFilenameStarMatch && typeof encodedFilenameStarMatch[2] === "string") {
    return tryDecodeURIComponent(encodedFilenameStarMatch[2]);
  }
  const encodedFilenameMatch = contentDisposition.match(/filename="((?:\\"|[^"])*)"/i);
  if (encodedFilenameMatch && typeof encodedFilenameMatch[1] === "string") {
    return encodedFilenameMatch[1].replace(/\\"/g, '"');
  }
}
function flattenHeader(header) {
  if (typeof header === "string" || header === void 0) {
    return header;
  }
  if (header.length === 0) {
    return void 0;
  }
  return header.join(", ");
}
function isEventIteratorHeaders(headers) {
  var _a;
  return Boolean(((_a = flattenHeader(headers["content-type"])) == null ? void 0 : _a.startsWith("text/event-stream")) && flattenHeader(headers["content-disposition"]) === void 0);
}
const SHORTABLE_ORIGIN = "http://orpc";
var MessageType = /* @__PURE__ */ ((MessageType2) => {
  MessageType2[MessageType2["REQUEST"] = 1] = "REQUEST";
  MessageType2[MessageType2["RESPONSE"] = 2] = "RESPONSE";
  MessageType2[MessageType2["EVENT_ITERATOR"] = 3] = "EVENT_ITERATOR";
  MessageType2[MessageType2["ABORT_SIGNAL"] = 4] = "ABORT_SIGNAL";
  return MessageType2;
})(MessageType || {});
function deserializeRequestMessage(message) {
  const id = message.i;
  const type = message.t ?? 1;
  if (type === 3) {
    const payload2 = message.p;
    return [id, type, { event: payload2.e, data: payload2.d, meta: payload2.m }];
  }
  if (type === 4) {
    return [id, type, message.p];
  }
  const payload = message.p;
  return [id, 1, {
    url: payload.u.startsWith("/") ? new URL(`${SHORTABLE_ORIGIN}${payload.u}`) : new URL(payload.u),
    headers: payload.h ?? {},
    method: payload.m ?? "POST",
    body: payload.b
  }];
}
function serializeResponseMessage(id, type, payload) {
  if (type === 3) {
    const eventPayload = payload;
    const serializedPayload2 = {
      e: eventPayload.event,
      d: eventPayload.data,
      m: eventPayload.meta
    };
    return { i: id, t: type, p: serializedPayload2 };
  }
  if (type === 4) {
    return { i: id, t: type, p: void 0 };
  }
  const response = payload;
  const serializedPayload = {
    s: response.status === 200 ? void 0 : response.status,
    h: Object.keys(response.headers).length > 0 ? response.headers : void 0,
    b: response.body
  };
  return {
    i: id,
    p: serializedPayload
  };
}
async function decodeRequestMessage(raw) {
  const { json: message, buffer } = await decodeRawMessage(raw);
  const [id, type, payload] = deserializeRequestMessage(message);
  if (type === 3 || type === 4) {
    return [id, type, payload];
  }
  const request = payload;
  const body = await deserializeBody(request.headers, request.body, buffer);
  return [id, type, { ...request, body }];
}
async function encodeResponseMessage(id, type, payload) {
  if (type === 3 || type === 4) {
    return encodeRawMessage(serializeResponseMessage(id, type, payload));
  }
  const response = payload;
  const { body: processedBody, headers: processedHeaders } = await serializeBodyAndHeaders(
    response.body,
    response.headers
  );
  const modifiedResponse = {
    ...response,
    body: processedBody instanceof Blob ? void 0 : processedBody,
    headers: processedHeaders
  };
  const baseMessage = serializeResponseMessage(id, 2, modifiedResponse);
  if (processedBody instanceof Blob) {
    return encodeRawMessage(baseMessage, processedBody);
  }
  return encodeRawMessage(baseMessage);
}
async function serializeBodyAndHeaders(body, originalHeaders) {
  const headers = { ...originalHeaders };
  const originalContentDisposition = headers["content-disposition"];
  delete headers["content-type"];
  delete headers["content-disposition"];
  if (body instanceof Blob) {
    headers["content-type"] = body.type;
    headers["content-disposition"] = originalContentDisposition ?? generateContentDisposition(
      body instanceof File ? body.name : "blob"
    );
    return { body, headers };
  }
  if (body instanceof FormData) {
    const tempRes = new Response(body);
    headers["content-type"] = tempRes.headers.get("content-type");
    const formDataBlob = await tempRes.blob();
    return { body: formDataBlob, headers };
  }
  if (body instanceof URLSearchParams) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    return { body: body.toString(), headers };
  }
  if (isAsyncIteratorObject(body)) {
    headers["content-type"] = "text/event-stream";
    return { body: void 0, headers };
  }
  return { body, headers };
}
async function deserializeBody(headers, body, buffer) {
  const contentType = flattenHeader(headers["content-type"]);
  const contentDisposition = flattenHeader(headers["content-disposition"]);
  if (typeof contentDisposition === "string") {
    const filename = getFilenameFromContentDisposition(contentDisposition) ?? "blob";
    return new File(buffer === void 0 ? [] : [buffer], filename, { type: contentType });
  }
  if (contentType == null ? void 0 : contentType.startsWith("multipart/form-data")) {
    const tempRes = new Response(buffer, { headers: { "content-type": contentType } });
    return tempRes.formData();
  }
  if ((contentType == null ? void 0 : contentType.startsWith("application/x-www-form-urlencoded")) && typeof body === "string") {
    return new URLSearchParams(body);
  }
  return body;
}
const JSON_AND_BINARY_DELIMITER = 255;
async function encodeRawMessage(data, blob) {
  const json = stringifyJSON(data);
  if (blob === void 0 || blob.size === 0) {
    return json;
  }
  return readAsBuffer(new Blob([
    new TextEncoder().encode(json),
    new Uint8Array([JSON_AND_BINARY_DELIMITER]),
    blob
  ]));
}
async function decodeRawMessage(raw) {
  if (typeof raw === "string") {
    return { json: JSON.parse(raw) };
  }
  const buffer = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  const delimiterIndex = buffer.indexOf(JSON_AND_BINARY_DELIMITER);
  if (delimiterIndex === -1) {
    const jsonPart2 = new TextDecoder().decode(buffer);
    return { json: JSON.parse(jsonPart2) };
  }
  const jsonPart = new TextDecoder().decode(buffer.subarray(0, delimiterIndex));
  const bufferPart = buffer.subarray(delimiterIndex + 1);
  return {
    json: JSON.parse(jsonPart),
    buffer: bufferPart
  };
}
function toEventIterator(queue, id, cleanup, options = {}) {
  let span;
  return new AsyncIteratorClass(async () => {
    span ?? (span = startSpan("consume_event_iterator_stream"));
    try {
      const item = await runInSpanContext(span, () => queue.pull(id));
      switch (item.event) {
        case "message": {
          let data = item.data;
          if (item.meta && isTypescriptObject(data)) {
            data = withEventMeta(data, item.meta);
          }
          span == null ? void 0 : span.addEvent("message");
          return { value: data, done: false };
        }
        case "error": {
          let error = new ErrorEvent({
            data: item.data
          });
          if (item.meta) {
            error = withEventMeta(error, item.meta);
          }
          span == null ? void 0 : span.addEvent("error");
          throw error;
        }
        case "done": {
          let data = item.data;
          if (item.meta && isTypescriptObject(data)) {
            data = withEventMeta(data, item.meta);
          }
          span == null ? void 0 : span.addEvent("done");
          return { value: data, done: true };
        }
      }
    } catch (e) {
      if (!(e instanceof ErrorEvent)) {
        setSpanError(span, e, options);
      }
      throw e;
    }
  }, async (reason) => {
    try {
      if (reason !== "next") {
        span == null ? void 0 : span.addEvent("cancelled");
      }
      await runInSpanContext(span, () => cleanup(reason));
    } catch (e) {
      setSpanError(span, e, options);
      throw e;
    } finally {
      span == null ? void 0 : span.end();
    }
  });
}
function resolveEventIterator(iterator, callback) {
  return runWithSpan(
    { name: "stream_event_iterator" },
    async (span) => {
      var _a, _b;
      while (true) {
        const payload = await (async () => {
          try {
            const { value: value2, done } = await iterator.next();
            if (done) {
              span == null ? void 0 : span.addEvent("done");
              return { event: "done", data: value2, meta: getEventMeta(value2) };
            }
            span == null ? void 0 : span.addEvent("message");
            return { event: "message", data: value2, meta: getEventMeta(value2) };
          } catch (err) {
            if (err instanceof ErrorEvent) {
              span == null ? void 0 : span.addEvent("error");
              return {
                event: "error",
                data: err.data,
                meta: getEventMeta(err)
              };
            } else {
              try {
                await callback({ event: "error", data: void 0 });
              } catch (err2) {
                setSpanError(span, err);
                throw err2;
              }
              throw err;
            }
          }
        })();
        let isInvokeCleanupFn = false;
        try {
          const direction = await callback(payload);
          if (payload.event === "done" || payload.event === "error") {
            return;
          }
          if (direction === "abort") {
            isInvokeCleanupFn = true;
            await ((_a = iterator.return) == null ? void 0 : _a.call(iterator));
            return;
          }
        } catch (err) {
          if (!isInvokeCleanupFn) {
            try {
              await ((_b = iterator.return) == null ? void 0 : _b.call(iterator));
            } catch (err2) {
              setSpanError(span, err);
              throw err2;
            }
          }
          throw err;
        }
      }
    }
  );
}
class experimental_ServerPeerWithoutCodec {
  constructor(send) {
    /**
     * Queue of event iterator messages sent from client, awaiting consumption
     */
    __publicField(this, "clientEventIteratorQueue", new AsyncIdQueue());
    /**
     * Map of active client request controllers, should be synced to request signal
     */
    __publicField(this, "clientControllers", /* @__PURE__ */ new Map());
    __publicField(this, "send");
    this.send = async (message) => {
      const id = message[0];
      if (this.clientControllers.has(id)) {
        await send(message);
      }
    };
  }
  get length() {
    return (this.clientEventIteratorQueue.length + this.clientControllers.size) / 2;
  }
  open(id) {
    this.clientEventIteratorQueue.open(id);
    const controller = new AbortController();
    this.clientControllers.set(id, controller);
    return controller;
  }
  /**
   * @todo This method will return Promise<void> in the next major version.
   */
  async message([id, type, payload], handleRequest) {
    if (type === MessageType.ABORT_SIGNAL) {
      this.close({ id, reason: new AbortError("Client aborted the request") });
      return [id, void 0];
    }
    if (type === MessageType.EVENT_ITERATOR) {
      if (this.clientEventIteratorQueue.isOpen(id)) {
        this.clientEventIteratorQueue.push(id, payload);
      }
      return [id, void 0];
    }
    const clientController = this.open(id);
    const signal = clientController.signal;
    const request = {
      ...payload,
      signal,
      body: isEventIteratorHeaders(payload.headers) ? toEventIterator(
        this.clientEventIteratorQueue,
        id,
        async (reason) => {
          if (reason !== "next") {
            await this.send([id, MessageType.ABORT_SIGNAL, void 0]);
          }
        },
        { signal }
      ) : payload.body
    };
    if (handleRequest) {
      let context;
      const otelConfig = getGlobalOtelConfig();
      if (otelConfig) {
        context = otelConfig.propagation.extract(otelConfig.context.active(), request.headers);
      }
      await runWithSpan(
        { name: "receive_peer_request", context },
        async () => {
          const response = await runWithSpan(
            { name: "handle_request" },
            async () => {
              try {
                return await handleRequest(request);
              } catch (reason) {
                this.close({ id, reason, abort: false });
                throw reason;
              }
            }
          );
          await runWithSpan(
            { name: "send_peer_response" },
            () => this.response(id, response)
          );
        }
      );
    }
    return [id, request];
  }
  /**
   * @deprecated Please pass the `handleRequest` (second arg) function to the `message` method instead.
   */
  async response(id, response) {
    var _a, _b, _c;
    const signal = (_a = this.clientControllers.get(id)) == null ? void 0 : _a.signal;
    if (!signal || signal.aborted) {
      return;
    }
    try {
      await this.send([id, MessageType.RESPONSE, response]);
      if (!signal.aborted && isAsyncIteratorObject(response.body)) {
        if (response.body instanceof HibernationEventIterator) {
          (_c = (_b = response.body).hibernationCallback) == null ? void 0 : _c.call(_b, id);
        } else {
          const iterator = response.body;
          await resolveEventIterator(iterator, async (payload) => {
            if (signal.aborted) {
              return "abort";
            }
            await this.send([id, MessageType.EVENT_ITERATOR, payload]);
            return "next";
          });
        }
      }
      this.close({ id, abort: false });
    } catch (reason) {
      this.close({ id, reason, abort: false });
      throw reason;
    }
  }
  close({ abort = true, ...options } = {}) {
    var _a;
    if (options.id === void 0) {
      if (abort) {
        this.clientControllers.forEach((c) => c.abort(options.reason));
      }
      this.clientControllers.clear();
    } else {
      if (abort) {
        (_a = this.clientControllers.get(options.id)) == null ? void 0 : _a.abort(options.reason);
      }
      this.clientControllers.delete(options.id);
    }
    this.clientEventIteratorQueue.close(options);
  }
}
const ORPC_CLIENT_PACKAGE_NAME = "@orpc/client";
const ORPC_CLIENT_PACKAGE_VERSION = "1.13.5";
const COMMON_ORPC_ERROR_DEFS = {
  BAD_REQUEST: {
    status: 400,
    message: "Bad Request"
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Unauthorized"
  },
  FORBIDDEN: {
    status: 403,
    message: "Forbidden"
  },
  NOT_FOUND: {
    status: 404,
    message: "Not Found"
  },
  METHOD_NOT_SUPPORTED: {
    status: 405,
    message: "Method Not Supported"
  },
  NOT_ACCEPTABLE: {
    status: 406,
    message: "Not Acceptable"
  },
  TIMEOUT: {
    status: 408,
    message: "Request Timeout"
  },
  CONFLICT: {
    status: 409,
    message: "Conflict"
  },
  PRECONDITION_FAILED: {
    status: 412,
    message: "Precondition Failed"
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    message: "Payload Too Large"
  },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    message: "Unsupported Media Type"
  },
  UNPROCESSABLE_CONTENT: {
    status: 422,
    message: "Unprocessable Content"
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    message: "Too Many Requests"
  },
  CLIENT_CLOSED_REQUEST: {
    status: 499,
    message: "Client Closed Request"
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "Internal Server Error"
  },
  NOT_IMPLEMENTED: {
    status: 501,
    message: "Not Implemented"
  },
  BAD_GATEWAY: {
    status: 502,
    message: "Bad Gateway"
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: "Service Unavailable"
  },
  GATEWAY_TIMEOUT: {
    status: 504,
    message: "Gateway Timeout"
  }
};
function fallbackORPCErrorStatus(code, status) {
  var _a;
  return status ?? ((_a = COMMON_ORPC_ERROR_DEFS[code]) == null ? void 0 : _a.status) ?? 500;
}
function fallbackORPCErrorMessage(code, message) {
  var _a;
  return message || ((_a = COMMON_ORPC_ERROR_DEFS[code]) == null ? void 0 : _a.message) || code;
}
const GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL = Symbol.for(`__${ORPC_CLIENT_PACKAGE_NAME}@${ORPC_CLIENT_PACKAGE_VERSION}/error/ORPC_ERROR_CONSTRUCTORS__`);
void (globalThis[GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL] ?? (globalThis[GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL] = /* @__PURE__ */ new WeakSet()));
const globalORPCErrorConstructors = globalThis[GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL];
class ORPCError extends Error {
  constructor(code, ...rest) {
    const options = resolveMaybeOptionalOptions(rest);
    if (options.status !== void 0 && !isORPCErrorStatus(options.status)) {
      throw new Error("[ORPCError] Invalid error status code.");
    }
    const message = fallbackORPCErrorMessage(code, options.message);
    super(message, options);
    __publicField(this, "defined");
    __publicField(this, "code");
    __publicField(this, "status");
    __publicField(this, "data");
    this.code = code;
    this.status = fallbackORPCErrorStatus(code, options.status);
    this.defined = options.defined ?? false;
    this.data = options.data;
  }
  toJSON() {
    return {
      defined: this.defined,
      code: this.code,
      status: this.status,
      message: this.message,
      data: this.data
    };
  }
  /**
   * Workaround for Next.js where different contexts use separate
   * dependency graphs, causing multiple ORPCError constructors existing and breaking
   * `instanceof` checks across contexts.
   *
   * This is particularly problematic with "Optimized SSR", where orpc-client
   * executes in one context but is invoked from another. When an error is thrown
   * in the execution context, `instanceof ORPCError` checks fail in the
   * invocation context due to separate class constructors.
   *
   * @todo Remove this and related code if Next.js resolves the multiple dependency graph issue.
   */
  static [Symbol.hasInstance](instance) {
    if (globalORPCErrorConstructors.has(this)) {
      const constructor = getConstructor(instance);
      if (constructor && globalORPCErrorConstructors.has(constructor)) {
        return true;
      }
    }
    return super[Symbol.hasInstance](instance);
  }
}
globalORPCErrorConstructors.add(ORPCError);
function toORPCError(error) {
  return error instanceof ORPCError ? error : new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "Internal server error",
    cause: error
  });
}
function isORPCErrorStatus(status) {
  return status < 200 || status >= 400;
}
function isORPCErrorJson(json) {
  if (!isObject(json)) {
    return false;
  }
  const validKeys = ["defined", "code", "status", "message", "data"];
  if (Object.keys(json).some((k) => !validKeys.includes(k))) {
    return false;
  }
  return "defined" in json && typeof json.defined === "boolean" && "code" in json && typeof json.code === "string" && "status" in json && typeof json.status === "number" && isORPCErrorStatus(json.status) && "message" in json && typeof json.message === "string";
}
function createORPCErrorFromJson(json, options = {}) {
  return new ORPCError(json.code, {
    ...options,
    ...json
  });
}
function mapEventIterator(iterator, maps) {
  const mapError = async (error) => {
    let mappedError = await maps.error(error);
    if (mappedError !== error) {
      const meta = getEventMeta(error);
      if (meta && isTypescriptObject(mappedError)) {
        mappedError = withEventMeta(mappedError, meta);
      }
    }
    return mappedError;
  };
  return new AsyncIteratorClass(async () => {
    const { done, value: value2 } = await (async () => {
      try {
        return await iterator.next();
      } catch (error) {
        throw await mapError(error);
      }
    })();
    let mappedValue = await maps.value(value2, done);
    if (mappedValue !== value2) {
      const meta = getEventMeta(value2);
      if (meta && isTypescriptObject(mappedValue)) {
        mappedValue = withEventMeta(mappedValue, meta);
      }
    }
    return { done, value: mappedValue };
  }, async () => {
    var _a;
    try {
      await ((_a = iterator.return) == null ? void 0 : _a.call(iterator));
    } catch (error) {
      throw await mapError(error);
    }
  });
}
const STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES = {
  BIGINT: 0,
  DATE: 1,
  NAN: 2,
  UNDEFINED: 3,
  URL: 4,
  REGEXP: 5,
  SET: 6,
  MAP: 7
};
class StandardRPCJsonSerializer {
  constructor(options = {}) {
    __publicField(this, "customSerializers");
    this.customSerializers = options.customJsonSerializers ?? [];
    if (this.customSerializers.length !== new Set(this.customSerializers.map((custom) => custom.type)).size) {
      throw new Error("Custom serializer type must be unique.");
    }
  }
  serialize(data, segments = [], meta = [], maps = [], blobs = []) {
    for (const custom of this.customSerializers) {
      if (custom.condition(data)) {
        const result = this.serialize(custom.serialize(data), segments, meta, maps, blobs);
        meta.push([custom.type, ...segments]);
        return result;
      }
    }
    if (data instanceof Blob) {
      maps.push(segments);
      blobs.push(data);
      return [data, meta, maps, blobs];
    }
    if (typeof data === "bigint") {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof Date) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE, ...segments]);
      if (Number.isNaN(data.getTime())) {
        return [null, meta, maps, blobs];
      }
      return [data.toISOString(), meta, maps, blobs];
    }
    if (Number.isNaN(data)) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN, ...segments]);
      return [null, meta, maps, blobs];
    }
    if (data instanceof URL) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof RegExp) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof Set) {
      const result = this.serialize(Array.from(data), segments, meta, maps, blobs);
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET, ...segments]);
      return result;
    }
    if (data instanceof Map) {
      const result = this.serialize(Array.from(data.entries()), segments, meta, maps, blobs);
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP, ...segments]);
      return result;
    }
    if (Array.isArray(data)) {
      const json = data.map((v, i) => {
        if (v === void 0) {
          meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED, ...segments, i]);
          return v;
        }
        return this.serialize(v, [...segments, i], meta, maps, blobs)[0];
      });
      return [json, meta, maps, blobs];
    }
    if (isObject(data)) {
      const json = {};
      for (const k in data) {
        if (k === "toJSON" && typeof data[k] === "function") {
          continue;
        }
        json[k] = this.serialize(data[k], [...segments, k], meta, maps, blobs)[0];
      }
      return [json, meta, maps, blobs];
    }
    return [data, meta, maps, blobs];
  }
  deserialize(json, meta, maps, getBlob) {
    const ref = { data: json };
    if (maps && getBlob) {
      maps.forEach((segments, i) => {
        let currentRef = ref;
        let preSegment = "data";
        segments.forEach((segment) => {
          currentRef = currentRef[preSegment];
          preSegment = segment;
        });
        currentRef[preSegment] = getBlob(i);
      });
    }
    for (const item of meta) {
      const type = item[0];
      let currentRef = ref;
      let preSegment = "data";
      for (let i = 1; i < item.length; i++) {
        currentRef = currentRef[preSegment];
        preSegment = item[i];
      }
      for (const custom of this.customSerializers) {
        if (custom.type === type) {
          currentRef[preSegment] = custom.deserialize(currentRef[preSegment]);
          break;
        }
      }
      switch (type) {
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT:
          currentRef[preSegment] = BigInt(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE:
          currentRef[preSegment] = new Date(currentRef[preSegment] ?? "Invalid Date");
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN:
          currentRef[preSegment] = Number.NaN;
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED:
          currentRef[preSegment] = void 0;
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL:
          currentRef[preSegment] = new URL(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP: {
          const [, pattern, flags] = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/);
          currentRef[preSegment] = new RegExp(pattern, flags);
          break;
        }
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET:
          currentRef[preSegment] = new Set(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP:
          currentRef[preSegment] = new Map(currentRef[preSegment]);
          break;
      }
    }
    return ref.data;
  }
}
function toHttpPath(path2) {
  return `/${path2.map(encodeURIComponent).join("/")}`;
}
class StandardRPCSerializer {
  constructor(jsonSerializer) {
    __privateAdd(this, _StandardRPCSerializer_instances);
    this.jsonSerializer = jsonSerializer;
  }
  serialize(data) {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value2) => __privateMethod(this, _StandardRPCSerializer_instances, serialize_fn).call(this, value2, false),
        error: async (e) => {
          return new ErrorEvent({
            data: __privateMethod(this, _StandardRPCSerializer_instances, serialize_fn).call(this, toORPCError(e).toJSON(), false),
            cause: e
          });
        }
      });
    }
    return __privateMethod(this, _StandardRPCSerializer_instances, serialize_fn).call(this, data, true);
  }
  deserialize(data) {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value2) => __privateMethod(this, _StandardRPCSerializer_instances, deserialize_fn).call(this, value2),
        error: async (e) => {
          if (!(e instanceof ErrorEvent)) {
            return e;
          }
          const deserialized = __privateMethod(this, _StandardRPCSerializer_instances, deserialize_fn).call(this, e.data);
          if (isORPCErrorJson(deserialized)) {
            return createORPCErrorFromJson(deserialized, { cause: e });
          }
          return new ErrorEvent({
            data: deserialized,
            cause: e
          });
        }
      });
    }
    return __privateMethod(this, _StandardRPCSerializer_instances, deserialize_fn).call(this, data);
  }
}
_StandardRPCSerializer_instances = new WeakSet();
serialize_fn = function(data, enableFormData) {
  const [json, meta_, maps, blobs] = this.jsonSerializer.serialize(data);
  const meta = meta_.length === 0 ? void 0 : meta_;
  if (!enableFormData || blobs.length === 0) {
    return {
      json,
      meta
    };
  }
  const form = new FormData();
  form.set("data", stringifyJSON({ json, meta, maps }));
  blobs.forEach((blob, i) => {
    form.set(i.toString(), blob);
  });
  return form;
};
deserialize_fn = function(data) {
  if (data === void 0) {
    return void 0;
  }
  if (!(data instanceof FormData)) {
    return this.jsonSerializer.deserialize(data.json, data.meta ?? []);
  }
  const serialized = JSON.parse(data.get("data"));
  return this.jsonSerializer.deserialize(
    serialized.json,
    serialized.meta ?? [],
    serialized.maps,
    (i) => data.get(i.toString())
  );
};
function postMessagePortMessage(port, data, transfer) {
  if (transfer) {
    port.postMessage(data, transfer);
  } else {
    port.postMessage(data);
  }
}
function onMessagePortMessage(port, callback) {
  if ("addEventListener" in port) {
    port.addEventListener("message", (event) => {
      callback(event.data);
    });
  } else if ("on" in port) {
    port.on("message", (event) => {
      callback(event == null ? void 0 : event.data);
    });
  } else if ("onMessage" in port) {
    port.onMessage.addListener((data) => {
      callback(data);
    });
  } else {
    throw new Error("Cannot find a addEventListener/on/onMessage method on the port");
  }
}
function onMessagePortClose(port, callback) {
  if ("addEventListener" in port) {
    port.addEventListener("close", async () => {
      callback();
    });
  } else if ("on" in port) {
    port.on("close", async () => {
      callback();
    });
  } else if ("onDisconnect" in port) {
    port.onDisconnect.addListener(() => {
      callback();
    });
  } else {
    throw new Error("Cannot find a addEventListener/on/onDisconnect method on the port");
  }
}
class ValidationError extends Error {
  constructor(options) {
    super(options.message, options);
    __publicField(this, "issues");
    __publicField(this, "data");
    this.issues = options.issues;
    this.data = options.data;
  }
}
function mergeErrorMap(errorMap1, errorMap2) {
  return { ...errorMap1, ...errorMap2 };
}
async function validateORPCError(map, error) {
  const { code, status, message, data, cause, defined } = error;
  const config = map == null ? void 0 : map[error.code];
  if (!config || fallbackORPCErrorStatus(error.code, config.status) !== error.status) {
    return defined ? new ORPCError(code, { defined: false, status, message, data, cause }) : error;
  }
  if (!config.data) {
    return defined ? error : new ORPCError(code, { defined: true, status, message, data, cause });
  }
  const validated = await config.data["~standard"].validate(error.data);
  if (validated.issues) {
    return defined ? new ORPCError(code, { defined: false, status, message, data, cause }) : error;
  }
  return new ORPCError(code, { defined: true, status, message, data: validated.value, cause });
}
class ContractProcedure {
  constructor(def) {
    /**
     * This property holds the defined options for the contract procedure.
     */
    __publicField(this, "~orpc");
    var _a;
    if (((_a = def.route) == null ? void 0 : _a.successStatus) && isORPCErrorStatus(def.route.successStatus)) {
      throw new Error("[ContractProcedure] Invalid successStatus.");
    }
    if (Object.values(def.errorMap).some((val) => val && val.status && !isORPCErrorStatus(val.status))) {
      throw new Error("[ContractProcedure] Invalid error status code.");
    }
    this["~orpc"] = def;
  }
}
function isContractProcedure(item) {
  if (item instanceof ContractProcedure) {
    return true;
  }
  return (typeof item === "object" || typeof item === "function") && item !== null && "~orpc" in item && typeof item["~orpc"] === "object" && item["~orpc"] !== null && "errorMap" in item["~orpc"] && "route" in item["~orpc"] && "meta" in item["~orpc"];
}
function mergeMeta(meta1, meta2) {
  return { ...meta1, ...meta2 };
}
function mergeRoute(a, b) {
  return { ...a, ...b };
}
function prefixRoute(route, prefix) {
  if (!route.path) {
    return route;
  }
  return {
    ...route,
    path: `${prefix}${route.path}`
  };
}
function unshiftTagRoute(route, tags) {
  return {
    ...route,
    tags: [...tags, ...route.tags ?? []]
  };
}
function mergePrefix(a, b) {
  return a ? `${a}${b}` : b;
}
function mergeTags(a, b) {
  return a ? [...a, ...b] : b;
}
function enhanceRoute(route, options) {
  var _a;
  let router2 = route;
  if (options.prefix) {
    router2 = prefixRoute(router2, options.prefix);
  }
  if ((_a = options.tags) == null ? void 0 : _a.length) {
    router2 = unshiftTagRoute(router2, options.tags);
  }
  return router2;
}
function enhanceContractRouter(router2, options) {
  if (isContractProcedure(router2)) {
    const enhanced2 = new ContractProcedure({
      ...router2["~orpc"],
      errorMap: mergeErrorMap(options.errorMap, router2["~orpc"].errorMap),
      route: enhanceRoute(router2["~orpc"].route, options)
    });
    return enhanced2;
  }
  const enhanced = {};
  for (const key in router2) {
    enhanced[key] = enhanceContractRouter(router2[key], options);
  }
  return enhanced;
}
class ContractBuilder extends ContractProcedure {
  constructor(def) {
    super(def);
    this["~orpc"].prefix = def.prefix;
    this["~orpc"].tags = def.tags;
  }
  /**
   * Sets or overrides the initial meta.
   *
   * @see {@link https://orpc.dev/docs/metadata Metadata Docs}
   */
  $meta(initialMeta) {
    return new ContractBuilder({
      ...this["~orpc"],
      meta: initialMeta
    });
  }
  /**
   * Sets or overrides the initial route.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.dev/docs/openapi/routing OpenAPI Routing Docs}
   * @see {@link https://orpc.dev/docs/openapi/input-output-structure OpenAPI Input/Output Structure Docs}
   */
  $route(initialRoute) {
    return new ContractBuilder({
      ...this["~orpc"],
      route: initialRoute
    });
  }
  /**
   * Sets or overrides the initial input schema.
   *
   * @see {@link https://orpc.dev/docs/procedure#initial-configuration Initial Procedure Configuration Docs}
   */
  $input(initialInputSchema) {
    return new ContractBuilder({
      ...this["~orpc"],
      inputSchema: initialInputSchema
    });
  }
  /**
   * Adds type-safe custom errors to the contract.
   * The provided errors are spared-merged with any existing errors in the contract.
   *
   * @see {@link https://orpc.dev/docs/error-handling#type%E2%80%90safe-error-handling Type-Safe Error Handling Docs}
   */
  errors(errors) {
    return new ContractBuilder({
      ...this["~orpc"],
      errorMap: mergeErrorMap(this["~orpc"].errorMap, errors)
    });
  }
  /**
   * Sets or updates the metadata for the contract.
   * The provided metadata is spared-merged with any existing metadata in the contract.
   *
   * @see {@link https://orpc.dev/docs/metadata Metadata Docs}
   */
  meta(meta) {
    return new ContractBuilder({
      ...this["~orpc"],
      meta: mergeMeta(this["~orpc"].meta, meta)
    });
  }
  /**
   * Sets or updates the route definition for the contract.
   * The provided route is spared-merged with any existing route in the contract.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.dev/docs/openapi/routing OpenAPI Routing Docs}
   * @see {@link https://orpc.dev/docs/openapi/input-output-structure OpenAPI Input/Output Structure Docs}
   */
  route(route) {
    return new ContractBuilder({
      ...this["~orpc"],
      route: mergeRoute(this["~orpc"].route, route)
    });
  }
  /**
   * Defines the input validation schema for the contract.
   *
   * @see {@link https://orpc.dev/docs/procedure#input-output-validation Input Validation Docs}
   */
  input(schema) {
    return new ContractBuilder({
      ...this["~orpc"],
      inputSchema: schema
    });
  }
  /**
   * Defines the output validation schema for the contract.
   *
   * @see {@link https://orpc.dev/docs/procedure#input-output-validation Output Validation Docs}
   */
  output(schema) {
    return new ContractBuilder({
      ...this["~orpc"],
      outputSchema: schema
    });
  }
  /**
   * Prefixes all procedures in the contract router.
   * The provided prefix is post-appended to any existing router prefix.
   *
   * @note This option does not affect procedures that do not define a path in their route definition.
   *
   * @see {@link https://orpc.dev/docs/openapi/routing#route-prefixes OpenAPI Route Prefixes Docs}
   */
  prefix(prefix) {
    return new ContractBuilder({
      ...this["~orpc"],
      prefix: mergePrefix(this["~orpc"].prefix, prefix)
    });
  }
  /**
   * Adds tags to all procedures in the contract router.
   * This helpful when you want to group procedures together in the OpenAPI specification.
   *
   * @see {@link https://orpc.dev/docs/openapi/openapi-specification#operation-metadata OpenAPI Operation Metadata Docs}
   */
  tag(...tags) {
    return new ContractBuilder({
      ...this["~orpc"],
      tags: mergeTags(this["~orpc"].tags, tags)
    });
  }
  /**
   * Applies all of the previously defined options to the specified contract router.
   *
   * @see {@link https://orpc.dev/docs/router#extending-router Extending Router Docs}
   */
  router(router2) {
    return enhanceContractRouter(router2, this["~orpc"]);
  }
}
new ContractBuilder({
  errorMap: {},
  route: {},
  meta: {}
});
function resolveFriendlyStandardHandleOptions(options) {
  return {
    ...options,
    context: options.context ?? {}
    // Context only optional if all fields are optional
  };
}
function createServerPeerHandleRequestFn(handler2, options) {
  return async (request) => {
    const { response } = await handler2.handle(
      { ...request, body: () => Promise.resolve(request.body) },
      resolveFriendlyStandardHandleOptions(options)
    );
    return response ?? { status: 404, headers: {}, body: "No procedure matched" };
  };
}
const LAZY_SYMBOL = Symbol("ORPC_LAZY_SYMBOL");
function lazy(loader, meta = {}) {
  return {
    [LAZY_SYMBOL]: {
      loader,
      meta
    }
  };
}
function isLazy(item) {
  return (typeof item === "object" || typeof item === "function") && item !== null && LAZY_SYMBOL in item;
}
function getLazyMeta(lazied) {
  return lazied[LAZY_SYMBOL].meta;
}
function unlazy(lazied) {
  return isLazy(lazied) ? lazied[LAZY_SYMBOL].loader() : Promise.resolve({ default: lazied });
}
function isStartWithMiddlewares(middlewares, compare) {
  if (compare.length > middlewares.length) {
    return false;
  }
  for (let i = 0; i < middlewares.length; i++) {
    if (compare[i] === void 0) {
      return true;
    }
    if (middlewares[i] !== compare[i]) {
      return false;
    }
  }
  return true;
}
function mergeMiddlewares(first, second, options) {
  if (options.dedupeLeading && isStartWithMiddlewares(second, first)) {
    return second;
  }
  return [...first, ...second];
}
function addMiddleware(middlewares, addition) {
  return [...middlewares, addition];
}
class Procedure {
  constructor(def) {
    /**
     * This property holds the defined options.
     */
    __publicField(this, "~orpc");
    this["~orpc"] = def;
  }
}
function isProcedure(item) {
  if (item instanceof Procedure) {
    return true;
  }
  return isContractProcedure(item) && "middlewares" in item["~orpc"] && "inputValidationIndex" in item["~orpc"] && "outputValidationIndex" in item["~orpc"] && "handler" in item["~orpc"];
}
function mergeCurrentContext(context, other) {
  return { ...context, ...other };
}
function createORPCErrorConstructorMap(errors) {
  const proxy = new Proxy(errors, {
    get(target, code) {
      if (typeof code !== "string") {
        return Reflect.get(target, code);
      }
      const item = (...rest) => {
        const options = resolveMaybeOptionalOptions(rest);
        const config = errors[code];
        return new ORPCError(code, {
          defined: Boolean(config),
          status: config == null ? void 0 : config.status,
          message: options.message ?? (config == null ? void 0 : config.message),
          data: options.data,
          cause: options.cause
        });
      };
      return item;
    }
  });
  return proxy;
}
function middlewareOutputFn(output) {
  return { output, context: {} };
}
function createProcedureClient(lazyableProcedure, ...rest) {
  const options = resolveMaybeOptionalOptions(rest);
  return async (...[input, callerOptions]) => {
    const path2 = toArray(options.path);
    const { default: procedure } = await unlazy(lazyableProcedure);
    const clientContext = (callerOptions == null ? void 0 : callerOptions.context) ?? {};
    const context = await value(options.context ?? {}, clientContext);
    const errors = createORPCErrorConstructorMap(procedure["~orpc"].errorMap);
    const validateError = async (e) => {
      if (e instanceof ORPCError) {
        return await validateORPCError(procedure["~orpc"].errorMap, e);
      }
      return e;
    };
    try {
      const output = await runWithSpan(
        { name: "call_procedure", signal: callerOptions == null ? void 0 : callerOptions.signal },
        (span) => {
          span == null ? void 0 : span.setAttribute("procedure.path", [...path2]);
          return intercept(
            toArray(options.interceptors),
            {
              context,
              input,
              // input only optional when it undefinable so we can safely cast it
              errors,
              path: path2,
              procedure,
              signal: callerOptions == null ? void 0 : callerOptions.signal,
              lastEventId: callerOptions == null ? void 0 : callerOptions.lastEventId
            },
            (interceptorOptions) => executeProcedureInternal(interceptorOptions.procedure, interceptorOptions)
          );
        }
      );
      if (isAsyncIteratorObject(output)) {
        if (output instanceof HibernationEventIterator) {
          return output;
        }
        return overlayProxy(output, mapEventIterator(
          asyncIteratorWithSpan(
            { name: "consume_event_iterator_output", signal: callerOptions == null ? void 0 : callerOptions.signal },
            output
          ),
          {
            value: (v) => v,
            error: (e) => validateError(e)
          }
        ));
      }
      return output;
    } catch (e) {
      throw await validateError(e);
    }
  };
}
async function validateInput(procedure, input) {
  const schema = procedure["~orpc"].inputSchema;
  if (!schema) {
    return input;
  }
  return runWithSpan(
    { name: "validate_input" },
    async () => {
      const result = await schema["~standard"].validate(input);
      if (result.issues) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Input validation failed",
          data: {
            issues: result.issues
          },
          cause: new ValidationError({
            message: "Input validation failed",
            issues: result.issues,
            data: input
          })
        });
      }
      return result.value;
    }
  );
}
async function validateOutput(procedure, output) {
  const schema = procedure["~orpc"].outputSchema;
  if (!schema) {
    return output;
  }
  return runWithSpan(
    { name: "validate_output" },
    async () => {
      const result = await schema["~standard"].validate(output);
      if (result.issues) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Output validation failed",
          cause: new ValidationError({
            message: "Output validation failed",
            issues: result.issues,
            data: output
          })
        });
      }
      return result.value;
    }
  );
}
async function executeProcedureInternal(procedure, options) {
  const middlewares = procedure["~orpc"].middlewares;
  const inputValidationIndex = Math.min(Math.max(0, procedure["~orpc"].inputValidationIndex), middlewares.length);
  const outputValidationIndex = Math.min(Math.max(0, procedure["~orpc"].outputValidationIndex), middlewares.length);
  const next = async (index, context, input) => {
    let currentInput = input;
    if (index === inputValidationIndex) {
      currentInput = await validateInput(procedure, currentInput);
    }
    const mid = middlewares[index];
    const output = mid ? await runWithSpan(
      { name: `middleware.${mid.name}`, signal: options.signal },
      async (span) => {
        span == null ? void 0 : span.setAttribute("middleware.index", index);
        span == null ? void 0 : span.setAttribute("middleware.name", mid.name);
        const result = await mid({
          ...options,
          context,
          next: async (...[nextOptions]) => {
            const nextContext = (nextOptions == null ? void 0 : nextOptions.context) ?? {};
            return {
              output: await next(index + 1, mergeCurrentContext(context, nextContext), currentInput),
              context: nextContext
            };
          }
        }, currentInput, middlewareOutputFn);
        return result.output;
      }
    ) : await runWithSpan(
      { name: "handler", signal: options.signal },
      () => procedure["~orpc"].handler({ ...options, context, input: currentInput })
    );
    if (index === outputValidationIndex) {
      return await validateOutput(procedure, output);
    }
    return output;
  };
  return next(0, options.context, options.input);
}
const HIDDEN_ROUTER_CONTRACT_SYMBOL = Symbol("ORPC_HIDDEN_ROUTER_CONTRACT");
function getHiddenRouterContract(router2) {
  return router2[HIDDEN_ROUTER_CONTRACT_SYMBOL];
}
function getRouter(router2, path2) {
  let current = router2;
  for (let i = 0; i < path2.length; i++) {
    const segment = path2[i];
    if (!current) {
      return void 0;
    }
    if (isProcedure(current)) {
      return void 0;
    }
    if (!isLazy(current)) {
      current = current[segment];
      continue;
    }
    const lazied = current;
    const rest = path2.slice(i);
    return lazy(async () => {
      const unwrapped = await unlazy(lazied);
      const next = getRouter(unwrapped.default, rest);
      return unlazy(next);
    }, getLazyMeta(lazied));
  }
  return current;
}
function createAccessibleLazyRouter(lazied) {
  const recursive = new Proxy(lazied, {
    get(target, key) {
      if (typeof key !== "string") {
        return Reflect.get(target, key);
      }
      const next = getRouter(lazied, [key]);
      return createAccessibleLazyRouter(next);
    }
  });
  return recursive;
}
function enhanceRouter(router2, options) {
  if (isLazy(router2)) {
    const laziedMeta = getLazyMeta(router2);
    const enhancedPrefix = (laziedMeta == null ? void 0 : laziedMeta.prefix) ? mergePrefix(options.prefix, laziedMeta == null ? void 0 : laziedMeta.prefix) : options.prefix;
    const enhanced2 = lazy(async () => {
      const { default: unlaziedRouter } = await unlazy(router2);
      const enhanced3 = enhanceRouter(unlaziedRouter, options);
      return unlazy(enhanced3);
    }, {
      ...laziedMeta,
      prefix: enhancedPrefix
    });
    const accessible = createAccessibleLazyRouter(enhanced2);
    return accessible;
  }
  if (isProcedure(router2)) {
    const newMiddlewares = mergeMiddlewares(options.middlewares, router2["~orpc"].middlewares, { dedupeLeading: options.dedupeLeadingMiddlewares });
    const newMiddlewareAdded = newMiddlewares.length - router2["~orpc"].middlewares.length;
    const enhanced2 = new Procedure({
      ...router2["~orpc"],
      route: enhanceRoute(router2["~orpc"].route, options),
      errorMap: mergeErrorMap(options.errorMap, router2["~orpc"].errorMap),
      middlewares: newMiddlewares,
      inputValidationIndex: router2["~orpc"].inputValidationIndex + newMiddlewareAdded,
      outputValidationIndex: router2["~orpc"].outputValidationIndex + newMiddlewareAdded
    });
    return enhanced2;
  }
  const enhanced = {};
  for (const key in router2) {
    enhanced[key] = enhanceRouter(router2[key], options);
  }
  return enhanced;
}
function traverseContractProcedures(options, callback, lazyOptions = []) {
  let currentRouter = options.router;
  const hiddenContract = getHiddenRouterContract(options.router);
  if (hiddenContract !== void 0) {
    currentRouter = hiddenContract;
  }
  if (isLazy(currentRouter)) {
    lazyOptions.push({
      router: currentRouter,
      path: options.path
    });
  } else if (isContractProcedure(currentRouter)) {
    callback({
      contract: currentRouter,
      path: options.path
    });
  } else {
    for (const key in currentRouter) {
      traverseContractProcedures(
        {
          router: currentRouter[key],
          path: [...options.path, key]
        },
        callback,
        lazyOptions
      );
    }
  }
  return lazyOptions;
}
function createContractedProcedure(procedure, contract) {
  return new Procedure({
    ...procedure["~orpc"],
    errorMap: contract["~orpc"].errorMap,
    route: contract["~orpc"].route,
    meta: contract["~orpc"].meta
  });
}
class CompositeStandardHandlerPlugin {
  constructor(plugins = []) {
    __publicField(this, "plugins");
    this.plugins = [...plugins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  init(options, router2) {
    var _a;
    for (const plugin of this.plugins) {
      (_a = plugin.init) == null ? void 0 : _a.call(plugin, options, router2);
    }
  }
}
class StandardHandler {
  constructor(router2, matcher, codec, options) {
    __publicField(this, "interceptors");
    __publicField(this, "clientInterceptors");
    __publicField(this, "rootInterceptors");
    this.matcher = matcher;
    this.codec = codec;
    const plugins = new CompositeStandardHandlerPlugin(options.plugins);
    plugins.init(options, router2);
    this.interceptors = toArray(options.interceptors);
    this.clientInterceptors = toArray(options.clientInterceptors);
    this.rootInterceptors = toArray(options.rootInterceptors);
    this.matcher.init(router2);
  }
  async handle(request, options) {
    var _a;
    const prefix = ((_a = options.prefix) == null ? void 0 : _a.replace(/\/$/, "")) || void 0;
    if (prefix && !request.url.pathname.startsWith(`${prefix}/`) && request.url.pathname !== prefix) {
      return { matched: false, response: void 0 };
    }
    return intercept(
      this.rootInterceptors,
      { ...options, request, prefix },
      async (interceptorOptions) => {
        return runWithSpan(
          { name: `${request.method} ${request.url.pathname}` },
          async (span) => {
            let step;
            try {
              return await intercept(
                this.interceptors,
                interceptorOptions,
                async ({ request: request2, context, prefix: prefix2 }) => {
                  const method = request2.method;
                  const url = request2.url;
                  const pathname = prefix2 ? url.pathname.replace(prefix2, "") : url.pathname;
                  const match = await runWithSpan(
                    { name: "find_procedure" },
                    () => this.matcher.match(method, `/${pathname.replace(/^\/|\/$/g, "")}`)
                  );
                  if (!match) {
                    return { matched: false, response: void 0 };
                  }
                  span == null ? void 0 : span.updateName(`${ORPC_NAME}.${match.path.join("/")}`);
                  span == null ? void 0 : span.setAttribute("rpc.system", ORPC_NAME);
                  span == null ? void 0 : span.setAttribute("rpc.method", match.path.join("."));
                  step = "decode_input";
                  let input = await runWithSpan(
                    { name: "decode_input" },
                    () => this.codec.decode(request2, match.params, match.procedure)
                  );
                  step = void 0;
                  if (isAsyncIteratorObject(input)) {
                    input = asyncIteratorWithSpan(
                      { name: "consume_event_iterator_input", signal: request2.signal },
                      input
                    );
                  }
                  const client = createProcedureClient(match.procedure, {
                    context,
                    path: match.path,
                    interceptors: this.clientInterceptors
                  });
                  step = "call_procedure";
                  const output = await client(input, {
                    signal: request2.signal,
                    lastEventId: flattenHeader(request2.headers["last-event-id"])
                  });
                  step = void 0;
                  const response = this.codec.encode(output, match.procedure);
                  return {
                    matched: true,
                    response
                  };
                }
              );
            } catch (e) {
              if (step !== "call_procedure") {
                setSpanError(span, e);
              }
              const error = step === "decode_input" && !(e instanceof ORPCError) ? new ORPCError("BAD_REQUEST", {
                message: `Malformed request. Ensure the request body is properly formatted and the 'Content-Type' header is set correctly.`,
                cause: e
              }) : toORPCError(e);
              const response = this.codec.encodeError(error);
              return {
                matched: true,
                response
              };
            }
          }
        );
      }
    );
  }
}
class StandardRPCCodec {
  constructor(serializer) {
    this.serializer = serializer;
  }
  async decode(request, _params, _procedure) {
    const serialized = request.method === "GET" ? parseEmptyableJSON(request.url.searchParams.getAll("data").at(-1)) : await request.body();
    return this.serializer.deserialize(serialized);
  }
  encode(output, _procedure) {
    return {
      status: 200,
      headers: {},
      body: this.serializer.serialize(output)
    };
  }
  encodeError(error) {
    return {
      status: error.status,
      headers: {},
      body: this.serializer.serialize(error.toJSON())
    };
  }
}
class StandardRPCMatcher {
  constructor(options = {}) {
    __publicField(this, "filter");
    __publicField(this, "tree", new NullProtoObj());
    __publicField(this, "pendingRouters", []);
    this.filter = options.filter ?? true;
  }
  init(router2, path2 = []) {
    const laziedOptions = traverseContractProcedures({ router: router2, path: path2 }, (traverseOptions) => {
      if (!value(this.filter, traverseOptions)) {
        return;
      }
      const { path: path22, contract } = traverseOptions;
      const httpPath = toHttpPath(path22);
      if (isProcedure(contract)) {
        this.tree[httpPath] = {
          path: path22,
          contract,
          procedure: contract,
          // this mean dev not used contract-first so we can used contract as procedure directly
          router: router2
        };
      } else {
        this.tree[httpPath] = {
          path: path22,
          contract,
          procedure: void 0,
          router: router2
        };
      }
    });
    this.pendingRouters.push(...laziedOptions.map((option) => ({
      ...option,
      httpPathPrefix: toHttpPath(option.path)
    })));
  }
  async match(_method, pathname) {
    if (this.pendingRouters.length) {
      const newPendingRouters = [];
      for (const pendingRouter of this.pendingRouters) {
        if (pathname.startsWith(pendingRouter.httpPathPrefix)) {
          const { default: router2 } = await unlazy(pendingRouter.router);
          this.init(router2, pendingRouter.path);
        } else {
          newPendingRouters.push(pendingRouter);
        }
      }
      this.pendingRouters = newPendingRouters;
    }
    const match = this.tree[pathname];
    if (!match) {
      return void 0;
    }
    if (!match.procedure) {
      const { default: maybeProcedure } = await unlazy(getRouter(match.router, match.path));
      if (!isProcedure(maybeProcedure)) {
        throw new Error(`
          [Contract-First] Missing or invalid implementation for procedure at path: ${toHttpPath(match.path)}.
          Ensure that the procedure is correctly defined and matches the expected contract.
        `);
      }
      match.procedure = createContractedProcedure(maybeProcedure, match.contract);
    }
    return {
      path: match.path,
      procedure: match.procedure
    };
  }
}
class StandardRPCHandler extends StandardHandler {
  constructor(router2, options = {}) {
    const jsonSerializer = new StandardRPCJsonSerializer(options);
    const serializer = new StandardRPCSerializer(jsonSerializer);
    const matcher = new StandardRPCMatcher(options);
    const codec = new StandardRPCCodec(serializer);
    super(router2, matcher, codec, options);
  }
}
class MessagePortHandler {
  constructor(standardHandler, options = {}) {
    __publicField(this, "transfer");
    this.standardHandler = standardHandler;
    this.transfer = options.experimental_transfer;
  }
  upgrade(port, ...rest) {
    const peer = new experimental_ServerPeerWithoutCodec(async (message) => {
      const [id, type, payload] = message;
      const transfer = await value(this.transfer, message, port);
      if (transfer) {
        postMessagePortMessage(port, serializeResponseMessage(id, type, payload), transfer);
      } else {
        postMessagePortMessage(port, await encodeResponseMessage(id, type, payload));
      }
    });
    onMessagePortMessage(port, async (message) => {
      const handleFn = createServerPeerHandleRequestFn(this.standardHandler, resolveMaybeOptionalOptions(rest));
      if (isObject(message)) {
        await peer.message(
          deserializeRequestMessage(message),
          handleFn
        );
      } else {
        await peer.message(
          await decodeRequestMessage(message),
          handleFn
        );
      }
    });
    onMessagePortClose(port, () => {
      peer.close();
    });
  }
}
class RPCHandler extends MessagePortHandler {
  constructor(router2, options = {}) {
    super(new StandardRPCHandler(router2, options), options);
  }
}
const DEFAULT_CONFIG = {
  initialInputValidationIndex: 0,
  initialOutputValidationIndex: 0,
  dedupeLeadingMiddlewares: true
};
function fallbackConfig(key, value2) {
  if (value2 === void 0) {
    return DEFAULT_CONFIG[key];
  }
  return value2;
}
function decorateMiddleware(middleware) {
  const decorated = (...args) => middleware(...args);
  decorated.mapInput = (mapInput) => {
    const mapped = decorateMiddleware(
      (options, input, ...rest) => middleware(options, mapInput(input), ...rest)
    );
    return mapped;
  };
  decorated.concat = (concatMiddleware, mapInput) => {
    const mapped = mapInput ? decorateMiddleware(concatMiddleware).mapInput(mapInput) : concatMiddleware;
    const concatted = decorateMiddleware((options, input, output, ...rest) => {
      const merged = middleware({
        ...options,
        next: (...[nextOptions1]) => mapped({
          ...options,
          context: { ...options.context, ...nextOptions1 == null ? void 0 : nextOptions1.context },
          next: (...[nextOptions2]) => options.next({ context: { ...nextOptions1 == null ? void 0 : nextOptions1.context, ...nextOptions2 == null ? void 0 : nextOptions2.context } })
        }, input, output, ...rest)
      }, input, output, ...rest);
      return merged;
    });
    return concatted;
  };
  return decorated;
}
function createActionableClient(client) {
  const action = async (input) => {
    try {
      return [null, await client(input)];
    } catch (error) {
      if (error instanceof Error && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_")) {
        throw error;
      }
      if (error instanceof Response && "options" in error && isObject(error.options) || isObject(error) && error.isNotFound === true) {
        throw error;
      }
      return [toORPCError(error).toJSON(), void 0];
    }
  };
  return action;
}
class DecoratedProcedure extends Procedure {
  /**
   * Adds type-safe custom errors.
   * The provided errors are spared-merged with any existing errors.
   *
   * @see {@link https://orpc.dev/docs/error-handling#type%E2%80%90safe-error-handling Type-Safe Error Handling Docs}
   */
  errors(errors) {
    return new DecoratedProcedure({
      ...this["~orpc"],
      errorMap: mergeErrorMap(this["~orpc"].errorMap, errors)
    });
  }
  /**
   * Sets or updates the metadata.
   * The provided metadata is spared-merged with any existing metadata.
   *
   * @see {@link https://orpc.dev/docs/metadata Metadata Docs}
   */
  meta(meta) {
    return new DecoratedProcedure({
      ...this["~orpc"],
      meta: mergeMeta(this["~orpc"].meta, meta)
    });
  }
  /**
   * Sets or updates the route definition.
   * The provided route is spared-merged with any existing route.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.dev/docs/openapi/routing OpenAPI Routing Docs}
   * @see {@link https://orpc.dev/docs/openapi/input-output-structure OpenAPI Input/Output Structure Docs}
   */
  route(route) {
    return new DecoratedProcedure({
      ...this["~orpc"],
      route: mergeRoute(this["~orpc"].route, route)
    });
  }
  use(middleware, mapInput) {
    const mapped = mapInput ? decorateMiddleware(middleware).mapInput(mapInput) : middleware;
    return new DecoratedProcedure({
      ...this["~orpc"],
      middlewares: addMiddleware(this["~orpc"].middlewares, mapped)
    });
  }
  /**
   * Make this procedure callable (works like a function while still being a procedure).
   *
   * @see {@link https://orpc.dev/docs/client/server-side Server-side Client Docs}
   */
  callable(...rest) {
    const client = createProcedureClient(this, ...rest);
    return new Proxy(client, {
      get: (target, key) => {
        return Reflect.has(this, key) ? Reflect.get(this, key) : Reflect.get(target, key);
      },
      has: (target, key) => {
        return Reflect.has(this, key) || Reflect.has(target, key);
      }
    });
  }
  /**
   * Make this procedure compatible with server action.
   *
   * @see {@link https://orpc.dev/docs/server-action Server Action Docs}
   */
  actionable(...rest) {
    const action = createActionableClient(createProcedureClient(this, ...rest));
    return new Proxy(action, {
      get: (target, key) => {
        return Reflect.has(this, key) ? Reflect.get(this, key) : Reflect.get(target, key);
      },
      has: (target, key) => {
        return Reflect.has(this, key) || Reflect.has(target, key);
      }
    });
  }
}
class Builder {
  constructor(def) {
    /**
     * This property holds the defined options.
     */
    __publicField(this, "~orpc");
    this["~orpc"] = def;
  }
  /**
   * Sets or overrides the config.
   *
   * @see {@link https://orpc.dev/docs/client/server-side#middlewares-order Middlewares Order Docs}
   * @see {@link https://orpc.dev/docs/best-practices/dedupe-middleware#configuration Dedupe Middleware Docs}
   */
  $config(config) {
    const inputValidationCount = this["~orpc"].inputValidationIndex - fallbackConfig("initialInputValidationIndex", this["~orpc"].config.initialInputValidationIndex);
    const outputValidationCount = this["~orpc"].outputValidationIndex - fallbackConfig("initialOutputValidationIndex", this["~orpc"].config.initialOutputValidationIndex);
    return new Builder({
      ...this["~orpc"],
      config,
      dedupeLeadingMiddlewares: fallbackConfig("dedupeLeadingMiddlewares", config.dedupeLeadingMiddlewares),
      inputValidationIndex: fallbackConfig("initialInputValidationIndex", config.initialInputValidationIndex) + inputValidationCount,
      outputValidationIndex: fallbackConfig("initialOutputValidationIndex", config.initialOutputValidationIndex) + outputValidationCount
    });
  }
  /**
   * Set or override the initial context.
   *
   * @see {@link https://orpc.dev/docs/context Context Docs}
   */
  $context() {
    return new Builder({
      ...this["~orpc"],
      middlewares: [],
      inputValidationIndex: fallbackConfig("initialInputValidationIndex", this["~orpc"].config.initialInputValidationIndex),
      outputValidationIndex: fallbackConfig("initialOutputValidationIndex", this["~orpc"].config.initialOutputValidationIndex)
    });
  }
  /**
   * Sets or overrides the initial meta.
   *
   * @see {@link https://orpc.dev/docs/metadata Metadata Docs}
   */
  $meta(initialMeta) {
    return new Builder({
      ...this["~orpc"],
      meta: initialMeta
    });
  }
  /**
   * Sets or overrides the initial route.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.dev/docs/openapi/routing OpenAPI Routing Docs}
   * @see {@link https://orpc.dev/docs/openapi/input-output-structure OpenAPI Input/Output Structure Docs}
   */
  $route(initialRoute) {
    return new Builder({
      ...this["~orpc"],
      route: initialRoute
    });
  }
  /**
   * Sets or overrides the initial input schema.
   *
   * @see {@link https://orpc.dev/docs/procedure#initial-configuration Initial Procedure Configuration Docs}
   */
  $input(initialInputSchema) {
    return new Builder({
      ...this["~orpc"],
      inputSchema: initialInputSchema
    });
  }
  /**
   * Creates a middleware.
   *
   * @see {@link https://orpc.dev/docs/middleware Middleware Docs}
   */
  middleware(middleware) {
    return decorateMiddleware(middleware);
  }
  /**
   * Adds type-safe custom errors.
   * The provided errors are spared-merged with any existing errors.
   *
   * @see {@link https://orpc.dev/docs/error-handling#type%E2%80%90safe-error-handling Type-Safe Error Handling Docs}
   */
  errors(errors) {
    return new Builder({
      ...this["~orpc"],
      errorMap: mergeErrorMap(this["~orpc"].errorMap, errors)
    });
  }
  use(middleware, mapInput) {
    const mapped = mapInput ? decorateMiddleware(middleware).mapInput(mapInput) : middleware;
    return new Builder({
      ...this["~orpc"],
      middlewares: addMiddleware(this["~orpc"].middlewares, mapped)
    });
  }
  /**
   * Sets or updates the metadata.
   * The provided metadata is spared-merged with any existing metadata.
   *
   * @see {@link https://orpc.dev/docs/metadata Metadata Docs}
   */
  meta(meta) {
    return new Builder({
      ...this["~orpc"],
      meta: mergeMeta(this["~orpc"].meta, meta)
    });
  }
  /**
   * Sets or updates the route definition.
   * The provided route is spared-merged with any existing route.
   * This option is typically relevant when integrating with OpenAPI.
   *
   * @see {@link https://orpc.dev/docs/openapi/routing OpenAPI Routing Docs}
   * @see {@link https://orpc.dev/docs/openapi/input-output-structure OpenAPI Input/Output Structure Docs}
   */
  route(route) {
    return new Builder({
      ...this["~orpc"],
      route: mergeRoute(this["~orpc"].route, route)
    });
  }
  /**
   * Defines the input validation schema.
   *
   * @see {@link https://orpc.dev/docs/procedure#input-output-validation Input Validation Docs}
   */
  input(schema) {
    return new Builder({
      ...this["~orpc"],
      inputSchema: schema,
      inputValidationIndex: fallbackConfig("initialInputValidationIndex", this["~orpc"].config.initialInputValidationIndex) + this["~orpc"].middlewares.length
    });
  }
  /**
   * Defines the output validation schema.
   *
   * @see {@link https://orpc.dev/docs/procedure#input-output-validation Output Validation Docs}
   */
  output(schema) {
    return new Builder({
      ...this["~orpc"],
      outputSchema: schema,
      outputValidationIndex: fallbackConfig("initialOutputValidationIndex", this["~orpc"].config.initialOutputValidationIndex) + this["~orpc"].middlewares.length
    });
  }
  /**
   * Defines the handler of the procedure.
   *
   * @see {@link https://orpc.dev/docs/procedure Procedure Docs}
   */
  handler(handler2) {
    return new DecoratedProcedure({
      ...this["~orpc"],
      handler: handler2
    });
  }
  /**
   * Prefixes all procedures in the router.
   * The provided prefix is post-appended to any existing router prefix.
   *
   * @note This option does not affect procedures that do not define a path in their route definition.
   *
   * @see {@link https://orpc.dev/docs/openapi/routing#route-prefixes OpenAPI Route Prefixes Docs}
   */
  prefix(prefix) {
    return new Builder({
      ...this["~orpc"],
      prefix: mergePrefix(this["~orpc"].prefix, prefix)
    });
  }
  /**
   * Adds tags to all procedures in the router.
   * This helpful when you want to group procedures together in the OpenAPI specification.
   *
   * @see {@link https://orpc.dev/docs/openapi/openapi-specification#operation-metadata OpenAPI Operation Metadata Docs}
   */
  tag(...tags) {
    return new Builder({
      ...this["~orpc"],
      tags: mergeTags(this["~orpc"].tags, tags)
    });
  }
  /**
   * Applies all of the previously defined options to the specified router.
   *
   * @see {@link https://orpc.dev/docs/router#extending-router Extending Router Docs}
   */
  router(router2) {
    return enhanceRouter(router2, this["~orpc"]);
  }
  /**
   * Create a lazy router
   * And applies all of the previously defined options to the specified router.
   *
   * @see {@link https://orpc.dev/docs/router#extending-router Extending Router Docs}
   */
  lazy(loader) {
    return enhanceRouter(lazy(loader), this["~orpc"]);
  }
}
const os = new Builder({
  config: {},
  route: {},
  meta: {},
  errorMap: {},
  inputValidationIndex: fallbackConfig("initialInputValidationIndex"),
  outputValidationIndex: fallbackConfig("initialOutputValidationIndex"),
  middlewares: [],
  dedupeLeadingMiddlewares: true
});
const p = os.$context();
const windowRouter = {
  close: p.handler(({ context }) => {
    context.win.close();
  }),
  minimize: p.handler(({ context }) => {
    context.win.minimize();
  }),
  maximize: p.handler(({ context }) => {
    if (context.win.isMaximized()) context.win.unmaximize();
    else context.win.maximize();
  })
};
const router = {
  window: windowRouter
};
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    })
  ]
});
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    titleBarStyle: "hiddenInset",
    titleBarOverlay: false,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
ipcMain.on("start-orpc-server", (event) => {
  const [serverPort] = event.ports;
  handler.upgrade(serverPort, {
    context: { win }
  });
  serverPort.start();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
