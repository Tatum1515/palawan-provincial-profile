import test from "node:test";
import assert from "node:assert/strict";
import {
    bodyOf,
    cleanText,
    numberOrNull,
    parseJson,
    quarterValues,
    sectorForOffice,
} from "../utils/physicalReportControllerHelpers.js";

test("cleanText trims values and handles nullish input", () => {
    assert.equal(cleanText("  hello "), "hello");
    assert.equal(cleanText(null), "");
});

test("numberOrNull only returns finite numbers", () => {
    assert.equal(numberOrNull("12.5"), 12.5);
    assert.equal(numberOrNull(""), null);
    assert.equal(numberOrNull("abc"), null);
});

test("parseJson parses JSON and safely falls back", () => {
    assert.deepEqual(parseJson('{"a":1}', {}), { a: 1 });
    assert.deepEqual(parseJson("{bad", { fallback: true }), { fallback: true });
    const object = { a: 1 };
    assert.deepEqual(parseJson(object, {}), object);
});

test("quarterValues returns validated quarter values and total", () => {
    assert.deepEqual(
        quarterValues({ q1: "1", q2: 2, q3: "bad", q4: null }),
        { value: { q1: 1, q2: 2, q3: null, q4: null, total: 3 } }
    );
    assert.deepEqual(
        quarterValues({ q1: -1 }),
        { error: "Quarterly target and actual values cannot be negative." }
    );
});

test("sectorForOffice safely returns empty for unknown office", () => {
    assert.equal(sectorForOffice("Definitely Not An Office"), "");
});

test("bodyOf returns a safe object", () => {
    assert.deepEqual(bodyOf({}), {});
    assert.deepEqual(bodyOf({ body: { hello: "world" } }), { hello: "world" });
});
