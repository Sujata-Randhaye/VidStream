import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser=asyncHandler(async (req,res)=>{
    //get user details from frontend except watchhistory and refreshtoken
    //validation - not empty
    //check if user already exists
    //check for images and avatar
    //upload them to cloudinary
    //create user object -create entry in db
    //remove password and refresh token fiend from response
    //check from user creation
    //return response

    //data can come in JSON so it is stored in req or it may come from URL
    const {fullname,email,username,password}=req.body
    console.log("email:",email)
    console.log("fullname:",fullname)
    console.log("username:",username)
    console.log("password:",password)

    // if(fullname===""){
    //     throw new ApiError(400,"Fullname is required")
    // }  for each value we can use if else

    //way2
    if(
        [fullname,email,username,password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }
    // we can make separate file for validations
    const existedUser=User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser)
    {
        throw new ApiError(409,"User with email or username already exists")
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files.coverImage[0]?.path;

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar=await uploadOnClodinary(avatarLocalPath)
    const coverImage=await uploadOnClodinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(400,"Avatar file is required")
    }
    //User is talking with db
    const user= await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" 
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
});
export {registerUser};