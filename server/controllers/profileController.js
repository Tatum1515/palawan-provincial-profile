import Employee from "../models/Employee.js";
import User from "../models/User.js";

// GET /api/profile
export const getProfile = async (
    req,
    res
) => {
    try {
        const user = await User.findById(
            req.session.id
        ).select(
            "email role isActive lastLoginAt createdAt firstName lastName phone"
        );

        if (!user) {
            return res.status(404).json({
                error: "User not found.",
            });
        }

        const employee =
            await Employee.findOne({
                userID: req.session.id,
            }).lean();

        return res.json({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            isActive: user.isActive !== false,
            lastLoginAt:
                user.lastLoginAt,
            createdAt: user.createdAt,
            firstName:
                employee?.firstName ||
                user.firstName ||
                "Admin",
            lastName:
                employee?.lastName ||
                user.lastName ||
                "",
            phone:
                employee?.phone ||
                user.phone ||
                "",
            position:
                employee?.position ||
                "Administrator",
            department:
                employee?.department ||
                "Provincial Planning and Development Office",
            joinDate:
                employee?.joinDate ||
                user.createdAt,
            employmentStatus:
                employee?.employmentStatus ||
                (user.isActive
                    ? "ACTIVE"
                    : "INACTIVE"),
        });
    } catch (error) {
        console.error(
            "Get profile error:",
            error
        );

        return res.status(500).json({
            error: "Failed to fetch profile.",
        });
    }
};

// PUT /api/profile
export const updateProfile = async (
    req,
    res
) => {
    try {
        const {
            firstName,
            lastName,
            phone,
        } = req.body;

        if (!firstName?.trim() || !lastName?.trim()) {
            return res.status(400).json({
                error:
                    "First name and last name are required.",
            });
        }

        const user = await User.findById(
            req.session.id
        );

        if (!user) {
            return res.status(404).json({
                error: "User not found.",
            });
        }

        const normalizedFirstName = firstName.trim();
        const normalizedLastName = lastName.trim();
        const normalizedPhone = String(phone || "").trim();

        user.firstName = normalizedFirstName;
        user.lastName = normalizedLastName;
        user.phone = normalizedPhone;
        await user.save();

        const employee = await Employee.findOne({
            userID: req.session.id,
        });

        if (employee) {
            employee.firstName = normalizedFirstName;
            employee.lastName = normalizedLastName;
            employee.phone = normalizedPhone;
            await employee.save();
        }

        return res.json({
            success: true,
            message: "Profile updated successfully.",
            profile: {
                firstName: normalizedFirstName,
                lastName: normalizedLastName,
                phone: normalizedPhone,
            },
        });
    } catch (error) {
        console.error(
            "Update profile error:",
            error
        );

        return res.status(500).json({
            error: "Failed to update profile.",
        });
    }
};
