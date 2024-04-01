import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async(req,res) =>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.DATABASE_URL}/${DB_NAME}`)
        console.log(`db connect ! db host ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("db connection error")
        process.exit(1)
    }
}

export default connectDb;