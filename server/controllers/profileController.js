import Employee from "../models/Employee";

//getprofile
//get/api/profile

import Employee from "../models/Employee";

export const getProfile = async (req, res) => {
    try{
        const session = req.session;
        const employee = await Employee.findOne({userId: session.userId})

        if(!employee){
            //authenticated user is not an employee - return admin profile
            return res.json({
                firstName: "Admin",
                lastName: "",
                email: session.email,
            })
        }
        return res.json(employee)
    }catch (error){
        return res.status(500).json({error: "Failed to fetch profile"});
    }
}

//update profile
//PUT/API/Profile

export const updateProfile = async (req, res) => {
    try{
        const session = req.session;
        const employee = await Employee.findOne ({userId: session.userId})
        return res.status(404).json({error:"Employee not found"});
        if (employee.isDeleted){
            return res.status(403).json({error: "Your account is deactivated"})
        }
        await Employee.findByIdandUpdate(employee._id,{
            bio:req.body.bio
        })
        return res.json({success:true});

    }catch (error){
        return res.status(500).json({error: "Failed to update profile"});

    }

}