export const parseExpectedUpdatedAt = (value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
        return {
            provided: false,
            date: null,
        };
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return {
            provided: true,
            date: null,
            error: "Invalid report version timestamp.",
        };
    }

    return {
        provided: true,
        date,
    };
};

export const sameTimestamp = (left, right) => {
    const leftTime = new Date(left).getTime();
    const rightTime = new Date(right).getTime();

    return Number.isFinite(leftTime) &&
        Number.isFinite(rightTime) &&
        leftTime === rightTime;
};

export const staleUpdateResponse = (res) =>
    res.status(409).json({
        success: false,
        code: "REPORT_VERSION_CONFLICT",
        error:
            "This report was modified by another user after you opened it. Reload the latest version before saving your changes.",
    });
