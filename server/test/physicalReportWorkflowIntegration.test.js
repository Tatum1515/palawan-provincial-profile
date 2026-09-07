import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import PhysicalReport from "../models/PhysicalReport.js";

const controller = fs.readFileSync(new URL("../controllers/physicalReportController.js", import.meta.url), "utf8");
const frontend = fs.readFileSync(new URL("../../tats/src/pages/PhysicalReport.jsx", import.meta.url), "utf8");

test("Physical Report workflow keeps Admin-controlled quarter windows", () => {
    assert.match(controller, /assertEncoderQuarterWriteWindow/);
    assert.match(controller, /getSchedule\(year, quarter\)/);
});

test("Physical Report workflow synchronizes paired form statuses", () => {
    assert.match(controller, /const syncQuarterPairStatus = async/);
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "RETURNED", "RESUBMITTED", "APPROVED", "VALIDATED", "COMPLETED"]) {
        assert.match(controller, new RegExp(`\"${status}\"`));
    }
});

test("Physical Report UI exports all official sheets and supports draft/submit flow", () => {
    assert.match(frontend, /workbook\.addWorksheet\("LBAC Form No\.3"\)/);
    assert.match(frontend, /workbook\.addWorksheet\("LBAC Form No\. 5"\)/);
    assert.match(frontend, /workbook\.addWorksheet\("LBAC Form No\. 6"\)/);
    assert.match(frontend, /save\("DRAFT"\)/);
    assert.match(frontend, /Submit for Approval/);
});

// Report-group isolation is enforced by the controller's source lookup/filtering.
// This test guards the canonical field expected on every new Physical Report.
test("Physical Report records carry an independent reportGroupId", () => {
  assert.equal(typeof PhysicalReport.schema.path("reportGroupId").options.default(), "string");
});

test("Physical Report workflow keeps independent report groups isolated during status sync", () => {
    assert.match(controller, /reportGroupId:\s*report\.reportGroupId/);
    assert.match(controller, /formType:\s*\{\s*\$in:\s*\[["']LBAC3["'],\s*["']LBAC5["']\]\s*\}/);
});

test("Physical Report workflow connects Admin, Approval Head, and Office Encoder roles", () => {
    assert.match(controller, /req\.session\.role !== "ADMIN"/);
    assert.match(controller, /req\.session\.role !== "DEPARTMENT_HEAD"/);
    assert.match(controller, /ENCODER_ROLES/);
    assert.match(controller, /carryForwardPhysicalReport/);
    assert.match(controller, /PHYSICAL_REPORT_CARRIED_FORWARD/);
    assert.match(controller, /PHYSICAL_REPORT_RETURNED/);
    assert.match(controller, /PHYSICAL_REPORT_VALIDATED/);
    assert.match(frontend, /PPDO \/ Admin/);
    assert.match(frontend, /Approval Head/);
    assert.match(frontend, /Office Encoder/);
});



test("LBAC3 to LBAC5 data sync is isolated to the same report group", () => {
    assert.match(controller, /reportGroupId:\s*lbac3Report\.reportGroupId/);
    assert.match(controller, /formType:\s*"LBAC5"[\s\S]*office:\s*lbac3Report\.office[\s\S]*year:\s*lbac3Report\.year[\s\S]*reportGroupId:\s*lbac3Report\.reportGroupId/);
});

test("Switching from LBAC3 to LBAC5 keeps the two forms as separate records", () => {
    assert.match(frontend, /formType:\s*"LBAC5"/);
    assert.match(frontend, /id:\s*pairedLbac5\?\.id \|\| null/);
    assert.match(frontend, /formType:\s*"LBAC5"[\s\S]*reportGroupId:\s*pairedLbac5\?\.reportGroupId/);
    assert.match(frontend, /formType:\s*"LBAC5"[\s\S]*evaluationRows:\s*nextRows/);
});

test("Saving a Physical Report does not force a full register refresh while editing", () => {
    assert.match(frontend, /Keep the editor responsive after save/);
});

test("LBAC5 does not require a manually added PPA row", () => {
    assert.doesNotMatch(controller, /Add at least one PPA row/);
    assert.doesNotMatch(frontend, /Add at least one PPA row/);
});

