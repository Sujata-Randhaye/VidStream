const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// asyncHandler helps you avoid the need to manually add try/catch 
// blocks in every asynchronous route handler. It simplifies error 
// handling in your Express routes by automatically catching any
//  unhandled promise rejections and passing them to the next middleware 
// (typically an error handler).

// const asyncHandler=(fn)=>async(req,res,next)=>{
//     try{
//         await fn(req,res,next)
//     }
//     catch{
//         res.status(err.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }
// }
