import "dotenv/config";
import connectDB from "../config/db.js";
import PhysicalReport from "../models/PhysicalReport.js";

// One-time, idempotent migration for records created before `createdBy`.
// Existing submittedBy is the only trustworthy historical owner available.
const run = async () => {
    await connectDB();
    const result = await PhysicalReport.updateMany(
        {
            $or: [
                { createdBy: { $exists: false } },
                { createdBy: null },
            ],
            submittedBy: { $ne: null },
        },
        [{ $set: { createdBy: "$submittedBy" } }]
    );
    console.log(`Physical Report owner backfill complete. Updated: ${result.modifiedCount}.`);
    process.exit(0);
};

run().catch((error) => {
    console.error("Physical Report owner backfill failed:", error);
    process.exit(1);
});
