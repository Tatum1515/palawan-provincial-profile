import OfficePerformance from "../models/OfficePerformance.js";
import PhysicalReport from "../models/PhysicalReport.js";
import Employee from "../models/Employee.js";
import { DEPARTMENTS, OFFICES_BY_SECTOR, SECTORS } from "../constants/departments.js";
import { deriveOfficePerformance, toFiniteNumber } from "../utils/officePerformanceCalculations.js";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const sectorForOffice = (office) =>
    Object.entries(OFFICES_BY_SECTOR).find(([, offices]) => offices.includes(office))?.[0] || "";

const cleanText = (value) => String(value ?? "").trim();

const getEmployeeForSession = async (sessionId) =>
    Employee.findOne({
        userID: sessionId,
        isDeleted: { $ne: true },
    })
        .select("firstName lastName email department position userID")
        .lean();

const parseFields = (body, { userOffice = null } = {}) => {
    const ppa = cleanText(body.ppa);
    const office = userOffice || cleanText(body.office);
    const sector = userOffice ? sectorForOffice(userOffice) : cleanText(body.sector);
    const fundSource = cleanText(body.fundSource);
    const quarter = cleanText(body.quarter);
    const year = toFiniteNumber(body.year);
    const physicalPerformance = toFiniteNumber(body.physicalPerformance);
    const financialPerformance = toFiniteNumber(body.financialPerformance);
    const totalAllotment = toFiniteNumber(body.totalAllotment, 0);
    const totalActualObligation = toFiniteNumber(body.totalActualObligation, 0);
    const coaAccomplishment = toFiniteNumber(body.coaAccomplishment, 0);
    const remarks = cleanText(body.remarks);

    if (!ppa) return { error: "PPA / Program is required." };
    if (ppa.length > 300) return { error: "PPA / Program is too long." };
    if (!DEPARTMENTS.includes(office)) return { error: "Please select a valid office." };
    if (!SECTORS.includes(sector)) return { error: "Please select a valid sector." };
    if (!fundSource) return { error: "Fund Source is required." };
    if (!QUARTERS.includes(quarter)) return { error: "Please select a valid quarter." };
    if (year === null || year < 2000 || year > 2100) return { error: "Please enter a valid year." };

    if (physicalPerformance === null || physicalPerformance < 0 || physicalPerformance > 5) {
        return { error: "Physical Performance must be between 0 and 5." };
    }

    if (financialPerformance === null || financialPerformance < 0 || financialPerformance > 5) {
        return { error: "Financial Performance must be between 0 and 5." };
    }

    if (totalAllotment === null || totalAllotment < 0) {
        return { error: "Total Allotment cannot be negative." };
    }

    if (totalActualObligation === null || totalActualObligation < 0) {
        return { error: "Actual Obligation cannot be negative." };
    }

    if (coaAccomplishment === null || coaAccomplishment < 0 || coaAccomplishment > 100) {
        return { error: "COA Accomplishment must be between 0 and 100." };
    }

    return {
        values: {
            ppa,
            office,
            sector,
            fundSource,
            quarter,
            year,
            physicalPerformance,
            financialPerformance,
            totalAllotment,
            totalActualObligation,
            coaAccomplishment,
            remarks,
        },
    };
};

const canAccessRecord = (req, record, employee) => {
    if (req.session.role === "ADMIN") return true;
    if (!employee?.department) return false;

    // Office Performance records belong to the office. The original
    // submittedBy value is retained for audit/history, but it must not
    // prevent another encoder from continuing the same office's work.
    if (["DEPARTMENT_HEAD", "EMPLOYEE"].includes(req.session.role)) {
        return record.office === employee.department;
    }

    return false;
};

const serialize = (record) => ({
    ...record,
    id: record._id?.toString?.() || record.id,
    status: record.status || "PENDING",
    source: record.source || "USER",
    submittedBy:
        record.submittedBy?._id?.toString?.() ||
        record.submittedBy?.toString?.() ||
        null,
    responsiblePerson:
        record.responsiblePerson?._id?.toString?.() ||
        record.responsiblePerson?.toString?.() ||
        null,
    reviewedBy:
        record.reviewedBy?._id?.toString?.() ||
        record.reviewedBy?.toString?.() ||
        null,
});

const findDuplicate = async ({ office, ppa, quarter, year, excludeId = null }) => {
    const filter = { office, ppa, quarter, year };

    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    return OfficePerformance.findOne(filter)
        .select("_id status")
        .lean();
};

