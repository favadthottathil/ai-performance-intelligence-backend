import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "../repositories/user.repository.js";

const SALT_ROUNDS = 10;


export async function registerUser(email, password) {


    const user = await findUserByEmail(email);

    if (user) throw new Error("user already exists");

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    return createUser(email, password_hash);
}

export async function loginUser(email, password) {

    const user = await findUserByEmail(email);

    if (!user) throw new Error("invalid email or password");

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) throw new Error("invalid email or password");

    return jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    )
}
