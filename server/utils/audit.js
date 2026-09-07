import AuditLog from "../models/AuditLog.js";
import Employee from "../models/Employee.js";
import User from "../models/User.js";

export const getActorName = async (sessionId) => {
    if (!sessionId) return "System";
    const employee = await Employee.findOne({ userID: sessionId, isDeleted: { $ne: true } })
        .select("firstName lastName")
        .lean();
    const employeeName = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();
    if (employeeName) return employeeName;
    const user = await User.findById(sessionId).select("firstName lastName email").lean();
    const userName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return userName || user?.email || "System";
};

export const writeAudit = async (req, data = {}) => {
    try {
        const userId = req.session?.id || null;
        const userName = await getActorName(userId);
        await AuditLog.create({
            ...data,
            userId,
            userName,
        });
    } catch (error) {
        console.error("AUDIT LOG WRITE FAILED:", error);
    }
};
