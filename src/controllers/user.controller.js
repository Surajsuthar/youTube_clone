import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudnary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async(req, res) => {
    //fetch from fronted
    const {fullname, email , username , password } = req.body;
    console.log("email",email);
    //validation
    if(
        [fullname,email,username,password].some( (field)=> field?.trim()==="")
    ){
        throw new ApiError(400,"all feild are requires")
    }
    //check exists or not
    const existedUser = User.findOne({
        $or : [ { username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"user with email and username exits")
    }
    //check for image.
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    //check for avatar
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
            fullname,
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

export {registerUser}