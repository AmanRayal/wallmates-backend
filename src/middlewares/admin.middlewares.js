





import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";

const verifyJwt = (req, res, next) => {


  const token = req.headers.authorization?.split(" ")[1];
  

  if (!token) {
   
    return next(new ApiError(401, "Access Denied! No token provided."));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
 
    req.user = decoded;
    next();
  } catch (error) {
   
    return next(new ApiError(401, "Invalid or expired token."));
  }
};

const verifyAdmin = (req, res, next) => {
 
  if (!req.user || !req.user.isAdmin) {
    return next(new ApiError(403, "Access denied! Only admin can perform this action."));
  }
  next();
};

export { verifyAdmin, verifyJwt };
