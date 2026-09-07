const MAX_ROWS = 1000;
const MAX_DELETED_ROW_KEYS = 5000;
const MAX_DATE_YEAR = 2100;

const FORM_TYPES = new Set(['LBAC3','LBAC5']);
const QUARTERS = new Set(['Q1','Q2','Q3','Q4']);
const SUBMISSION_ACTIONS = new Set(['DRAFT','SUBMIT']);

const cleanText = (value) => String(value ?? '').trim();

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const invalidNumberMessage = (field) => `${field} must be a valid number.`;

const validateFiniteNonNegative = (value, field, { max = null } = {}) => {
    if (value === '' || value === null || value === undefined) return '';
    const number = Number(value);
    if (!Number.isFinite(number)) return invalidNumberMessage(field);
    if (number < 0) return `${field} cannot be negative.`;
    if (max !== null && number > max) return `${field} cannot exceed ${max}.`;
    return '';
};

const validateDateValue = (value, field) => {
    if (value === '' || value === null || value === undefined) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return `${field} must be a valid date.`;
    if (date.getUTCFullYear() < 2000 || date.getUTCFullYear() > MAX_DATE_YEAR) {
        return `${field} must contain a valid reporting date.`;
    }
    return '';
};

const validateNumericField = (row, field, label, options = {}) => {
    if (!hasOwn(row, field)) return '';
    return validateFiniteNonNegative(row[field], label, options);
};

export const validatePhysicalReportBusinessRules = ({
    formType,
    office,
    sector,
    year,
    quarter,
    submissionAction,
    periodEndDate,
    varianceAsOf,
    preparedDate,
    rows,
    evaluationRows,
    deletedRowKeys,
}) => {
    const normalizedFormType = cleanText(formType).toUpperCase();
    if (!FORM_TYPES.has(normalizedFormType)) {
        return 'Please select a valid Physical Report form type.';
    }

    if (!cleanText(office)) return 'Office is required.';
    if (!cleanText(sector)) return 'Sector is required.';

    const numericYear = Number(year);
    if (!Number.isInteger(numericYear) || numericYear < 2000 || numericYear > MAX_DATE_YEAR) {
        return 'Please enter a valid reporting year.';
    }

    const normalizedQuarter = cleanText(quarter).toUpperCase();
    if (!QUARTERS.has(normalizedQuarter)) return 'Please select a valid quarter.';

    if (submissionAction !== undefined && submissionAction !== null && !SUBMISSION_ACTIONS.has(cleanText(submissionAction).toUpperCase())) {
        return 'Invalid submission action.';
    }

    for (const [value, field] of [
        [periodEndDate, 'Period end date'],
        [varianceAsOf, 'Variance as-of date'],
        [preparedDate, 'Prepared date'],
    ]) {
        const error = validateDateValue(value, field);
        if (error) return error;
    }

    if (rows !== undefined && rows !== null && !Array.isArray(rows)) return 'LBAC Form 3 rows must be an array.';
    if (evaluationRows !== undefined && evaluationRows !== null && !Array.isArray(evaluationRows)) return 'LBAC Form 5 rows must be an array.';
    if (Array.isArray(rows) && rows.length > MAX_ROWS) return `LBAC Form 3 cannot contain more than ${MAX_ROWS} rows.`;
    if (Array.isArray(evaluationRows) && evaluationRows.length > MAX_ROWS) return `LBAC Form 5 cannot contain more than ${MAX_ROWS} rows.`;
    if (deletedRowKeys !== undefined && deletedRowKeys !== null && !Array.isArray(deletedRowKeys)) return 'Deleted LBAC Form 3 row keys must be an array.';
    if (Array.isArray(deletedRowKeys) && deletedRowKeys.length > MAX_DELETED_ROW_KEYS) return `Too many deleted row keys were supplied. Maximum is ${MAX_DELETED_ROW_KEYS}.`;

    if (Array.isArray(rows)) {
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index] || {};
            const prefix = `Row ${index + 1}`;
            for (const [field, label] of [
                ['targetOutput', 'target output'],
                ['actualPerformance', 'actual performance'],
            ]) {
                const quarterly = row[field];
                if (quarterly === undefined || quarterly === null) continue;
                if (typeof quarterly !== 'object' || Array.isArray(quarterly)) return `${prefix}: ${label} must be an object.`;
                for (const quarterKey of ['q1','q2','q3','q4','total']) {
                    const error = validateNumericField(quarterly, quarterKey, `${prefix} ${label} ${quarterKey}`);
                    if (error) return error;
                }
            }
        }
    }

    if (Array.isArray(evaluationRows)) {
        let totalWeight = 0;
        for (let index = 0; index < evaluationRows.length; index += 1) {
            const row = evaluationRows[index] || {};
            const prefix = `LBAC Form 5 row ${index + 1}`;
            const rowType = cleanText(row.rowType).toUpperCase();
            if (rowType === 'MAIN' || rowType === 'GROUP') continue;

            for (const [field, label, options] of [
                ['weight', 'weight', { max: 100 }],
                ['cost', 'cost', {}],
                ['targetOutput', 'target output', {}],
                ['actualOutput', 'actual output', {}],
                ['allotmentReleased', 'allotment released', {}],
                ['obligationsIncurred', 'obligations incurred', {}],
            ]) {
                const error = validateNumericField(row, field, `${prefix} ${label}`, options);
                if (error) return error;
            }

            if (hasOwn(row, 'weight') && row.weight !== '' && row.weight !== null && row.weight !== undefined) {
                totalWeight += Number(row.weight);
            }
        }

        // Weight is a computed/evaluation field, not a submission gate. The
        // monitoring system accepts the encoder's input and calculates the totals.
    }

    return '';
};

export const MAX_VALIDATION_ROWS = MAX_ROWS;
