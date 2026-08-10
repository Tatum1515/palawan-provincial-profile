import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

//Login for employee and admin
//Post /api/auth/login

export const login = async (req, res) => {
    try{
        const {email, password, role_type} = req.body;

        if(!email || !password){
            return res.status(400).json({error:"Missing required fields"});
        }

        const user = await User.findOne({email});
        if(!user){
            return res.status(401).json({error:"Invalid credentials"});
        }

        if(role_type === "admin" && user.role !== "ADMIN"){
            return res.status(401).json({error:"Not authorized as admin"});
        }

        if (role_type === "employee" && user.role !== "EMPLOYEE"){
            return res.status(401).json({error:"Not authorized as employee"});
        }

        const isValid = await bcrypt.compare(password, user.password)
        if(!isValid){
            return res.status(401).json({error:"Invalid credentials"});
        }

        const payload={
            id: user._id.toString(),
            email: user.email,
            role: user.role
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "7d"});

        return res.status(200).json({user: payload, token});
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({error:"Failed to login"})
    }
}

//get session for employee and admin
//Get /api/auth/session
export const getSession = async (req, res) => {
    const session = req.session;
    return res.json({session});
}

//change password for employee and admin
//Post /api/auth/change-password
export const changePassword = async (req, res) => {
    try{
        const session = req.session;
        const {currentPassword, newPassword} = req.body;
        if(!currentPassword || !newPassword){
            return res.status(400).json({error:"Missing required fields"});
        }
        const user = await User.findById(session.user.id)
        if(!user)
        return res.status(404).json({error:"User not found"});
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if(!isValid)
        return res.status(400).json({error:"Invalid current password"});
        const hashed = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(session.user.id, {password: hashed});
        return res.json({success:true});

    }catch(error){
        return res.status(500).json({error:"Failed to change password"});
    }
}