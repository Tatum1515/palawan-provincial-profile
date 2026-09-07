import test from "node:test";
import assert from "node:assert/strict";

const isCancelledRequest = (error) =>
    error?.code === "ERR_CANCELED" || error?.name === "CanceledError" || error?.name === "AbortError";

test("calendar cancellation signals are recognized", () => {
    assert.equal(isCancelledRequest({ code: "ERR_CANCELED" }), true);
    assert.equal(isCancelledRequest({ name: "CanceledError" }), true);
    assert.equal(isCancelledRequest({ name: "AbortError" }), true);
});

test("calendar normal errors are still reported", () => {
    assert.equal(isCancelledRequest({ code: "ERR_BAD_RESPONSE" }), false);
    assert.equal(isCancelledRequest({ name: "AxiosError" }), false);
});
