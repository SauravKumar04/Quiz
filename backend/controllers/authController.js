import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

const buildSafeUser = (user) => ({
  id: user.id || user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.status(201).json({
      token,
      user: buildSafeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (
      adminEmail &&
      adminPassword &&
      normalizedEmail === adminEmail &&
      password === adminPassword
    ) {
      const token = signToken({
        role: "admin",
        email: adminEmail,
        name: "System Admin",
      });
      const adminUser = await User.findOne({ email: adminEmail });

      return res.json({
        token,
        user: {
          id: "admin",
          name: "System Admin",
          email: adminEmail,
          role: "admin",
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password",
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = signToken({
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    res.json({
      token,
      user: buildSafeUser(user),
    });
  } catch (error) {
    next(error);
  }
};
