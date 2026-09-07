import { Router } from "express";

import {
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
} from "../controllers/employeeController.js";

import {
    protect,
    protectMainAdmin,
} from "../middleware/auth.js";

const employeesRouter =
    Router();

/*
 * USER MANAGEMENT
 *
 * Only the Main Administrator
 * can access these APIs.
 */

/*
 * Get users
 */
employeesRouter.get(
    "/",
    protect,
    protectMainAdmin,
    getEmployees
);

/*
 * Create user
 */
employeesRouter.post(
    "/",
    protect,
    protectMainAdmin,
    createEmployee
);

/*
 * Update user
 */
employeesRouter.put(
    "/:id",
    protect,
    protectMainAdmin,
    updateEmployee
);

/*
 * Delete user
 */
employeesRouter.delete(
    "/:id",
    protect,
    protectMainAdmin,
    deleteEmployee
);

export default employeesRouter;