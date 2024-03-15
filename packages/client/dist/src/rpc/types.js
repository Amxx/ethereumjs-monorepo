"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRpcTx = void 0;
function toRpcTx(t) {
    const rpcTx = {
        from: t.from,
        gas: t.gas,
        gasPrice: t.gasPrice,
        value: t.value,
        data: t.input ?? t.data,
        maxPriorityFeePerGas: t.maxPriorityFeePerGas,
        maxFeePerGas: t.maxFeePerGas,
        type: t.type,
    };
    t.to !== null && (rpcTx.to = t.to);
    return rpcTx;
}
exports.toRpcTx = toRpcTx;
//# sourceMappingURL=types.js.map