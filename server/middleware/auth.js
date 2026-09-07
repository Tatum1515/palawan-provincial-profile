import jwt from "jsonwebtoken";

export const protect = (
    req,
    res,
    next
) => {
    try {
        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith(
                "Bearer "
            )
        ) {
            return res.status(401).json({
                error: "Not authorized",
            });
        }

        const token =
            authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                error: "Not authorized",
            });
        }

        const session =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        if (!session) {
            return res.status(401).json({
                error: "Not authorized",
            });
        }

        req.session = session;

        next();
    } catch (error) {
        console.error(
            "Authentication error:",
            error
        );

        return res.status(401).json({
            error: "Not authorized",
        });
    }
};

export const protectAdmin = (
    req,
    res,
    next
) => {
    if (
        req?.session?.role !==
        "ADMIN"
    ) {
        return res.status(403).json({
            error:
                "Admin access required",
        });
    }

    next();
};

/*
 * MAIN ADMIN ONLY
 *
 * Uses the existing ADMIN_EMAIL
 * from server/.env.
 *
 * There is NO new SUPER_ADMIN role.
 */
export const protectMainAdmin = (
    req,
    res,
    next
) => {
    const configuredAdminEmail =
        String(
            process.env.ADMIN_EMAIL ||
                ""
        )
            .trim()
            .toLowerCase();

    const loggedInEmail =
        String(
            req?.session?.email || ""
        )
            .trim()
            .toLowerCase();

    /*
     * Must be ADMIN.
     */
    if (
        req?.session?.role !==
        "ADMIN"
    ) {
        return res.status(403).json({
            error:
                "Admin access required",
        });
    }

    /*
     * ADMIN_EMAIL must exist.
     */
    if (!configuredAdminEmail) {
        console.error(
            "ADMIN_EMAIL is not configured."
        );

        return res.status(403).json({
            error:
                "Main administrator is not configured.",
        });
    }

    /*
     * Email must match the Main Admin.
     */
    if (
        loggedInEmail !==
        configuredAdminEmail
    ) {
        return res.status(403).json({
            error:
                "User Management is restricted to the Main Administrator.",
        });
    }

    next();
};

export const protectRoles = (...roles) => (req, res, next) => {
    if (!roles.includes(req?.session?.role)) {
        return res.status(403).json({
            error: "You do not have permission to perform this action.",
        });
    }

    next();
};