export const listResponsiblePersons = async (req, res) => {
    try {
        const heads = await Employee.find({
            isDeleted: { $ne: true },
        })
            .populate({
                path: "userID",
                match: { role: "DEPARTMENT_HEAD" },
                select: "email",
            })
            .select("userID firstName lastName department")
            .lean();

        const data = heads
            .filter((item) => item.userID)
            .map((item) => ({
                id: String(item.userID._id),
                name:
                    `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
                    item.userID.email,
                office: item.department,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("PERFORMANCE RESPONSIBLE PERSONS:", error);

        res.status(500).json({
            success: false,
            error: "Failed to load department heads.",
        });
    }
};

export const getMyOffice = async (req, res) => {
    try {
        const employee = await getEmployeeForSession(req.session.id);

        if (!employee?.department) {
            return res.status(404).json({
                success: false,
                error: "Your account has no assigned office.",
            });
        }

        res.json({
            success: true,
            data: {
                office: employee.department,
                sector: sectorForOffice(employee.department),
                firstName: employee.firstName,
                lastName: employee.lastName,
                position: employee.position,
            },
        });
    } catch (error) {
        console.error("MY OFFICE:", error);

        res.status(500).json({
            success: false,
            error: "Failed to load your office.",
        });
    }
};

/*
 * IMPORTANT:
 *
 * The ADMIN no longer creates performance data.
 *
 * The encoder/user creates the data.
 * The department head reviews it.
 * PPDO/Admin only validates/monitors the same record.
 */
export const createOfficePerformance = async (req, res) => {
    try {
        if (req.session.role !== "EMPLOYEE") {
            return res.status(403).json({
                success: false,
                error: "Only an Encoder/User can submit performance data.",
            });
        }

        const employee = await getEmployeeForSession(req.session.id);

        if (!employee?.department) {
            return res.status(400).json({
                success: false,
                error:
                    "Your account has no assigned office. Contact the administrator.",
            });
        }

        const parsed = parseFields(req.body, {
            userOffice: employee.department,
        });

        if (parsed.error) {
            return res.status(400).json({
                success: false,
                error: parsed.error,
            });
        }

        const duplicate = await findDuplicate(parsed.values);

        if (duplicate) {
            return res.status(409).json({
                success: false,
                error:
                    "A performance record for this PPA, office, quarter, and year already exists.",
            });
        }

        const derived = deriveOfficePerformance(parsed.values);

        const record = await OfficePerformance.create({
            ...parsed.values,
            ...derived,
            source: "USER",
            status: "PENDING",
            submittedBy: req.session.id,
            createdBy: req.session.id,
        });

        res.status(201).json({
            success: true,
            message:
                "Performance submitted to your Department Head for approval.",
            data: serialize(record.toObject()),
        });
    } catch (error) {
        console.error("CREATE PERFORMANCE:", error);

        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "This performance record already exists.",
            });
        }

        res.status(500).json({
            success: false,
            error: "Failed to save performance.",
            details: error.message,
        });
    }
};

export const getOfficePerformance = async (req, res) => {
    try {
        const role = req.session.role;
        const filter = {};

        if (role === "EMPLOYEE") {
            const employee = await getEmployeeForSession(req.session.id);

            if (!employee?.department) {
                return res.status(404).json({
                    success: false,
                    error: "Your account has no assigned office.",
                });
            }

            filter.office = employee.department;
            // Office-based visibility: include records created by other
            // encoders or backfilled by PPDO/Admin for the same office.

        } else if (role === "DEPARTMENT_HEAD") {
            const employee = await getEmployeeForSession(req.session.id);

            if (!employee?.department) {
                return res.status(404).json({
                    success: false,
                    error: "Your account has no assigned office.",
                });
            }

            filter.office = employee.department;
        } else if (role === "ADMIN") {
            if (req.query.office && DEPARTMENTS.includes(req.query.office)) {
                filter.office = req.query.office;
            }
        }

        if (req.query.sector && SECTORS.includes(req.query.sector)) {
            filter.sector = req.query.sector;
        }

        if (QUARTERS.includes(req.query.quarter)) {
            filter.quarter = req.query.quarter;
        }

        if (req.query.year) {
            const year = toFiniteNumber(req.query.year);
            if (year !== null) {
                filter.year = year;
            }
        }

        if (
            [
                "PENDING",
                "APPROVED",
                "APPROVED_BY_HEAD",
                "VALIDATED",
                "DENIED",
            ].includes(req.query.status)
        ) {
            filter.status = req.query.status;
        }

        const records = await OfficePerformance.find(filter)
            .populate("submittedBy", "email firstName lastName")
            .populate("responsiblePerson", "email firstName lastName")
            .populate("reviewedBy", "email firstName lastName")
            .sort({ year: -1, quarter: -1, createdAt: -1 })
            .lean();

        res.json({
            success: true,
            count: records.length,
            data: records.map(serialize),
        });
    } catch (error) {
        console.error("GET PERFORMANCE:", error);

        res.status(500).json({
            success: false,
            error: "Failed to load performance records.",
            details: error.message,
        });
    }
};

export const getOfficePerformanceById = async (req, res) => {
    try {
        const record = await OfficePerformance.findById(req.params.id)
            .populate("submittedBy", "email firstName lastName")
            .populate("responsiblePerson", "email firstName lastName")
            .populate("reviewedBy", "email firstName lastName")
            .lean();

        if (!record) {
            return res.status(404).json({
                success: false,
                error: "Performance record not found.",
            });
        }

        const employee =
            req.session.role === "ADMIN"
                ? null
                : await getEmployeeForSession(req.session.id);

        if (!canAccessRecord(req, record, employee)) {
            return res.status(403).json({
                success: false,
                error: "You cannot access this performance record.",
            });
        }

        res.json({
            success: true,
            data: serialize(record),
        });
    } catch (error) {
        console.error("GET PERFORMANCE BY ID:", error);

        res.status(500).json({
            success: false,
            error: "Failed to load performance record.",
        });
    }
};

export const updateOfficePerformance = async (req, res) => {
    try {
        if (req.session.role !== "EMPLOYEE") {
            return res.status(403).json({
                success: false,
                error: "Only the Encoder/User can edit a submission.",
            });
        }

        const existing = await OfficePerformance.findById(req.params.id).lean();

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: "Performance record not found.",
            });
        }

        const employee = await getEmployeeForSession(req.session.id);

        if (!employee?.department) {
            return res.status(400).json({
                success: false,
                error: "Your account has no assigned office.",
            });
        }

        if (existing.office !== employee.department) {
            return res.status(403).json({
                success: false,
                error: "You can only update submissions belonging to your assigned office.",
            });
        }

        if (
            existing.status === "APPROVED_BY_HEAD" ||
            existing.status === "VALIDATED" ||
            existing.status === "APPROVED"
        ) {
            return res.status(403).json({
                success: false,
                error: "Approved performance cannot be edited.",
            });
        }

        const parsed = parseFields(req.body, {
            userOffice: employee.department,
        });

        if (parsed.error) {
            return res.status(400).json({
                success: false,
                error: parsed.error,
            });
        }

        const duplicate = await findDuplicate({
            ...parsed.values,
            excludeId: existing._id,
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                error:
                    "Another record already exists for this PPA, office, quarter, and year.",
            });
        }

        const derived = deriveOfficePerformance(parsed.values);

        const record = await OfficePerformance.findByIdAndUpdate(
            req.params.id,
            {
                ...parsed.values,
                ...derived,
                source: "USER",
                status:
                    existing.status === "DENIED"
                        ? "PENDING"
                        : existing.status || "PENDING",
                adminRemarks:
                    existing.status === "DENIED"
                        ? ""
                        : existing.adminRemarks || "",
                reviewedBy:
                    existing.status === "DENIED"
                        ? null
                        : existing.reviewedBy || null,
                reviewedAt:
                    existing.status === "DENIED"
                        ? null
                        : existing.reviewedAt || null,
                updatedAt: new Date(),
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).lean();

        res.json({
            success: true,
            message:
                existing.status === "DENIED"
                    ? "Performance corrected and resubmitted to the Department Head."
                    : "Performance submission updated successfully.",
            data: serialize(record),
        });
    } catch (error) {
        console.error("UPDATE PERFORMANCE:", error);

        res.status(500).json({
            success: false,
            error: "Failed to update performance.",
            details: error.message,
        });
    }
};

export const approveOfficePerformance = async (req, res) => {
    try {
        if (req.session.role !== "DEPARTMENT_HEAD") {
            return res.status(403).json({
                success: false,
                error: "Department Head approval is required.",
            });
        }

        const head = await getEmployeeForSession(req.session.id);

        if (!head?.department) {
            return res.status(400).json({
                success: false,
                error: "Department Head has no assigned office.",
            });
        }

        const record = await OfficePerformance.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                error: "Performance record not found.",
            });
        }

        if (record.office !== head.department) {
            return res.status(403).json({
                success: false,
                error: "You can only approve submissions from your assigned office.",
            });
        }

        if (
            record.status === "VALIDATED" ||
            record.status === "APPROVED"
        ) {
            return res.json({
                success: true,
                message: "Performance is already approved.",
                data: serialize(record.toObject()),
            });
        }

        if (
            !["PENDING", "DENIED"].includes(record.status)
        ) {
            return res.status(400).json({
                success: false,
                error: "This submission is not waiting for Department Head approval.",
            });
        }

        record.status = "APPROVED_BY_HEAD";
        record.responsiblePerson = req.session.id;
        record.reviewedBy = req.session.id;
        record.reviewedAt = new Date();
        record.adminRemarks = "";

        await record.save();

        res.json({
            success: true,
            message:
                "Performance approved by Department Head. The same submitted data is now available to PPDO/Admin monitoring.",
            data: serialize(record.toObject()),
        });
    } catch (error) {
        console.error("APPROVE PERFORMANCE:", error);

        res.status(500).json({
            success: false,
            error: "Failed to approve performance.",
        });
    }
};

export const denyOfficePerformance = async (req, res) => {
    try {
        if (req.session.role !== "DEPARTMENT_HEAD") {
            return res.status(403).json({
                success: false,
                error: "Department Head approval is required.",
            });
        }

        const remarks = cleanText(req.body.remarks);

        if (!remarks) {
            return res.status(400).json({
                success: false,
                error: "Return remarks are required.",
            });
        }

        const head = await getEmployeeForSession(req.session.id);
        const record = await OfficePerformance.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                error: "Performance record not found.",
            });
        }

        if (
            !head?.department ||
            record.office !== head.department
        ) {
            return res.status(403).json({
                success: false,
                error: "You can only return submissions from your assigned office.",
            });
        }

        record.status = "DENIED";
        record.adminRemarks = remarks;
        record.reviewedBy = req.session.id;
        record.reviewedAt = new Date();

        await record.save();

        res.json({
            success: true,
            message:
                "Performance returned to the Encoder with remarks.",
            data: serialize(record.toObject()),
        });
    } catch (error) {
        console.error("DENY PERFORMANCE:", error);

        res.status(500).json({
            success: false,
            error: "Failed to return performance.",
        });
    }
};

export const validateOfficePerformance = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "PPDO/Admin validation is required.",
            });
        }

        const record = await OfficePerformance.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                error: "Performance record not found.",
            });
        }

        if (
            !["APPROVED_BY_HEAD", "VALIDATED", "APPROVED"].includes(
                record.status
            )
        ) {
            return res.status(400).json({
                success: false,
                error:
                    "Only Department Head-approved submissions can be validated.",
            });
        }

        record.status = "VALIDATED";
        record.reviewedBy = req.session.id;
        record.reviewedAt = new Date();

        await record.save();

        res.json({
            success: true,
            message:
                "PPDO validation completed. No re-encoding was required.",
            data: serialize(record.toObject()),
        });
    } catch (error) {
        console.error("VALIDATE PERFORMANCE:", error);

        res.status(500).json({
            success: false,
            error: "Failed to validate performance.",
        });
    }
};

export const deleteOfficePerformance = async (req, res) => {
    try {
        if (req.session.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                error: "Only Admin can delete performance records.",
            });
        }

        const deleted = await OfficePerformance.findByIdAndDelete(
            req.params.id
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: "Performance record not found.",
            });
        }

        res.json({
            success: true,
            message: "Performance record deleted successfully.",
        });
    } catch (error) {
        console.error("DELETE PERFORMANCE:", error);

        res.status(500).json({
            success: false,
            error: "Failed to delete performance.",
        });
    }
};

const approvedStatuses = [
    "APPROVED",
    "APPROVED_BY_HEAD",
    "VALIDATED",
];

const buildSummary = async ({ office = null, year = null, quarter = null }) => {
    const filter = {
        status: { $in: approvedStatuses },
    };

    if (office) filter.office = office;
    if (year) filter.year = year;
    if (quarter) filter.quarter = quarter;

    const records = await OfficePerformance.find(filter).lean();

    const average = (field) =>
        records.length
            ? Number(
                  (
                      records.reduce(
                          (sum, item) =>
                              sum + Number(item[field] || 0),
                          0
                      ) / records.length
                  ).toFixed(2)
              )
            : 0;

    const total = (field) =>
        Number(
            records
                .reduce(
                    (sum, item) =>
                        sum + Number(item[field] || 0),
                    0
                )
                .toFixed(2)
        );

    const ratingDistribution = records.reduce((acc, item) => {
        const key = item.rating || "NO RATING";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const physicalFilter = {
        formType: "LBAC5",
        status: { $in: ["APPROVED", "APPROVED_BY_HEAD", "APPROVED_BY_ADMIN", "VALIDATED", "COMPLETED"] },
        ...(office ? { office } : {}),
        ...(year ? { year } : {}),
        ...(quarter ? { quarter } : {}),
    };
    const physicalRows = await PhysicalReport.find(physicalFilter).lean();
    const physicalMetrics = physicalRows.reduce((acc, report) => {
        const rows = Array.isArray(report.evaluationRows) ? report.evaluationRows : [];
        for (const row of rows) {
            if (String(row?.rowType || "ITEM").toUpperCase() !== "ITEM") continue;
            acc.target += Number(row.targetOutput || 0);
            acc.actual += Number(row.actualOutput || 0);
            acc.allocation += Number(row.allotmentReleased || 0);
            acc.obligations += Number(row.obligationsIncurred || 0);
            if (row.coaPct != null) {
                acc.coaTotal += Number(row.coaPct || 0);
                acc.coaCount += 1;
            }
            acc.itemCount += 1;
        }
        acc.reportCount += 1;
        return acc;
    }, { target: 0, actual: 0, allocation: 0, obligations: 0, coaTotal: 0, coaCount: 0, itemCount: 0, reportCount: 0 });

    physicalMetrics.variance = Number((physicalMetrics.actual - physicalMetrics.target).toFixed(2));
    physicalMetrics.accomplishment = physicalMetrics.target > 0 ? Number(((physicalMetrics.actual / physicalMetrics.target) * 100).toFixed(2)) : 0;
    physicalMetrics.absorptiveCapacity = physicalMetrics.allocation > 0 ? Number(((physicalMetrics.obligations / physicalMetrics.allocation) * 100).toFixed(2)) : 0;
    physicalMetrics.averageCoa = physicalMetrics.coaCount ? Number((physicalMetrics.coaTotal / physicalMetrics.coaCount).toFixed(2)) : 0;
    for (const key of ["target", "actual", "allocation", "obligations"]) physicalMetrics[key] = Number(physicalMetrics[key].toFixed(2));

    const offices = [
        ...new Set(records.map((item) => item.office).filter(Boolean)),
    ];

    return {
        approvedRecords: records.length,
        officesReporting: offices.length,
        averagePhysical: average("physicalPerformance"),
        averageFinancial: average("financialPerformance"),
        averageOverall: average("totalRating"),
        totalAllotment: total("totalAllotment"),
        totalActualObligation: total("totalActualObligation"),
        averageCoa: average("coaAccomplishment"),
        ratingDistribution,
        physicalReport: physicalMetrics,
    };
};

export const getPerformanceSummary = async (req, res) => {
    try {
        const role = req.session.role;
        let office = null;

        if (role === "EMPLOYEE" || role === "DEPARTMENT_HEAD") {
            const employee = await getEmployeeForSession(req.session.id);

            if (!employee?.department) {
                return res.status(404).json({
                    success: false,
                    error: "Your account has no assigned office.",
                });
            }

            office = employee.department;
        } else if (
            role === "ADMIN" &&
            req.query.office &&
            DEPARTMENTS.includes(req.query.office)
        ) {
            office = req.query.office;
        }

        const year = req.query.year
            ? toFiniteNumber(req.query.year)
            : null;

        const quarter = QUARTERS.includes(req.query.quarter)
            ? req.query.quarter
            : null;

        const summary = await buildSummary({
            office,
            year,
            quarter,
        });

        const scopeFilter = office
            ? { office }
            : {};

        const periodFilter = {
            ...scopeFilter,
            ...(year ? { year } : {}),
            ...(quarter ? { quarter } : {}),
        };

        const [pending, denied, approvedByHead, validated, all] =
            await Promise.all([
                OfficePerformance.countDocuments({
                    ...periodFilter,
                    status: "PENDING",
                }),

                OfficePerformance.countDocuments({
                    ...periodFilter,
                    status: "DENIED",
                }),

                OfficePerformance.countDocuments({
                    ...periodFilter,
                    status: "APPROVED_BY_HEAD",
                }),

                OfficePerformance.countDocuments({
                    ...periodFilter,
                    status: "VALIDATED",
                }),

                OfficePerformance.countDocuments(
                    periodFilter
                ),
            ]);

        res.json({
            success: true,
            scope: { office },
            filters: { year, quarter },
            counts: {
                all,
                pending,
                approvedByHead,
                validated,
                denied,
                approved:
                    approvedByHead + validated,
            },
            ...summary,
        });
    } catch (error) {
        console.error("PERFORMANCE SUMMARY:", error);

        res.status(500).json({
            success: false,
            error: "Failed to load performance summary.",
            details: error.message,
        });
    }
};
