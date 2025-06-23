import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN.split(','),
    credentials: true
}));

// Middlewares
app.use(express.json({limit: "12kb"}));
app.use(express.urlencoded({extended: true , limit: "12kb"}));
app.use(express.static("public"));
app.use(cookieParser());


// Routes import

import userRouter from "./routes/user.route.js";
import wallpaperRouter from "./routes/wallpaper.route.js";
import adminRoutes  from "./routes/admin.routes.js";

// Routes declaration

app.use("/api/v1/users", userRouter);
app.use("/api/v1/wallpapers", wallpaperRouter);
app.use("/api/v1/admin", adminRoutes);





export default app;
