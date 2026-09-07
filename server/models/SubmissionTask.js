import mongoose from "mongoose";

const submissionTaskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 250,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
        },

        office: {
            type: String,
            trim: true,
            default: "ALL",
            index: true,
        },

        formType: {
            type: String,
            enum: ["LBAC3", "LBAC5", "DOCUMENT", "GENERAL"],
            default: "GENERAL",
            index: true,
        },

        documentType: {
            type: String,
            trim: true,
            default: "",
        },

        reportTitle: {
            type: String,
            trim: true,
            default: "",
            maxlength: 250,
        },

        reportGroupId: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },

        year: {
            type: Number,
            required: true,
            min: 2000,
            max: 2100,
            index: true,
        },

        quarter: {
            type: String,
            enum: ["", "Q1", "Q2", "Q3", "Q4"],
            default: "",
        },

        startDate: {
            type: Date,
            required: true,
            index: true,
        },

        dueDate: {
            type: Date,
            required: true,
            index: true,
        },

        active: {
            type: Boolean,
            default: true,
            index: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

submissionTaskSchema.index({
    year: 1,
    active: 1,
    office: 1,
    dueDate: 1,
});

submissionTaskSchema.index({
    office: 1,
    year: 1,
    quarter: 1,
    formType: 1,
    startDate: 1,
    dueDate: 1,
});

export default
    mongoose.models.SubmissionTask ||
    mongoose.model(
        "SubmissionTask",
        submissionTaskSchema
    );
