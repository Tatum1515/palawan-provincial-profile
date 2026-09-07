import { OFFICES_BY_SECTOR } from "../constants/departments.js";

export const cleanText = (value) => String(value ?? "").trim();

// Physical Report writes are intentionally JSON-first. Keep a single normalized
// request body so a missing body, old clients, or empty values never make the
// controller crash before validation can produce a useful response.

export const bodyOf = (req) => (req && req.body && typeof req.body === "object" ? req.body : {});

export const numberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export const parseJson = (value, fallback) => {
    if (Array.isArray(value) || (value && typeof value === "object")) return value;
    if (!value) return fallback;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

export const sectorForOffice = (office) =>
    Object.entries(OFFICES_BY_SECTOR).find(([, offices]) => offices.includes(office))?.[0] || "";

export const quarterValues = (value = {}) => {
    const q1 = numberOrNull(value.q1);
    const q2 = numberOrNull(value.q2);
    const q3 = numberOrNull(value.q3);
    const q4 = numberOrNull(value.q4);

    if ([q1, q2, q3, q4].some((item) => item !== null && item < 0)) {
        return {
            error: "Quarterly target and actual values cannot be negative.",
        };
    }

    const total = Number(
        [q1, q2, q3, q4]
            .filter((item) => item !== null)
            .reduce((sum, item) => sum + item, 0)
            .toFixed(2)
    );

    return {
        value: {
            q1,
            q2,
            q3,
            q4,
            total,
        },
    };
};
