import express from "express";
import { createApp, getApps, rotateApiKey } from "../controllers/apps.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createApp);

router.get("/", authMiddleware, getApps);

router.post("/:appId/rotate-key", authMiddleware, rotateApiKey);

export default router;
