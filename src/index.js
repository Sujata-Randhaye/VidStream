import dotenv from "dotenv"
import {app} from './app.js';
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env',
})
connectDB()
.then(
    app.listen(()=>{
        console.log(`Server is running on port: ${process.env.PORT}`)
    }),
    app.on("error",(err)=>{   //throwing error
        console.log("Error:",err)
    })
)
.catch((err)=>{
    console.log("Mongo db connection failed !!!",err);
})

/*

//Using IFEE

import dotenv from "dotenv"
import mongoose from 'mongoose'
import {DB_NAME} from './constants.js'

dotenv.config({
    path:'./env'
});
(async()=>{
    try{
                const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
                console.log(`\n MongoDB connected !! DB HOST:${connectionInstance.connection.host}`)
            }
            catch(error){
                console.log("MONGODB connection error",error)
                process.exit(1);
            }
})()
*/