import express from "express";
import { createApp } from "../controllers/apps.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createApp);

export default router;