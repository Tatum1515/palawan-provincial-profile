import test from "node:test";
import assert from "node:assert/strict";

const isCancelledRequest = (error) =>
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError";

test("refresh cancellation errors are treated as intentional cancellations", () => {
    assert.equal(isCancelledRequest({ code: "ERR_CANCELED" }), true);
    assert.equal(isCancelledRequest({ name: "CanceledError" }), true);
    assert.equal(isCancelledRequest({ name: "AbortError" }), true);
});

test("normal API errors are not mistaken for refresh cancellation", () => {
    assert.equal(isCancelledRequest({ code: "ERR_BAD_RESPONSE" }), false);
    assert.equal(isCancelledRequest({ name: "AxiosError" }), false);
    assert.equal(isCancelledRequest(new Error("network failure")), false);
});
