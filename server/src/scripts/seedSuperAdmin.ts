import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import UserModel from "../app/modules/user/user.model";

//Load environment variables
dotenv.config();

//Use DATABASE_URL from .env
const MONGO_URI = process.env.DATABASE_URL;

/* ============================= */
/*    SUPER ADMIN CREDENTIALS    */
/* ============================= */
//Change these values to create your own Super Admin
const SUPER_ADMIN_DATA = {
  name: "Super Admin",
  email: "superadmin@gmail.com",
  password: "admin123",
  phone: "7632867948",
};

const createSuperAdmin = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("DATABASE_URL not found in .env file");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully!");

    // Check if super admin already exists
    const existing = await UserModel.findOne({ role: "SUPER_ADMIN" });
    if (existing) {
      console.log("\nSuper Admin already exists!");
      console.log("Email:", existing.email);
      console.log("\nIf you want to create a new one, delete the existing Super Admin first.");
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_DATA.password, 10);

    // Create super admin
    const superAdmin = new UserModel({
      name: SUPER_ADMIN_DATA.name,
      email: SUPER_ADMIN_DATA.email.toLowerCase(),
      password: hashedPassword,
      phone: SUPER_ADMIN_DATA.phone,
      role: "SUPER_ADMIN",
      isActive: true,
      isDeleted: false,
      permissions: ["ALL"],
    });

    await superAdmin.save();

    console.log("\n================================");
    console.log("   SUPER ADMIN CREATED SUCCESSFULLY!");
    console.log("================================\n");
    console.log("Email:    ", SUPER_ADMIN_DATA.email);
    console.log("Password: ", SUPER_ADMIN_DATA.password);
    console.log("Name:     ", SUPER_ADMIN_DATA.name);
    console.log("\nPlease change the password after first login!");
    console.log("================================\n");

    process.exit(0);
  } catch (err: any) {
    console.error("\nError creating Super Admin:", err.message);
    process.exit(1);
  }
};

createSuperAdmin();
