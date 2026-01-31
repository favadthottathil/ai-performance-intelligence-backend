import { insertApp, getApp, checkAppExists, rotateAppKey } from "../repositories/apps.repository.js";
import { generateApiKey } from "../utils/generateApiKey.js";

export async function createOrRotateApp(req, res) {

    const { name } = req.body;

    const user_id = req.user.userId;

    try {

        const appExists = await checkAppExists(user_id);

        const apiKey = generateApiKey();

        console.log('appExists');

        // 2️⃣ If app exists → ROTATE KEY
        if (appExists.rows.length > 0) {
            const appId = appExists.rows[0].id;

            const result = await rotateAppKey(appId, apiKey, name);

            console.log('appExists222222222222222222222');

            return res.status(200).json({
                id: result.id,
                name: result.name,
                api_key: result.api_key,
                message: "API key rotated. Old key invalidated.",
            });
        }

        console.log('appExists');

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "App name is required" });
        }

        const result = await insertApp(user_id, name, apiKey);

        res.status(201).json(result);

    } catch (error) {

        res.status(500).json({ error: error.message });

    }



}

export async function getApps(req, res) {

    const user_id = req.user.userId;

    try {

        const result = await getApp(user_id);

        if (result.length === 0) {
            return res.status(404).json({ error: "No apps found" });
        }

        res.status(200).json(result);

    } catch (error) {

        res.status(500).json({ error: error.message });

    }



}


