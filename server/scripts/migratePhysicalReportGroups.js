import mongoose from "mongoose";
import PhysicalReport from "../models/PhysicalReport.js";
import "dotenv/config";

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error("MONGODB_URI is required.");

await mongoose.connect(mongoUri);
try {
  const reports = await PhysicalReport.find({}).sort({ office: 1, year: 1, quarter: 1, createdAt: 1 });
  const groups = new Map();
  let changed = 0;
  for (const report of reports) {
    if (report.reportGroupId) continue;
    const key = `${report.office}|${report.year}|${report.quarter}|${report.createdBy || report.submittedBy || "legacy"}`;
    let groupId = groups.get(key);
    if (!groupId) groupId = new mongoose.Types.ObjectId().toString(), groups.set(key, groupId);
    report.reportGroupId = groupId;
    await report.save();
    changed += 1;
  }
  try { await mongoose.connection.collection("physicalreports").dropIndex("office_1_year_1_formType_1_quarter_1"); } catch (error) { if (error.codeName !== "IndexNotFound") throw error; }
  await PhysicalReport.syncIndexes();
  console.log(`Physical Report group migration complete. Updated ${changed} records.`);
} finally { await mongoose.disconnect(); }
