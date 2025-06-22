import mongoose from "mongoose";
import { MONGO_DB_NAME } from "../constants.js";



const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.MONGO_URI}${MONGO_DB_NAME}} `
        )
    } catch (error) {
  
        process.exit(1);
        
    }
}

export default connectDB;






