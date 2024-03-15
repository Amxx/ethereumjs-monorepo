"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wait = void 0;
async function wait(delay) {
    await new Promise((resolve) => setTimeout(resolve, delay));
}
exports.wait = wait;
//# sourceMappingURL=wait.js.map