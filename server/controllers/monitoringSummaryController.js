import OfficePerformance from "../models/OfficePerformance.js";
import PhysicalReport from "../models/PhysicalReport.js";
import { DEPARTMENTS, OFFICES_BY_SECTOR } from "../constants/departments.js";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const sectorForOffice = (office) => Object.entries(OFFICES_BY_SECTOR).find(([, offices]) => offices.includes(office))?.[0] || "Unassigned";
const num = (value) => Number(value || 0);
const isApprovedPhysical = (status) => ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"].includes(String(status || "").toUpperCase());
const isApprovedPerformance = (status) => status === "APPROVED" || !status;

const physicalOfficeSummary = (records, quarter) => {
    const lbac3 = records.filter((r) => r.formType === "LBAC3");
    const lbac5 = records.filter((r) => r.formType === "LBAC5");
    const q = String(quarter || "Q1").toUpperCase();
    const quarterOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    const end = quarterOrder[q] || 1;
    const keys = ["q1", "q2", "q3", "q4"].slice(0, end);
    const sumQuarter = (obj) => keys.reduce((sum, key) => sum + num(obj?.[key]), 0);

    let lbac3Target = 0;
    let lbac3Actual = 0;
    for (const report of lbac3) {
        for (const row of (report.rows || []).filter((item) => String(item?.rowType || "ITEM").toUpperCase() === "ITEM")) {
            lbac3Target += sumQuarter(row.targetOutput);
            lbac3Actual += sumQuarter(row.actualPerformance);
        }
    }
    const lbac3Variance = lbac3Actual - lbac3Target;
    const lbac3Accomplishment = lbac3Target > 0 ? (lbac3Actual / lbac3Target) * 100 : 0;

    let physicalWeighted = 0;
    let financialWeighted = 0;
    let overallWeighted = 0;
    let coaTotal = 0;
    let coaCount = 0;
    let allotment = 0;
    let obligations = 0;
    let itemCount = 0;
    for (const report of lbac5) {
        physicalWeighted += num(report.lbac5Totals?.physicalWeightedScore ?? report.lbac5Totals?.physicalWeighted);
        financialWeighted += num(report.lbac5Totals?.financialWeightedScore ?? report.lbac5Totals?.financialWeighted);
        overallWeighted += num(report.lbac5Totals?.totalWeightedScore ?? report.lbac5Totals?.totalWeighted);
        allotment += num(report.lbac5Totals?.totalAllotmentReleased);
        obligations += num(report.lbac5Totals?.totalObligationsIncurred);
        const rows = Array.isArray(report.evaluationRows) ? report.evaluationRows : [];
        for (const row of rows.filter((item) => String(item?.rowType || "ITEM").toUpperCase() === "ITEM")) {
            itemCount += 1;
            coaTotal += num(row.coaPct ?? row.absorptiveCapacityPct);
            coaCount += 1;
        }
    }

    const averageCoa = coaCount ? coaTotal / coaCount : (allotment > 0 ? (obligations / allotment) * 100 : 0);
    return {
        lbac3Count: lbac3.length,
        lbac5Count: lbac5.length,
        lbac3Target: Number(lbac3Target.toFixed(2)),
        lbac3Actual: Number(lbac3Actual.toFixed(2)),
        lbac3Variance: Number(lbac3Variance.toFixed(2)),
        lbac3Accomplishment: Number(lbac3Accomplishment.toFixed(2)),
        lbac5Physical: Number((lbac5.length ? physicalWeighted / lbac5.length : 0).toFixed(2)),
        lbac5Financial: Number((lbac5.length ? financialWeighted / lbac5.length : 0).toFixed(2)),
        lbac5Overall: Number((lbac5.length ? overallWeighted / lbac5.length : 0).toFixed(2)),
        averageCoa: Number(averageCoa.toFixed(2)),
        totalAllotment: Number(allotment.toFixed(2)),
        totalObligations: Number(obligations.toFixed(2)),
        itemCount,
        quarter: q,
        quarterKey: q.toLowerCase(),
    };
};

