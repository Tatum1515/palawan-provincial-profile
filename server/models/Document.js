import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  folder: { type: String, default: "General", trim: true },
  sector: { type: String, default: "", trim: true },
  office: { type: String, default: "", trim: true },
  description: { type: String, default: "", trim: true, maxlength: 1000 },
  quarter: { type: String, default: "", trim: true },
  year: { type: Number, min: 2000, max: 2100 },
  dueDate: { type: Date },
  priority: { type: String, enum: ["LOW", "NORMAL", "HIGH"], default: "NORMAL" },
  tags: [{ type: String, trim: true }],
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  content: { type: Buffer, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["PENDING", "APPROVED_BY_HEAD", "VALIDATED", "RECEIVED", "ENDED", "SENT", "FULFILLED"], default: "PENDING" },
  remark: { type: String, default: "", trim: true },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  departmentHeadReviewedAt: { type: Date },
  departmentHeadReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  adminValidatedAt: { type: Date },
  adminValidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // Admin-issued template/format tracking
  kind: { type: String, enum: ["SUBMISSION", "TEMPLATE"], default: "SUBMISSION" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedOffice: { type: String, default: "", trim: true },
  instructions: { type: String, default: "", trim: true, maxlength: 1000 },
  parentDocument: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },
  activity: [{
    action: { type: String, required: true },
    note: { type: String, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

documentSchema.index({
  kind: 1,
  year: 1,
  quarter: 1,
  status: 1,
  office: 1,
  createdAt: -1,
});

export default mongoose.models.Document || mongoose.model("Document", documentSchema);
