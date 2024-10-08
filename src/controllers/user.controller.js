import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


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
    // console.log(req.files.avatar)
    // console.log(req.files.coverImage)

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
                // refreshToken: undefined,
                refreshToken:1  //this removes the
                // field from document
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
        const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshAccessToken  //for mobile app we use req.body
    
        if(!incomingRefreshToken){
            throw new ApiError(401,"Unauthorized request")
        }
    try{
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

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    console.log(req.user)

    const user=await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if isPasswordCorrect method exists
    if (typeof user.isPasswordCorrect !== 'function') {
        throw new ApiError(500, "isPasswordCorrect method is missing on user model");
    }
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    console.log(user)
    console.log(isPasswordCorrect)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old Password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed successfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body

    if(!fullname || !email)
    {
        throw new ApiError(400,"All fields are required")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname:fullname,
                email:email,
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar=await uploadOnClodinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated successfully")
    )
})

const updateUserCoverimage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"CoverImage file is missing")
    }

    const coverImage=await uploadOnClodinary(coverImageLocalPath)

    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while uploading on coverImage")
    }

    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            coverImage:coverImage.url
        },
        {new :true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"CoverImage updated successfully")
    )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    // console.log(req.params)
    const {username}=req.params

    if(!username?.trim())
    {
        throw new ApiError(400,"Username is missing")
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }

        },
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    if(!channel)
        {
            throw new ApiError(404,"channel does not exists")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,"User channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
                //as we get string with req.user._id hence to convert it
                // to mongoDb object id we use this format
            }
        },
        {
            $lookup:{   //we are in users adding videos to watchHistory
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[  //here we are in videos adding user details who is owner of video
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[  //To reduce fields in owner field
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                },
                                {
                                    $addFields:{
                                        owner:{
                                            $first:"$owner"
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{  //adding new field as qwner instead of array in videos model
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch History fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverimage,
    getUserChannelProfile,
    getWatchHistory
};

