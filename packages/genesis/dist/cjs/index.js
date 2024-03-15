"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGenesis = void 0;
const common_1 = require("@ethereumjs/common");
const goerli_js_1 = require("./genesisStates/goerli.js");
const holesky_js_1 = require("./genesisStates/holesky.js");
const mainnet_js_1 = require("./genesisStates/mainnet.js");
const sepolia_js_1 = require("./genesisStates/sepolia.js");
/**
 * Utility to get the genesisState of a well known network
 * @param: chainId of the network
 * @returns genesisState of the chain
 */
function getGenesis(chainId) {
    switch (chainId) {
        case common_1.Chain.Mainnet:
            return mainnet_js_1.mainnetGenesis;
        case common_1.Chain.Goerli:
            return goerli_js_1.goerliGenesis;
        case common_1.Chain.Sepolia:
            return sepolia_js_1.sepoliaGenesis;
        case common_1.Chain.Holesky:
            return holesky_js_1.holeskyGenesis;
        default:
            return undefined;
    }
}
exports.getGenesis = getGenesis;
//# sourceMappingURL=index.js.map