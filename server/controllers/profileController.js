import Employee from "../models/Employee.js";

// GET /api/profile
export const getProfile = async (req, res) => {
    try {
        const session = req.session;
        // token payload contains `id` (see authController)
        const employee = await Employee.findOne({ userID: session?.id });

        if (!employee) {
            // authenticated user is not an employee - return admin profile
            return res.json({
                firstName: "Admin",
                lastName: "",
                email: session?.email,
            });
        }

        return res.json(employee);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
    try {
        const session = req.session;
        const employee = await Employee.findOne({ userID: session?.id });

        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }

        if (employee.isDeleted) {
            return res.status(403).json({ error: "Your account is deactivated" });
        }

        await Employee.findByIdAndUpdate(employee._id, { bio: req.body.bio });
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to update profile" });
    }
};