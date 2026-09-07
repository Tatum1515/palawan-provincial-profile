import mongoose from "mongoose";

const quarterValues = {
    q1: { type: Number, min: 0, default: null },
    q2: { type: Number, min: 0, default: null },
    q3: { type: Number, min: 0, default: null },
    q4: { type: Number, min: 0, default: null },
    total: { type: Number, min: 0, default: 0 },
};

const physicalReportRowSchema = new mongoose.Schema(
    {
        // The controller persists service/category rows as well as PPA items.
        // Without these fields Mongoose strict mode discarded rowType and
        // budgetType, so service rows came back as ITEM rows after a refresh.
        rowType: { type: String, enum: ["MAIN", "GROUP", "SERVICE", "SECTION", "CATEGORY", "ITEM"], default: "ITEM" },
        headingLevel: { type: Number, min: 0, max: 4, default: 4 },
        groupKey: { type: String, trim: true, maxlength: 120, default: "" },
        parentGroupKey: { type: String, trim: true, maxlength: 120, default: "" },
        budgetType: { type: String, enum: ["REGULAR", "SUPPLEMENTAL"], default: "REGULAR" },
        // Stable identity for a physical PPA/service row across quarterly snapshots.
        // This prevents duplicate rows when the same PPA code is reused by multiple activities.
        rowKey: { type: String, trim: true, maxlength: 180, default: "" },
        categoryName: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "General Service",
        },
        // Kept for backward compatibility / LBAC5 linkage.
        // It is no longer displayed as a per-row input in LBAC3.
        ppaCode: { type: String, trim: true, maxlength: 100, default: "" },
        ppaName: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        // Kept as the legacy row-level alias. LBAC3 now stores the main
        // final output at report level and mirrors it here for old records.
        majorFinalOutput: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        performanceIndicator: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },
        targetOutput: quarterValues,
        actualPerformance: quarterValues,
        variance: { type: Number, default: 0 },
        remarks: { type: String, trim: true, maxlength: 1000, default: "" },
    },
    { _id: true }
);

const lbac5RowSchema = new mongoose.Schema(
    {
        rowType: {
            type: String,
            enum: ["MAIN", "GROUP", "ITEM"],
            default: "ITEM",
        },
        categoryName: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },
        groupKey: { type: String, trim: true, maxlength: 120, default: "" },
        parentGroupKey: { type: String, trim: true, maxlength: 120, default: "" },
        budgetType: { type: String, enum: ["REGULAR", "SUPPLEMENTAL"], default: "REGULAR" },
        // Stable link back to the exact LBAC 3 physical row. LBAC 5 remains a
        // separate form/document, but its physical values are passed from this row.
        sourceLbac3RowId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        sourceLbac3RowKey: {
            type: String,
            trim: true,
            maxlength: 180,
            default: "",
        },
        ppaCode: { type: String, trim: true, maxlength: 100, default: "" },
        majorFinalOutput: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        cost: { type: Number, min: 0, default: 0 },
        weight: { type: Number, min: 0, max: 100, default: 0 },
        targetOutput: { type: Number, min: 0, default: 0 },
        actualOutput: { type: Number, min: 0, default: 0 },
        variance: { type: Number, default: 0 },
        accomplishmentPct: { type: Number, min: 0, default: 0 },
        physicalPoints: { type: Number, min: 1, max: 5, default: 1 },
        physicalWeightedScore: { type: Number, min: 0, default: 0 },
        coaPct: { type: Number, min: 0, max: 100, default: 0 },
        allotmentReleased: { type: Number, min: 0, default: 0 },
        obligationsIncurred: { type: Number, min: 0, default: 0 },
        financialVariance: { type: Number, default: 0 },
        absorptiveCapacityPct: { type: Number, min: 0, default: 0 },
        financialPoints: { type: Number, min: 1, max: 5, default: 1 },
        financialWeightedScore: { type: Number, min: 0, default: 0 },
        remarks: { type: String, trim: true, maxlength: 1000, default: "" },
    },
    { _id: true }
);

const signatureSchema = new mongoose.Schema(
    {
        data: { type: Buffer },
        mimeType: { type: String, trim: true },
        fileName: { type: String, trim: true },
        uploadedAt: { type: Date },
    },
    { _id: false }
);

const submissionHistorySchema = new mongoose.Schema(
    {
        status: { type: String, trim: true, maxlength: 50 },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        at: { type: Date, default: Date.now },
        remarks: { type: String, trim: true, maxlength: 2000, default: "" },
    },
    { _id: false }
);

