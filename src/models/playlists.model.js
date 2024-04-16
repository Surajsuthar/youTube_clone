import mongoose ,{Schema} from "mongoose";

const playlists = new Schema({
    name :{
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
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true}
)

export const Playlist = mongoose.model("Plalist",playlists);