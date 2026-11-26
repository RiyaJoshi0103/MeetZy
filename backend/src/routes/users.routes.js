import { Router } from "express";
import { addToHistory, createMeeting, getIceServers, getUserHistory, login, register } from "../controllers/user.controller.js";



const router = Router();

router.route("/login").post(login)
router.route("/register").post(register)
router.route("/add_to_activity").post(addToHistory)
router.route("/get_all_activity").get(getUserHistory)
router.route("/create_meeting").post(createMeeting)
router.route("/get_ice_servers").get(getIceServers)

export default router;