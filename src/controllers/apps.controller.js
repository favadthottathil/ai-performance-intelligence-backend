import { insertApp, getApp, rotateAppKey, getAppKey } from "../repositories/apps.repository.js";
import { invalidateApiKey } from "../middlewares/appAuth.middleware.js";
import { generateApiKey } from "../utils/generateApiKey.js";

/// Creates a new application and returns its freshly generated API key.
///
/// Creating an app never touches the keys of the caller's existing apps —
/// rotation is an explicit, separate action (`POST /apps/:appId/rotate-key`)
/// because it invalidates every SDK client already shipping with the old key.
export async function createApp(req, res, next) {

    const { name } = req.body;
    const userId = req.user.userId;

    if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ error: "App name is required" });
    }

    try {
        const result = await insertApp(userId, name.trim(), generateApiKey());

        return res.status(201).json(result);
    } catch (error) {
        return next(error);
    }
}

/// Issues a new API key for one app, invalidating the previous one.
export async function rotateApiKey(req, res, next) {

    const { appId } = req.params;
    const userId = req.user.userId;

    try {
        // Captured before the update so the superseded key can be evicted
        // from the ingestion cache, which would otherwise keep accepting it
        // for up to its full TTL.
        const previousKey = await getAppKey(appId, userId);

        const result = await rotateAppKey(appId, userId, generateApiKey());

        // No row means the app does not exist or is not owned by this user.
        // Both are reported identically so app ids cannot be probed.
        if (!result) {
            return res.status(404).json({ error: "App not found" });
        }

        invalidateApiKey(previousKey);

        return res.status(200).json({
            ...result,
            message: "API key rotated. Old key invalidated.",
        });
    } catch (error) {
        return next(error);
    }
}

export async function getApps(req, res, next) {

    const userId = req.user.userId;

    try {
        // An empty list is a valid state for a new account, not an error.
        return res.status(200).json(await getApp(userId));
    } catch (error) {
        return next(error);
    }
}
