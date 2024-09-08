//stores data to local public/temp folder
import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    //   cb(null, file.fieldname + '-' + uniqueSuffix) //this is done to make each file unqiue 
    //by adding a unique suffix to it
      cb(null, file.originalname)
    }
  })

export const upload=multer({
    storage,
    // storage:storage,
})
 