const physicalReportSchema = new mongoose.Schema(
    {
        formType: {
            type: String,
            enum: ["LBAC3", "LBAC5"],
            default: "LBAC3",
            index: true,
        },

        office: { type: String, required: true, trim: true },
        sector: { type: String, required: true, trim: true },

        // Human-readable identity of this specific report. An office may have
        // multiple reports in the same quarter, so reportTitle distinguishes
        // them without changing the office/year/quarter structure.
        reportTitle: { type: String, trim: true, maxlength: 300, default: "" },
        year: { type: Number, required: true, min: 2000, max: 2100 },

        quarter: {
            type: String,
            enum: ["Q1", "Q2", "Q3", "Q4"],
            default: null,
        },

        // One office/year/quarter can contain multiple independent reports.
        // LBAC3 and LBAC5 belonging to the same report share this id.
        reportGroupId: { type: String, trim: true, maxlength: 64, default: () => new mongoose.Types.ObjectId().toString(), index: true },

        // LBAC3 Excel-style top-level fields.
        // These are the fields shown once at the top of the form.
        majorPpaCode: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },
        majorFinalOutput: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        periodEndDate: { type: Date, default: null },
        periodLabel: { type: String, trim: true, maxlength: 200, default: "" },
        varianceAsOf: { type: Date, default: null },

        rows: {
            type: [physicalReportRowSchema],
            default: [],
        },

        // Explicit user deletions are persisted separately so an intentionally
        // removed row is not resurrected from an older quarter snapshot.
        deletedLbac3RowKeys: {
            type: [String],
            default: [],
        },

        evaluationRows: {
            type: [lbac5RowSchema],
            default: [],
        },

        lbac3QuarterTotals: {
            Q1: {
                target: { type: Number, default: 0 },
                actual: { type: Number, default: 0 },
                variance: { type: Number, default: 0 },
            },
            Q2: {
                target: { type: Number, default: 0 },
                actual: { type: Number, default: 0 },
                variance: { type: Number, default: 0 },
            },
            Q3: {
                target: { type: Number, default: 0 },
                actual: { type: Number, default: 0 },
                variance: { type: Number, default: 0 },
            },
            Q4: {
                target: { type: Number, default: 0 },
                actual: { type: Number, default: 0 },
                variance: { type: Number, default: 0 },
            },
        },

        linkedLbac3Report: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PhysicalReport",
            default: null,
        },

        structureSourceReport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PhysicalReport",
            default: null,
        },

        linkedLbac3Totals: {
            quarter: { type: String, default: "" },
            target: { type: Number, default: 0 },
            actual: { type: Number, default: 0 },
            variance: { type: Number, default: 0 },
        },

        lbac5Totals: {
            totalCost: { type: Number, default: 0 },
            totalWeight: { type: Number, default: 0 },
            totalTargetOutput: { type: Number, default: 0 },
            totalActualOutput: { type: Number, default: 0 },
            totalVariance: { type: Number, default: 0 },
            physicalWeightedScore: { type: Number, default: 0 },
            totalAllotmentReleased: { type: Number, default: 0 },
            totalObligationsIncurred: { type: Number, default: 0 },
            financialVariance: { type: Number, default: 0 },
            financialWeightedScore: { type: Number, default: 0 },
            totalWeightedScore: { type: Number, default: 0 },
            averageCoa: { type: Number, default: 0 },
        },

        preparedBy: { type: String, trim: true, maxlength: 200, default: "" },
        preparedDate: { type: Date, default: null },

        // Last person who edited this report. This is separate from createdBy so
        // an Admin may carry forward prior-quarter data and the assigned office
        // encoder may later edit it without changing the original creator.
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        editedByName: { type: String, trim: true, maxlength: 200, default: "" },
        editedAt: { type: Date, default: null },

        // Provenance for Admin/PPDO-to-office handoff. A new quarter may be
        // initialized from the previous quarter, but the current report remains
        // independently editable by the assigned office encoder.
        carriedForwardFromReport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PhysicalReport",
            default: null,
        },
        carriedForwardFromQuarter: { type: String, trim: true, maxlength: 2, default: "" },
        carriedForwardAt: { type: Date, default: null },
        carriedForwardBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        carriedForwardByName: { type: String, trim: true, maxlength: 200, default: "" },

        officeHead: { type: String, trim: true, maxlength: 200, default: "" },
        officeHeadDate: { type: Date, default: null },
        localPlanningCoordinator: {
            type: String,
            trim: true,
            maxlength: 200,
            default: "",
        },
        localPlanningCoordinatorDate: { type: Date, default: null },

        signatures: {
            officeHead: { type: signatureSchema, default: null },
            localPlanningCoordinator: { type: signatureSchema, default: null },
        },

        status: {
            type: String,
            enum: [
                "DRAFT",
                "SUBMITTED",
                "UNDER_REVIEW",
                "RETURNED",
                "RESUBMITTED",
                "APPROVED",
                "APPROVED_BY_ADMIN",
                "VALIDATED",
                "COMPLETED",
                // Legacy statuses kept for existing records.
                "PENDING",
                "APPROVED_BY_HEAD",
                "DENIED",
            ],
            default: "DRAFT",
            index: true,
        },

        adminRemarks: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },

        returnReason: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },

        returnedAt: { type: Date, default: null },
        frozenAt: { type: Date, default: null },
        frozenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        submissionHistory: {
            type: [submissionHistorySchema],
            default: [],
        },

        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // `submittedBy` changes meaning during the workflow.  Keep a stable
        // encoder owner for authorization and audit trails instead.
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        validatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        validatedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

physicalReportSchema.index({
    office: 1,
    year: 1,
    formType: 1,
    quarter: 1,
    reportGroupId: 1,
}, { unique: true });

physicalReportSchema.index({
    status: 1,
    office: 1,
    formType: 1,
});

physicalReportSchema.index({
    year: 1,
    quarter: 1,
    status: 1,
    office: 1,
    formType: 1,
    createdAt: -1,
});

physicalReportSchema.index({
    submittedBy: 1,
    year: 1,
    formType: 1,
});

physicalReportSchema.index({
    createdBy: 1,
    office: 1,
    year: 1,
    formType: 1,
});

export default
    mongoose.models.PhysicalReport ||
    mongoose.model("PhysicalReport", physicalReportSchema);
