import "dotenv/config";
import connectDB from "../config/db.js";
import PhysicalReport from "../models/PhysicalReport.js";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const keyFor = (quarter) => quarter.toLowerCase();

const run = async () => {
    await connectDB();

    const legacyReports = await PhysicalReport.find({
        formType: "LBAC3",
        $or: [
            { quarter: null },
            { quarter: { $exists: false } },
            { quarter: "" },
        ],
    }).lean();

    let created = 0;
    let skipped = 0;

    for (const legacy of legacyReports) {
        for (const quarter of QUARTERS) {
            const key = keyFor(quarter);
            const hasQuarterData = (legacy.rows || []).some((row) =>
                row.targetOutput?.[key] !== null && row.targetOutput?.[key] !== undefined ||
                row.actualPerformance?.[key] !== null && row.actualPerformance?.[key] !== undefined
            );

            if (!hasQuarterData) continue;

            const exists = await PhysicalReport.findOne({
                office: legacy.office,
                year: legacy.year,
                formType: "LBAC3",
                quarter,
            }).select("_id").lean();

            if (exists) {
                skipped += 1;
                continue;
            }

            const rows = (legacy.rows || []).map((row) => {
                const target = row.targetOutput?.[key] ?? null;
                const actual = row.actualPerformance?.[key] ?? null;
                return {
                    ppaCode: row.ppaCode || "",
                    majorFinalOutput: row.majorFinalOutput || "",
                    performanceIndicator: row.performanceIndicator || "",
                    targetOutput: { q1: null, q2: null, q3: null, q4: null, total: target ?? 0, [key]: target },
                    actualPerformance: { q1: null, q2: null, q3: null, q4: null, total: actual ?? 0, [key]: actual },
                    variance: Number(((actual ?? 0) - (target ?? 0)).toFixed(2)),
                    remarks: row.remarks || "",
                };
            });

            const sourceStatus = legacy.status === "APPROVED_BY_HEAD" ? "APPROVED" : legacy.status === "DENIED" ? "RETURNED" : legacy.status || "SUBMITTED";
            const frozen = ["APPROVED", "VALIDATED", "COMPLETED"].includes(sourceStatus);

            await PhysicalReport.create({
                ...legacy,
                _id: undefined,
                quarter,
                rows,
                lbac3QuarterTotals: {
                    Q1: quarter === "Q1" ? legacy.lbac3QuarterTotals?.Q1 : { target: 0, actual: 0, variance: 0 },
                    Q2: quarter === "Q2" ? legacy.lbac3QuarterTotals?.Q2 : { target: 0, actual: 0, variance: 0 },
                    Q3: quarter === "Q3" ? legacy.lbac3QuarterTotals?.Q3 : { target: 0, actual: 0, variance: 0 },
                    Q4: quarter === "Q4" ? legacy.lbac3QuarterTotals?.Q4 : { target: 0, actual: 0, variance: 0 },
                },
                structureSourceReport: legacy._id,
                status: sourceStatus,
                frozenAt: frozen ? (legacy.frozenAt || legacy.updatedAt || new Date()) : null,
                frozenBy: frozen ? legacy.frozenBy || legacy.validatedBy || legacy.reviewedBy || null : null,
                createdAt: legacy.createdAt,
                updatedAt: legacy.updatedAt,
            });
            created += 1;
        }
    }

    console.log(`LBAC 3 migration complete. Created: ${created}. Skipped existing: ${skipped}.`);
    process.exit(0);
};

run().catch((error) => {
    console.error("LBAC 3 migration failed:", error);
    process.exit(1);
});
