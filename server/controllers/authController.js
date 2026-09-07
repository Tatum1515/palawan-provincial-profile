import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const normalizeEmail = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase();
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const {
            email,
            password,
            role_type,
        } = req.body;

        const normalizedEmail =
            normalizeEmail(email);

        if (
            !normalizedEmail ||
            !password
        ) {
            return res.status(400).json({
                error:
                    "Email and password are required.",
            });
        }

        /*
         * IMPORTANT:
         *
         * Explicitly request password.
         */
        const user =
            await User.findOne({
                email: normalizedEmail,
            }).select(
                "+password"
            );

        if (!user) {
            return res.status(401).json({
                error:
                    "Invalid credentials.",
            });
        }

        /*
         * If this happens, the server is
         * not receiving the password hash.
         */
        if (!user.password) {
            console.error(
                "CRITICAL: User password hash is missing for account:",
                user._id.toString()
            );

            return res.status(500).json({
                error:
                    "The user account does not contain a valid password hash.",
            });
        }

        /*
         * Check active account.
         */
        if (
            user.isActive === false
        ) {
            return res.status(403).json({
                error:
                    "This account is inactive. Please contact the administrator.",
            });
        }

        /*
         * Check portal role.
         */
        if (
            role_type === "admin" &&
            user.role !== "ADMIN"
        ) {
            return res.status(403).json({
                error:
                    "This account is not authorized for the admin portal.",
            });
        }

        if (
            role_type === "employee" &&
            !["EMPLOYEE", "DEPARTMENT_HEAD"].includes(user.role)
        ) {
            return res.status(403).json({
                error:
                    "This account is not authorized for the user portal.",
            });
        }

        /*
         * Compare entered password
         * against bcrypt hash.
         */
        const isValid =
            await bcrypt.compare(
                String(password),
                user.password
            );

        if (!isValid) {
            return res.status(401).json({
                error:
                    "Invalid credentials.",
            });
        }

        /*
         * Determine Main Admin.
         *
         * Uses the existing ADMIN_EMAIL.
         */
        const adminEmail =
            normalizeEmail(
                process.env.ADMIN_EMAIL
            );

        const isMainAdmin =
            user.role === "ADMIN" &&
            adminEmail !== "" &&
            normalizeEmail(
                user.email
            ) === adminEmail;

        /*
         * Update last login if field exists.
         */
        try {
            await User.findByIdAndUpdate(
                user._id,
                {
                    lastLoginAt:
                        new Date(),
                }
            );
        } catch (updateError) {
            console.warn(
                "Could not update lastLoginAt:",
                updateError.message
            );
        }

        /*
         * JWT payload.
         */
        const payload = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            isMainAdmin,
        };

        /*
         * JWT expiration is configurable via
         * JWT_EXPIRES_IN (see .env.example).
         * Falls back to 7 days if unset.
         */
        const jwtExpiresIn =
            process.env.JWT_EXPIRES_IN || "7d";

        const token =
            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                {
                    expiresIn: jwtExpiresIn,
                }
            );

        return res.status(200).json({
            user: payload,
            token,
        });
    } catch (error) {
        console.error(
            "LOGIN ERROR:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to login.",
        });
    }
};

// GET /api/auth/session
export const getSession = async (
    req,
    res
) => {
    try {
        const session =
            req.session;

        if (!session) {
            return res.status(401).json({
                error:
                    "No active session.",
            });
        }

        /*
         * Recalculate Main Admin status
         * for existing tokens.
         */
        const adminEmail =
            normalizeEmail(
                process.env.ADMIN_EMAIL
            );

        session.isMainAdmin =
            session.role === "ADMIN" &&
            adminEmail !== "" &&
            normalizeEmail(
                session.email
            ) === adminEmail;

        return res.json({
            user: session,
        });
    } catch (error) {
        console.error(
            "Session error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to get session.",
        });
    }
};

// POST /api/auth/change-password
export const changePassword =
    async (req, res) => {
        try {
            const session =
                req.session;

            const {
                currentPassword,
                newPassword,
            } = req.body;

            if (
                !currentPassword ||
                !newPassword
            ) {
                return res.status(400).json({
                    error:
                        "Current password and new password are required.",
                });
            }

            if (
                String(newPassword).length < 8
            ) {
                return res.status(400).json({
                    error:
                        "New password must be at least 8 characters long.",
                });
            }

            const user =
                await User.findById(
                    session.id
                ).select(
                    "+password"
                );

            if (!user) {
                return res.status(404).json({
                    error:
                        "User not found.",
                });
            }

            if (!user.password) {
                return res.status(500).json({
                    error:
                        "User password hash is missing.",
                });
            }

            const isValid =
                await bcrypt.compare(
                    String(
                        currentPassword
                    ),
                    user.password
                );

            if (!isValid) {
                return res.status(400).json({
                    error:
                        "Invalid current password.",
                });
            }

            const hashed =
                await bcrypt.hash(
                    String(
                        newPassword
                    ),
                    10
                );

            user.password =
                hashed;

            await user.save();

            return res.json({
                success: true,
            });
        } catch (error) {
            console.error(
                "Change password error:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to change password.",
            });
        }
    };
