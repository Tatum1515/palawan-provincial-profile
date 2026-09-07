import Employee from "../models/Employee.js";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { DEPARTMENTS } from "../constants/departments.js";

const normalizeEmail = (value) =>
    String(value || "")
        .trim()
        .toLowerCase();

const allowedRoles = [
    "ADMIN",
    "DEPARTMENT_HEAD",
    "EMPLOYEE",
];

const allowedStatuses = [
    "ACTIVE",
    "INACTIVE",
];

const publicEmployee = (emp) => ({
    ...emp,
    id: emp._id.toString(),
    user: emp.userID
        ? {
              id: emp.userID._id.toString(),
              email: emp.userID.email,
              role: emp.userID.role,
              isActive:
                  emp.userID.isActive !== false,
              lastLoginAt:
                  emp.userID.lastLoginAt,
          }
        : null,
});

// GET /api/employees
export const getEmployees = async (
    req,
    res
) => {
    try {
        const {
            department,
            role,
            status,
            search,
        } = req.query;

        const where = {};

        if (
            department &&
            DEPARTMENTS.includes(
                department
            )
        ) {
            where.department = department;
        }

        if (
            status &&
            allowedStatuses.includes(
                status
            )
        ) {
            where.employmentStatus = status;
        }

        if (!status) {
            // Show both active and inactive users in the admin list.
            // The soft-delete flag is retained for history and recovery.
        }

        if (search?.trim()) {
            const escaped = search
                .trim()
                .replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

            const regex = new RegExp(
                escaped,
                "i"
            );

            where.$or = [
                {
                    firstName: regex,
                },
                {
                    lastName: regex,
                },
                {
                    position: regex,
                },
                {
                    email: regex,
                },
            ];
        }

        const employees =
            await Employee.find(where)
                .sort({
                    createdAt: -1,
                })
                .populate(
                    "userID",
                    "email role isActive lastLoginAt"
                )
                .lean();

        let result = employees.map(
            publicEmployee
        );

        if (
            role &&
            allowedRoles.includes(role)
        ) {
            result = result.filter(
                (employee) =>
                    employee.user
                        ?.role === role
            );
        }

        return res.json(result);
    } catch (error) {
        console.error(
            "Get employees error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to fetch users.",
        });
    }
};

// POST /api/employees
export const createEmployee = async (
    req,
    res
) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            position,
            department,
            joinDate,
            password,
            role,
        } = req.body;

        const normalizedEmail =
            normalizeEmail(email);

        if (
            !firstName?.trim() ||
            !lastName?.trim() ||
            !normalizedEmail ||
            !password ||
            !phone?.trim() ||
            !position?.trim() ||
            !department
        ) {
            return res.status(400).json({
                error:
                    "Please complete all required user fields.",
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                error:
                    "Password must be at least 8 characters long.",
            });
        }

        if (
            !DEPARTMENTS.includes(
                department
            )
        ) {
            return res.status(400).json({
                error:
                    "Invalid office or department.",
            });
        }

        const safeRole = allowedRoles.includes(
            role
        )
            ? role
            : "EMPLOYEE";

        const existingUser =
            await User.findOne({
                email: normalizedEmail,
            });

        if (existingUser) {
            return res.status(409).json({
                error:
                    "An account with this email already exists.",
            });
        }

        const hashed =
            await bcrypt.hash(
                password,
                12
            );

        const user = await User.create({
            email: normalizedEmail,
            password: hashed,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            role: safeRole,
            isActive: true,
        });

        try {
            const employee =
                await Employee.create({
                    userID: user._id,
                    firstName:
                        firstName.trim(),
                    lastName:
                        lastName.trim(),
                    email: normalizedEmail,
                    phone: phone.trim(),
                    position:
                        position.trim(),
                    department,
                    joinDate:
                        joinDate || new Date(),
                    employmentStatus:
                        "ACTIVE",
                    isDeleted: false,
                });

            return res.status(201).json({
                success: true,
                employee,
            });
        } catch (employeeError) {
            await User.findByIdAndDelete(
                user._id
            );
            throw employeeError;
        }
    } catch (error) {
        console.error(
            "Create employee error:",
            error
        );

        if (error.code === 11000) {
            return res.status(409).json({
                error:
                    "Email or account already exists.",
            });
        }

        return res.status(500).json({
            error:
                "Failed to create user.",
        });
    }
};

