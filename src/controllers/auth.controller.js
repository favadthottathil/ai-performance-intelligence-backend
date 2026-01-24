import { registerUser, loginUser } from "../services/auth.service.js";

export async function register(req, res) {

    try {

        const { email, password } = req.body;

        const token = await registerUser(email, password);

        res.status(201).json({
            token: token
        });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;
        const token = await loginUser(email, password);
        res.status(201).json({ token: token });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}