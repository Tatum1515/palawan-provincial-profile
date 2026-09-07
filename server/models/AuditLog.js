import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        action: { type: String, required: true, trim: true, maxlength: 80, index: true },
        entityType: { type: String, required: true, trim: true, maxlength: 80, index: true },
        entityId: { type: String, trim: true, default: "" },
        office: { type: String, trim: true, default: "", index: true },
        formType: { type: String, trim: true, default: "" },
        year: { type: Number, default: null, index: true },
        quarter: { type: String, trim: true, default: "", index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
        userName: { type: String, trim: true, default: "" },
        details: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, entityType: 1, office: 1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
