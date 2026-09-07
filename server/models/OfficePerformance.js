import mongoose from "mongoose";
import { SECTORS, DEPARTMENTS } from "../constants/departments.js";
import { RATING_VALUES } from "../utils/officePerformanceCalculations.js";

const officePerformanceSchema = new mongoose.Schema(
    {
        ppa: { type: String, required: true, trim: true, maxlength: 300 },
        sector: { type: String, required: true, enum: SECTORS },
        office: { type: String, required: true, trim: true, enum: DEPARTMENTS },
        fundSource: { type: String, required: true, trim: true, maxlength: 150 },
        quarter: { type: String, required: true, enum: ["Q1", "Q2", "Q3", "Q4"] },
        year: { type: Number, required: true, min: 2000, max: 2100 },
        physicalPerformance: { type: Number, required: true, min: 0, max: 5 },
        financialPerformance: { type: Number, required: true, min: 0, max: 5 },
        totalAllotment: { type: Number, min: 0, default: 0 },
        totalActualObligation: { type: Number, min: 0, default: 0 },
        coaAccomplishment: { type: Number, min: 0, max: 100, default: 0 },
        remarks: { type: String, trim: true, default: "" },

        responsiblePerson: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

        overallPhysical: { type: Number, default: 0 },
        overallFinancial: { type: Number, default: 0 },
        totalRating: { type: Number, default: 0 },
        rating: { type: String, enum: RATING_VALUES, default: "NO RATING" },

        // USER is now the source of the record. ADMIN is retained only for legacy data.
        source: { type: String, enum: ["ADMIN", "USER"], default: "USER" },

        // PENDING -> APPROVED_BY_HEAD -> VALIDATED
        // DENIED sends the record back to the encoder.
        status: {
            type: String,
            enum: [
                "PENDING",
                "APPROVED",
                "APPROVED_BY_HEAD",
                "VALIDATED",
                "DENIED",
            ],
            default: "PENDING",
        },

        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        reviewedAt: { type: Date, default: null },
        adminRemarks: { type: String, trim: true, default: "" },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

officePerformanceSchema.index({ office: 1, year: 1, quarter: 1 });
officePerformanceSchema.index({ status: 1, office: 1 });

officePerformanceSchema.index({
    year: 1,
    quarter: 1,
    status: 1,
    office: 1,
    createdAt: -1,
});
officePerformanceSchema.index({ submittedBy: 1, status: 1 });

export default mongoose.models.OfficePerformance ||
    mongoose.model("OfficePerformance", officePerformanceSchema);
