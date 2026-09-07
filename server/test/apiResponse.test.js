import test from "node:test";
import assert from "node:assert/strict";
import {
    defaultErrorCode,
    defaultErrorMessage,
    statusCode,
} from "../utils/apiResponse.js";

test("statusCode accepts valid HTTP error status codes", () => {
    assert.equal(statusCode(400), 400);
    assert.equal(statusCode(409), 409);
    assert.equal(statusCode(500), 500);
});

test("statusCode falls back to 500 for invalid statuses", () => {
    assert.equal(statusCode(undefined), 500);
    assert.equal(statusCode(200), 500);
    assert.equal(statusCode("nope"), 500);
});

test("standard error codes and messages are deterministic", () => {
    assert.equal(defaultErrorCode(404), "NOT_FOUND");
    assert.equal(defaultErrorCode(409), "CONFLICT");
    assert.equal(defaultErrorMessage(403), "You are not authorized to perform this action.");
});

test("unknown error status maps to the generic API error contract", () => {
    assert.equal(defaultErrorCode(418), "API_ERROR");
    assert.equal(defaultErrorMessage(418), "Internal server error.");
});
