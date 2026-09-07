import mongoose from "mongoose";

const quarterScheduleSchema = new mongoose.Schema(
    {
        year: { type: Number, required: true, min: 2000, max: 2100, index: true },
        quarter: { type: String, required: true, enum: ["Q1", "Q2", "Q3", "Q4"], index: true },
        openAt: { type: Date, required: true },
        closeAt: { type: Date, required: true },
        enabled: { type: Boolean, default: true },
        notes: { type: String, trim: true, maxlength: 1000, default: "" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

quarterScheduleSchema.index({ year: 1, quarter: 1 }, { unique: true });

export default mongoose.models.QuarterSchedule || mongoose.model("QuarterSchedule", quarterScheduleSchema);
