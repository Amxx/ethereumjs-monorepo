"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayloadBody = void 0;
const util_1 = require("@ethereumjs/util");
const getPayloadBody = (block) => {
    const transactions = block.transactions.map((tx) => (0, util_1.bytesToHex)(tx.serialize()));
    const withdrawals = block.withdrawals?.map((wt) => wt.toJSON()) ?? null;
    return {
        transactions,
        withdrawals,
    };
};
exports.getPayloadBody = getPayloadBody;
//# sourceMappingURL=getPayloadBody.js.map