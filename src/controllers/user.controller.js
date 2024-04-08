import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudnary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import pkg from "jsonwebtoken";
import { use } from "bcrypt/promises.js"
const jwt = pkg;

const generateAccessAndRefereshTokens = async(userId) => {
    
    try{
        const user = await User.findById(userId)
        console.log("user:",user);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
       
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false})

        return {
            accessToken,
            refreshToken
        }

    } catch (error){
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler( async(req, res) => {
    //fetch from fronted
    const {fullName, email , username , password } = req.body;
    console.log("email",email);
    //validation
    if(
        [fullName,email,username,password].some( (field)=> field?.trim()==="")
    ){
        throw new ApiError(400,"all feild are requires")
    }
    //check exists or not
    const existedUser = await User.findOne({
        $or : [ { username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"user with email and username exits")
    }
    //check for image.
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //check for avatar
    let coverImageLocalPath;
    if( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }
    //upload on clodinary avatr
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }
    // create user object -create in db

    const user = await User.create(
        {
            fullName,
            avatar:avatar.url,
            coverImage:coverImage?.url || "",
            email,
            password,
            username:username.toLowerCase()
        }
    )

    // remove password and refrese token from response
     //check for user creatiom
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "something went wrong while register user")
    }
   
    //return res
    return res.status(200).json(
        new ApiResponse(200 , createdUser, "user register successfully")
    )
})

const loginUser = asyncHandler( async(req,res) => {
    //get data
    const {email, username, password } = req.body
    //username & email
    if(!(username || email)) {
        throw new ApiError(400,"username or email required")
    }
    //find the user
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    console.log("user",username);

    if(!user){
        throw new ApiError(404,"user doesn't exit")
    }

    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"password incorrect")
    }
    //access & refresh token
    const {accessToken , refreshToken} = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken" 
    )

    //send cookie
    const options = {
        httpOnly:true,
        secure : true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler( async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken : undefined
            }
        }
    )

    const options = {
        httpOnly:true,
        secure : true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler( async(req,res) => {
    const inComingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!inComingRefreshToken){
        throw new ApiError(401,"unauthorized requset")
    }

    try {
        const decodedToken = jwt.verify(
            inComingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        
        const user = await User.findById(decodedToken._id)
        if(!user){
            throw new ApiError(401,"invalid reftresh token")
        }
    
        if(inComingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh access token expried")
        }
    
        const options = {
            httpOnly:true,
            secure: true
        }
        
        const {accessToken,newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    { 
                        accessToken, 
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler( async(req,res) => {
    const {oldPassword , newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})
})

const getCurrentUser = asyncHandler( async(req,res) => {
    return res
    .status(200)
    .json(200, req.user,"current user fetched succcessfully")
})

const updateAccountDetails = asyncHandler( async(req,res) => {
    const {fullName , email } = req.body
    if(!(fullName || email)){
        throw new ApiError(401,"all field required")
    }
    const user =User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAavtar = asyncHandler( async(req ,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Avatar file uploading on cloud")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            avatar:avatar.url
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler( async(req,res) => {
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(401,"user not found")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username :username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            },
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields :{
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
            }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])
    
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
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
    updateUserAavtar,
    updateUserCoverImage,
    getUserChannelProfile
}