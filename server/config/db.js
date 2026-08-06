import mongoose from "mongoose";
import { setServers } from "dns";

const connectDB = async () => {
  try {
    setServers(["8.8.8.8", "8.8.4.4"]);

    mongoose.connection.on("connected", () => console.log("Database connected"));
    mongoose.connection.on("error", (err) => console.error("Mongoose connection error:", err));

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

export default connectDB;