// PUT /api/employees/:id
export const updateEmployee = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const {
            firstName,
            lastName,
            email,
            phone,
            position,
            department,
            password,
            role,
            employmentStatus,
        } = req.body;

        const employee =
            await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                error: "User not found.",
            });
        }

        const user = await User.findById(
            employee.userID
        ).select("+password");

        if (!user) {
            return res.status(404).json({
                error:
                    "Linked account not found.",
            });
        }

        const normalizedEmail =
            normalizeEmail(email);

        if (!normalizedEmail) {
            return res.status(400).json({
                error: "Email is required.",
            });
        }

        if (
            department &&
            !DEPARTMENTS.includes(
                department
            )
        ) {
            return res.status(400).json({
                error:
                    "Invalid office or department.",
            });
        }

        if (
            role &&
            !allowedRoles.includes(role)
        ) {
            return res.status(400).json({
                error: "Invalid system role.",
            });
        }

        if (
            employmentStatus &&
            !allowedStatuses.includes(
                employmentStatus
            )
        ) {
            return res.status(400).json({
                error: "Invalid account status.",
            });
        }

        const isSelf =
            req.session.id ===
            user._id.toString();

        if (
            isSelf &&
            role === "EMPLOYEE"
        ) {
            return res.status(400).json({
                error:
                    "You cannot remove your own administrator role.",
            });
        }

        if (
            isSelf &&
            employmentStatus ===
                "INACTIVE"
        ) {
            return res.status(400).json({
                error:
                    "You cannot deactivate your own account.",
            });
        }

        const duplicate =
            await User.findOne({
                email: normalizedEmail,
                _id: {
                    $ne: user._id,
                },
            });

        if (duplicate) {
            return res.status(409).json({
                error:
                    "Another account already uses this email.",
            });
        }

        if (
            password &&
            String(password).length < 8
        ) {
            return res.status(400).json({
                error:
                    "Password must be at least 8 characters long.",
            });
        }

        employee.firstName =
            firstName?.trim() ||
            employee.firstName;
        employee.lastName =
            lastName?.trim() ||
            employee.lastName;
        employee.email =
            normalizedEmail;
        employee.phone =
            phone?.trim() ||
            employee.phone;
        employee.position =
            position?.trim() ||
            employee.position;
        employee.department =
            department ||
            employee.department;
        employee.employmentStatus =
            employmentStatus ||
            employee.employmentStatus;
        employee.isDeleted =
            employee.employmentStatus ===
            "INACTIVE"
                ? true
                : false;

        await employee.save();

        user.email = normalizedEmail;
        user.firstName = employee.firstName;
        user.lastName = employee.lastName;
        user.phone = employee.phone;

        if (role) {
            user.role = role;
        }

        if (employmentStatus) {
            user.isActive =
                employmentStatus ===
                "ACTIVE";
        }

        if (password) {
            user.password =
                await bcrypt.hash(
                    password,
                    12
                );
        }

        await user.save();

        return res.json({
            success: true,
            message:
                "User account updated successfully.",
        });
    } catch (error) {
        console.error(
            "Update employee error:",
            error
        );

        if (error.code === 11000) {
            return res.status(409).json({
                error:
                    "Email or account already exists.",
            });
        }

        return res.status(500).json({
            error:
                "Failed to update user.",
        });
    }
};

// DELETE /api/employees/:id
// Soft-deactivate account. Existing records are preserved.
export const deleteEmployee = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const employee =
            await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({
                error: "User not found.",
            });
        }

        if (
            employee.userID?.toString() ===
            req.session.id
        ) {
            return res.status(400).json({
                error:
                    "You cannot deactivate your own account.",
            });
        }

        employee.isDeleted = true;
        employee.employmentStatus =
            "INACTIVE";
        await employee.save();

        await User.findByIdAndUpdate(
            employee.userID,
            {
                isActive: false,
            }
        );

        return res.json({
            success: true,
            message:
                "User account deactivated successfully.",
        });
    } catch (error) {
        console.error(
            "Delete employee error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to deactivate user.",
        });
    }
};
