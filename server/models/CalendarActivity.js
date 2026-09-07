import mongoose from "mongoose";

const calendarActivitySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },
        startAt: {
            type: Date,
            required: true,
            index: true,
        },
        endAt: {
            type: Date,
            required: true,
            index: true,
        },
        allDay: {
            type: Boolean,
            default: false,
        },
        category: {
            type: String,
            enum: [
                "MEETING",
                "DEADLINE",
                "TRAINING",
                "OFFICIAL_ACTIVITY",
                "HOLIDAY",
                "OTHER",
            ],
            default: "OTHER",
            index: true,
        },
        location: {
            type: String,
            trim: true,
            default: "",
            maxlength: 250,
        },
        visibility: {
            type: String,
            enum: ["ALL_USERS"],
            default: "ALL_USERS",
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

calendarActivitySchema.index({ startAt: 1, endAt: 1 });

calendarActivitySchema.index({
    visibility: 1,
    startAt: 1,
});

const CalendarActivity =
    mongoose.models.CalendarActivity ||
    mongoose.model("CalendarActivity", calendarActivitySchema);

export default CalendarActivity;
