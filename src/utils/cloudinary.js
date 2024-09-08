import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

    // Configuration
cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const uploadOnClodinary=async (localFilePath)=>{
    try{
        if(!localFilePath)return null
        //upload file
        const response=await cloudinary.uploader.upload(
            localFilePath,
        {
            resource_type:"auto"   //type of file
        })
        //file has been uploaded successfully
        // console.log("File is uploaded on cloudinary",
        //     response.url
        // );
        fs.unlinkSync(localFilePath)  
        return response
    }
    catch(error)
    {
        fs.unlinkSync(localFilePath)//remove the locally saved temporary
        // file as the upload operation got failed
        return null;
    }
}


export {uploadOnClodinary}

