import mongoose ,{Schema} from "mongoose";

const likes = new Schema({
    content :{
        type:String,
        require:true
    },
    discripation :{
        type:String,
        require:true
    },
    comment :{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Comment"
    },
    likedBy :{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true}
)

export const Likes = mongoose.model("likes",likes);