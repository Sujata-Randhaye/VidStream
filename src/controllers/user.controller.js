import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId);
        const refreshToken=user.generateRefreshToken();
        const accessToken=user.generateAccessToken();

        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}

    }catch(err)
    {
        throw new ApiError(500,"Something went wrong while generating refresh and access token!!")
    }
}
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
    // console.log(req.body)
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
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser)
    {
        throw new ApiError(409,"User with email or username already exists")
    }
    // console.log("Yesss",req.files.avatar[0])
    const avatarLocalPath=req.files?.avatar[0]?.path;
    //way 1 this way stores undefined if coverImage is not sent hence throws error
    // const coverImageLocalPath=req.files.coverImage[0]?.path;

    //way2
    let coverImageLocalPath;
    console.log(req.files.avatar)
    console.log(req.files.coverImage)

        if(req.files && Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length>0)
        {
            coverImageLocalPath=req.files.coverImage[0].path;
        }
    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    //Uploading to Cloudinary
    const avatar=await uploadOnClodinary(avatarLocalPath)
    const coverImage=await uploadOnClodinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(400,"Avatar file is required")
    }
    //User is talking with db/passing values to user schema 
    const user= await User.create({   //document is saved here
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })

    //removing password and refreshtoken from mongodb
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

const loginUser=asyncHandler(async(req,res)=>{
    //req body -> data
    //username or email
    //find the user
    //password check
    //access and refresh token generate
    //send cookie with these token

    const {email,username,password}=req.body

    if(!username && !email){   //if(!username && email)
        throw new ApiError(400,"username or password is required")
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })

    if(!user)
    {
        throw new ApiError(404,"User does not exists")
    }
    
    // method that we define are attached with our instance
    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }
    //user do not have accesstoken and refreshtoken
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);

    const loggedInUser=await User.findById(user._id).
    select("-password -refreshToken")

    const options={
        httpOnly:true,  //can be only modified by server not by frontend
        secure:true
    }
    
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,        //status 
            {       //data
                user: loggedInUser,accessToken,
                refreshToken
            },
            "User logged in Successfully"  //msg
        )
    )
})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            //mongodb operator
            $unset: {
                refreshToken: undefined,
            }
        },
        {
            new:true
        }
    )

    const options={
        httpOnly:true,  //can be only modified by server not by frontend
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out Successfully!!"))
})

const refreshAccessToken= asyncHandler(async(req,res)=>{
    try {
        const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshAccessToken
    
        if(!incomingRefreshToken){
            throw new ApiError(401,"Unauthorized request")
        }
    
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefeshToken}=await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefeshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefeshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || 
            "Invalid refresh token"
        )
    }
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};

