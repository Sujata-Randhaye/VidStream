import mongoose ,{Schema} from "mongoose";

const subscriptionShcema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,  //one who is subscribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,  //one to whom subscriber is subscribing
        ref:"User"
    },
},{timestamps:true})

subscriptionShcema.save()
export const Subscription= mongoose.model("Subscription",subscriptionShcema);