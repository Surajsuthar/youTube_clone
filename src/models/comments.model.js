import mongoose ,{Schema} from "mongoose";

const comments = new Schema({
    content :{
        type:String,
        require:true
    },
    discripation :{
        type:String,
        require:true
    },
    videos:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video"
    },
    owner :{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true}
)

export const Comments = mongoose.model("comments",comments);