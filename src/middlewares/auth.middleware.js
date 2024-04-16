import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import  pkg  from "jsonwebtoken"
const { jwt } = pkg;
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler( async(req,res,next) => {
    try {
        const token = req.cookie?.accessToken || req.header("Authorization")?.replace("bearer ", "")
    
        if(!token){
            throw new ApiError(401,"unauthorized request")
        }
    
        const decodedToken = jwt.verity(token,process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401,"invalid access token")
        }
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token")
    }
})