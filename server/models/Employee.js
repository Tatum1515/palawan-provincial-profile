import mongoose, { Mongoose } from "mongoose";
import { DEPARTMENTS } from "../constants/departments.js";

const employeeSchema = new mongoose.Schema({
    userID: {type: mongoose.Schema.Types.ObjectId, ref: 'User', 
            required: true, unique: true},
    firstName: {type: String, required: true },
    lastName: {type: String, required: true },
    email: {type: String, required: true},
    phone: {type: String, required: true },
    position: {type: String, required: true },
    employmentStatus: {type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    joinDate: {type: Date, required: true },
    isDeleted: {type: Boolean, default: false },
    department: {type: String, enum: DEPARTMENTS },
},{timestamps: true})

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);

export default Employee;