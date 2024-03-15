"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RlpxServer = void 0;
const devp2p_1 = require("@ethereumjs/devp2p");
const util_1 = require("@ethereumjs/util");
const types_1 = require("../../types");
const util_2 = require("../../util");
const rlpxpeer_1 = require("../peer/rlpxpeer");
const server_1 = require("./server");
const ignoredErrors = new RegExp([
    // Peer socket connection
    'ECONNRESET',
    'EPIPE',
    'ETIMEDOUT',
    // ETH status handling
    'Genesis block mismatch',
    'NetworkId mismatch',
    'Unknown fork hash',
    // DPT message decoding
    'Hash verification failed',
    'Invalid address bytes',
    'Invalid timestamp bytes',
    'Invalid type',
    'Timeout error: ping',
    'Peer is banned',
    // ECIES message encryption
    'Invalid MAC',
    // Client
    'Handshake timed out',
    'Server already destroyed', // Bootstrap retrigger
].join('|'));
/**
 * DevP2P/RLPx server
 * @memberof module:net/server
 */
class RlpxServer extends server_1.Server {
    /**
     * Create new DevP2P/RLPx server
     */
    constructor(options) {
        super(options);
        this.peers = new Map();
        this.rlpx = null;
        this.dpt = null;
        // As of now, the devp2p dpt server listens on the ip4 protocol by default and hence the ip in the
        // bootnode needs to be of ip4 by default
        this.ip = options.config.extIP ?? '0.0.0.0';
        this.discovery = options.config.discV4 || options.config.discDns;
        this.clientFilter = options.clientFilter ?? [
            'go1.5',
            'go1.6',
            'go1.7',
            'quorum',
            'pirl',
            'ubiq',
            'gmc',
            'gwhale',
            'prichain',
        ];
    }
    /**
     * Server name
     */
    get name() {
        return 'rlpx';
    }
    /**
     * Return Rlpx info
     */
    getRlpxInfo() {
        // TODO: return undefined? note that this.rlpx might be undefined if called before initRlpx
        const listenAddr = this.ip.match(/^(\d+\.\d+\.\d+\.\d+)$/)
            ? `${this.ip}:${this.config.port}`
            : `[${this.ip}]:${this.config.port}`;
        if (this.rlpx === undefined || this.rlpx === null) {
            return {
                enode: undefined,
                id: undefined,
                ip: this.ip,
                listenAddr,
                ports: { discovery: this.config.port, listener: this.config.port },
            };
        }
        const id = (0, util_1.bytesToUnprefixedHex)(this.rlpx.id);
        return {
            enode: `enode://${id}@${listenAddr}`,
            id,
            ip: this.ip,
            listenAddr,
            ports: { discovery: this.config.port, listener: this.config.port },
        };
    }
    /**
     * Start Devp2p/RLPx server.
     * Returns a promise that resolves once server has been started.
     * @returns true if server successfully started
     */
    async start() {
        if (this.started) {
            return false;
        }
        await super.start();
        await this.initDpt();
        await this.initRlpx();
        this.started = true;
        return true;
    }
    /**
     * Bootstrap bootnode and DNS mapped peers from the network
     */
    async bootstrap() {
        const self = this;
        // Bootnodes
        let promises = this.bootnodes.map((ma) => {
            const { address, port } = ma.nodeAddress();
            const bootnode = {
                address,
                udpPort: Number(port),
                tcpPort: Number(port),
            };
            return this.dpt.bootstrap(bootnode);
        });
        // DNS peers
        if (this.config.discDns) {
            const dnsPeers = (await this.dpt?.getDnsPeers()) ?? [];
            promises = promises.concat(dnsPeers.map((node) => self.dpt.bootstrap(node)));
        }
        for (const promise of promises) {
            try {
                await promise;
            }
            catch (e) {
                this.error(e);
            }
        }
    }
    /**
     * Stop Devp2p/RLPx server. Returns a promise that resolves once server has been stopped.
     */
    async stop() {
        if (this.started) {
            this.rlpx.destroy();
            this.dpt.destroy();
            await super.stop();
            this.started = false;
        }
        return this.started;
    }
    /**
     * Ban peer for a specified time
     * @param peerId id of peer
     * @param maxAge how long to ban peer in ms
     * @returns true if ban was successfully executed
     */
    ban(peerId, maxAge = 60000) {
        if (!this.started) {
            return false;
        }
        this.dpt.banPeer(peerId, maxAge);
        this.rlpx.disconnect((0, util_1.unprefixedHexToBytes)(peerId));
        return true;
    }
    /**
     * Handles errors from server and peers
     * @param error
     * @emits {@link Event.SERVER_ERROR}
     */
    error(error) {
        if (ignoredErrors.test(error.message)) {
            return;
        }
        this.config.events.emit(types_1.Event.SERVER_ERROR, error, this);
    }
    /**
     * Initializes DPT for peer discovery
     */
    async initDpt() {
        return new Promise((resolve) => {
            this.dpt = new devp2p_1.DPT(this.key, {
                refreshInterval: this.refreshInterval,
                endpoint: {
                    address: '0.0.0.0',
                    udpPort: null,
                    tcpPort: null,
                },
                onlyConfirmed: this.config.chainCommon.chainName() === 'mainnet' ? false : true,
                shouldFindNeighbours: this.config.discV4,
                shouldGetDnsPeers: this.config.discDns,
                dnsRefreshQuantity: this.config.maxPeers,
                dnsNetworks: this.dnsNetworks,
                dnsAddr: this.config.dnsAddr,
                common: this.config.chainCommon,
            });
            this.dpt.events.on('error', (e) => {
                this.error(e);
                // If DPT can't bind to port, resolve anyway so client startup doesn't hang
                if (e.message.includes('EADDRINUSE'))
                    resolve();
            });
            this.dpt.events.on('listening', () => {
                resolve();
            });
            this.config.events.on(types_1.Event.PEER_CONNECTED, (peer) => {
                this.dpt?.confirmPeer(peer.id);
            });
            if (typeof this.config.port === 'number') {
                this.dpt.bind(this.config.port, '0.0.0.0');
            }
            this.config.logger.info(`Started discovery service discV4=${this.config.discV4} dns=${this.config.discDns} refreshInterval=${this.refreshInterval}`);
        });
    }
    /**
     * Initializes RLPx instance for peer management
     */
    async initRlpx() {
        return new Promise((resolve) => {
            this.rlpx = new devp2p_1.RLPx(this.key, {
                clientId: (0, util_1.utf8ToBytes)((0, util_2.getClientVersion)()),
                dpt: this.dpt,
                maxPeers: this.config.maxPeers,
                capabilities: rlpxpeer_1.RlpxPeer.capabilities(Array.from(this.protocols)),
                remoteClientIdFilter: this.clientFilter,
                listenPort: this.config.port,
                common: this.config.chainCommon,
            });
            this.rlpx.events.on('peer:added', async (rlpxPeer) => {
                let peer = new rlpxpeer_1.RlpxPeer({
                    config: this.config,
                    id: (0, util_1.bytesToUnprefixedHex)(rlpxPeer.getId()),
                    // @ts-ignore
                    host: rlpxPeer._socket.remoteAddress,
                    // @ts-ignore
                    port: rlpxPeer._socket.remotePort,
                    protocols: Array.from(this.protocols),
                    // @ts-ignore: Property 'server' does not exist on type 'Socket'.
                    // TODO: check this error
                    inbound: rlpxPeer._socket.server !== undefined,
                });
                try {
                    await peer.accept(rlpxPeer, this);
                    this.peers.set(peer.id, peer);
                    this.config.logger.debug(`Peer connected: ${peer}`);
                    this.config.events.emit(types_1.Event.PEER_CONNECTED, peer);
                }
                catch (error) {
                    // Fixes a memory leak where RlpxPeer objects could not be GCed,
                    // likely to the complex two-way bound-protocol logic
                    peer = null;
                    this.error(error);
                }
            });
            this.rlpx.events.on('peer:removed', (rlpxPeer, reason) => {
                const id = (0, util_1.bytesToUnprefixedHex)(rlpxPeer.getId());
                const peer = this.peers.get(id);
                if (peer) {
                    this.peers.delete(peer.id);
                    this.config.logger.debug(`Peer disconnected (${rlpxPeer.getDisconnectPrefix(reason)}): ${peer}`);
                    this.config.events.emit(types_1.Event.PEER_DISCONNECTED, peer);
                }
            });
            this.rlpx.events.on('peer:error', (rlpxPeer, error) => this.error(error));
            this.rlpx.events.on('error', (e) => {
                this.error(e);
                // If DPT can't bind to port, resolve anyway so client startup doesn't hang
                if (e.message.includes('EADDRINUSE'))
                    resolve();
            });
            this.rlpx.events.on('listening', () => {
                this.config.events.emit(types_1.Event.SERVER_LISTENING, {
                    transport: this.name,
                    url: this.getRlpxInfo().enode ?? '',
                });
                resolve();
            });
            if (typeof this.config.port === 'number') {
                this.rlpx.listen(this.config.port, '0.0.0.0');
            }
        });
    }
}
exports.RlpxServer = RlpxServer;
//# sourceMappingURL=rlpxserver.js.map