export const getMonitoringSummary = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") return res.status(403).json({ success: false, error: "Admin access required." });

        const requestedYear = req.query.year ? Number(req.query.year) : null;
        const requestedQuarter = QUARTERS.includes(req.query.quarter) ? req.query.quarter : null;

        // Keep the database results in explicitly named variables before they are
        // referenced below. This avoids temporal-dead-zone/shadowing issues when
        // this controller is bundled or edited incrementally.
        const queryResults = await Promise.all([
            OfficePerformance.find({ $or: [{ status: "APPROVED" }, { status: { $exists: false } }] }).lean(),
            PhysicalReport.find({ status: { $in: ["APPROVED", "VALIDATED", "COMPLETED", "APPROVED_BY_HEAD"] } }).lean(),
        ]);

        const approvedPerformanceRecords = Array.isArray(queryResults[0]) ? queryResults[0] : [];
        const approvedPhysicalRecords = Array.isArray(queryResults[1]) ? queryResults[1] : [];

        const periods = [...new Map(
            [...approvedPerformanceRecords, ...approvedPhysicalRecords]
                .filter((item) => item.year && item.quarter)
                .map((item) => [`${item.year}-${item.quarter}`, { year: item.year, quarter: item.quarter }])
        ).values()]
            .sort((a, b) => b.year - a.year || QUARTERS.indexOf(b.quarter) - QUARTERS.indexOf(a.quarter));

        const year = requestedYear || periods[0]?.year || new Date().getFullYear();
        const quarter = requestedQuarter || periods[0]?.quarter || "Q1";
        const performanceRecords = approvedPerformanceRecords.filter((item) => item.year === year && item.quarter === quarter);
        const physicalRecords = approvedPhysicalRecords.filter((item) => item.year === year && item.quarter === quarter);

        const offices = DEPARTMENTS.map((office) => {
            const perfItems = performanceRecords.filter((record) => record.office === office);
            const physicalItems = physicalRecords.filter((record) => record.office === office);
            const physical = physicalOfficeSummary(physicalItems, quarter);
            const avg = (field) => perfItems.length ? Number((perfItems.reduce((sum, item) => sum + num(item[field]), 0) / perfItems.length).toFixed(2)) : 0;

            const officePhysical = physical.lbac5Count ? physical.lbac5Physical : physical.lbac3Accomplishment;
            const officeFinancial = physical.lbac5Count ? physical.lbac5Financial : 0;
            const officeRating = perfItems.length ? avg("totalRating") : (physical.lbac5Count ? physical.lbac5Overall : 0);
            const totalAllotment = Number((perfItems.reduce((sum, item) => sum + num(item.totalAllotment), 0) + physical.totalAllotment).toFixed(2));
            const totalActualObligation = Number((perfItems.reduce((sum, item) => sum + num(item.totalActualObligation), 0) + physical.totalObligations).toFixed(2));
            const averageCoa = physical.lbac5Count ? physical.averageCoa : (perfItems.length ? avg("coaAccomplishment") : 0);

            return {
                office,
                sector: sectorForOffice(office),
                reported: Boolean(perfItems.length || physicalItems.length),
                ppaCount: perfItems.length,
                averageRating: officeRating,
                averagePhysical: officePhysical,
                averageFinancial: officeFinancial || avg("financialPerformance"),
                totalAllotment,
                totalActualObligation,
                averageCoa,
                physical,
            };
        });

        const reported = offices.filter((office) => office.reported);
        const avg = (field) => reported.length ? Number((reported.reduce((sum, item) => sum + num(item[field]), 0) / reported.length).toFixed(2)) : 0;
        const totals = reported.reduce((acc, item) => ({ totalAllotment: acc.totalAllotment + item.totalAllotment, totalActualObligation: acc.totalActualObligation + item.totalActualObligation }), { totalAllotment: 0, totalActualObligation: 0 });
        const ratingDistribution = performanceRecords.reduce((acc, item) => { const key = item.rating || "NO RATING"; acc[key] = (acc[key] || 0) + 1; return acc; }, {});

        const physicalTotals = physicalRecords.reduce((acc, report) => {
            const summary = physicalOfficeSummary([report], quarter);
            acc.lbac3Count += summary.lbac3Count;
            acc.lbac5Count += summary.lbac5Count;
            acc.lbac3Target += summary.lbac3Target;
            acc.lbac3Actual += summary.lbac3Actual;
            acc.lbac3Variance += summary.lbac3Variance;
            acc.lbac5Physical += summary.lbac5Physical;
            acc.lbac5Financial += summary.lbac5Financial;
            acc.lbac5Overall += summary.lbac5Overall;
            acc.coa += summary.averageCoa;
            acc.coaCount += summary.averageCoa ? 1 : 0;
            acc.allotment += summary.totalAllotment;
            acc.obligations += summary.totalObligations;
            return acc;
        }, { lbac3Count: 0, lbac5Count: 0, lbac3Target: 0, lbac3Actual: 0, lbac3Variance: 0, lbac5Physical: 0, lbac5Financial: 0, lbac5Overall: 0, coa: 0, coaCount: 0, allotment: 0, obligations: 0 });

        res.json({
            success: true,
            period: { year, quarter },
            availablePeriods: periods,
            totalOffices: DEPARTMENTS.length,
            officesReported: reported.length,
            totalPPAs: performanceRecords.length,
            averagePhysical: avg("averagePhysical"),
            averageFinancial: avg("averageFinancial"),
            averageOverall: avg("averageRating"),
            totalAllotment: Number(totals.totalAllotment.toFixed(2)),
            totalActualObligation: Number(totals.totalActualObligation.toFixed(2)),
            ratingDistribution,
            topOffices: [...reported].sort((a, b) => b.averageRating - a.averageRating).slice(0, 5),
            offices,
            physicalReports: {
                lbac3Count: physicalTotals.lbac3Count,
                lbac5Count: physicalTotals.lbac5Count,
                lbac3Target: Number(physicalTotals.lbac3Target.toFixed(2)),
                lbac3Actual: Number(physicalTotals.lbac3Actual.toFixed(2)),
                lbac3Variance: Number(physicalTotals.lbac3Variance.toFixed(2)),
                averageLbac3Accomplishment: physicalTotals.lbac3Target > 0 ? Number(((physicalTotals.lbac3Actual / physicalTotals.lbac3Target) * 100).toFixed(2)) : 0,
                averageLbac5Physical: physicalTotals.lbac5Count ? Number((physicalTotals.lbac5Physical / physicalTotals.lbac5Count).toFixed(2)) : 0,
                averageLbac5Financial: physicalTotals.lbac5Count ? Number((physicalTotals.lbac5Financial / physicalTotals.lbac5Count).toFixed(2)) : 0,
                averageLbac5Overall: physicalTotals.lbac5Count ? Number((physicalTotals.lbac5Overall / physicalTotals.lbac5Count).toFixed(2)) : 0,
                averageCoa: physicalTotals.coaCount ? Number((physicalTotals.coa / physicalTotals.coaCount).toFixed(2)) : 0,
                totalAllotment: Number(physicalTotals.allotment.toFixed(2)),
                totalObligations: Number(physicalTotals.obligations.toFixed(2)),
            },
        });
    } catch (error) {
        console.error("MONITORING SUMMARY ERROR:", error);
        res.status(500).json({ success: false, error: "Failed to generate monitoring summary.", details: error.message });
    }
};
