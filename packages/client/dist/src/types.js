"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = exports.Event = void 0;
const events_1 = require("events");
/**
 * Types for the central event bus, emitted
 * by different components of the client.
 */
var Event;
(function (Event) {
    Event["CHAIN_UPDATED"] = "blockchain:chain:updated";
    Event["CLIENT_SHUTDOWN"] = "client:shutdown";
    Event["SYNC_EXECUTION_VM_ERROR"] = "sync:execution:vm:error";
    Event["SYNC_FETCHED_BLOCKS"] = "sync:fetcher:fetched_blocks";
    Event["SYNC_FETCHED_HEADERS"] = "sync:fetcher:fetched_headers";
    Event["SYNC_SYNCHRONIZED"] = "sync:synchronized";
    Event["SYNC_ERROR"] = "sync:error";
    Event["SYNC_FETCHER_ERROR"] = "sync:fetcher:error";
    Event["SYNC_SNAPSYNC_COMPLETE"] = "sync:snapsync:complete";
    Event["PEER_CONNECTED"] = "peer:connected";
    Event["PEER_DISCONNECTED"] = "peer:disconnected";
    Event["PEER_ERROR"] = "peer:error";
    Event["SERVER_LISTENING"] = "server:listening";
    Event["SERVER_ERROR"] = "server:error";
    Event["POOL_PEER_ADDED"] = "pool:peer:added";
    Event["POOL_PEER_REMOVED"] = "pool:peer:removed";
    Event["POOL_PEER_BANNED"] = "pool:peer:banned";
    Event["PROTOCOL_ERROR"] = "protocol:error";
    Event["PROTOCOL_MESSAGE"] = "protocol:message";
})(Event = exports.Event || (exports.Event = {}));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class EventBus extends events_1.EventEmitter {
}
exports.EventBus = EventBus;
//# sourceMappingURL=types.js.map