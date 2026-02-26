import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../app/modules/user/user.model";

dotenv.config();

const MONGO_URI = process.env.DATABASE_URL;

/* ============================= */
/*    NEW SUPER ADMIN DATA       */
/* ============================= */
const SUPER_ADMIN_DATA = {
  name: "Super Admin",
  email: "superadmin@gmail.com",
  password: "admin1",  // Plain password - Model will hash it automatically
  phone: "7632867948",
};

const resetSuperAdmin = async () => {
  try {
    if (!MONGO_URI) {
      throw new Error("DATABASE_URL not found in .env file");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully!\n");

    // Delete ALL existing super admins
    const deleted = await UserModel.deleteMany({ role: "SUPER_ADMIN" });
    console.log(`Deleted ${deleted.deletedCount} existing Super Admin(s)`);

    // Create new super admin - Password will be hashed by model's pre-save hook
    const superAdmin = new UserModel({
      name: SUPER_ADMIN_DATA.name,
      email: SUPER_ADMIN_DATA.email.toLowerCase(),
      password: SUPER_ADMIN_DATA.password,  // Plain password - NOT hashed here
      phone: SUPER_ADMIN_DATA.phone,
      role: "SUPER_ADMIN",
      isActive: true,
      isDeleted: false,
      permissions: ["ALL"],
    });

    await superAdmin.save();

    console.log("\n================================");
    console.log("   SUPER ADMIN RESET SUCCESSFUL!");
    console.log("================================\n");
    console.log("Email:    ", SUPER_ADMIN_DATA.email);
    console.log("Password: ", SUPER_ADMIN_DATA.password);
    console.log("Name:     ", SUPER_ADMIN_DATA.name);
    console.log("\n================================\n");

    process.exit(0);
  } catch (err: any) {
    console.error("\nError:", err.message);
    process.exit(1);
  }
};

resetSuperAdmin();
