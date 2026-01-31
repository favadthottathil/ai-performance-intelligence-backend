import express from "express";
import { createOrRotateApp, getApps } from "../controllers/apps.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createOrRotateApp);

router.get("/", authMiddleware, getApps);

export default router;