if (process.env.NODE_ENV != "production") {
    require('dotenv').config(); // Load environment variables in development
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const engine = require('ejs-mate');
const ExError = require("./utils/ExError.js");
const listingRouter = require('./routes/listing.js');
const reviewRouter = require('./routes/review.js');
const userRouter = require('./routes/user.js');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');

// const Mongo_url = "mongodb://127.0.0.1:27017/Airbnb";
const dbUrl = process.env.ATLAS_DB;

main()
    .then(() => {
        console.log('Successfully Connected Mongoose');
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");                              // Set view engine to EJS
app.set("views", path.join(__dirname, "/views"));           // Set views directory
app.use(express.urlencoded({ extended: true }));            // urlencoded middleware
app.use(methodOverride('_method'));                         // method-override middleware
app.use(express.static(path.join(__dirname, "/public")));   // Serve static files
app.engine('ejs', engine);                                  // Use ejs-mate engine

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET, 
    },
    touchAfter: 24 * 3600, // Delay session update unless modified (in seconds)
});

store.on("error", () => {
    console.log("Error in MONGODB SESSION", err);
});

// Session MiddleWare Define ↓
const sessionOption = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,   // Expire in 7 days
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,                                 // Prevent client-side JS access
    },
};

// Root Route ↓
// app.get("/", (req, res) => {
//     res.send("Hi, I Am Root 🙏");
// });

// Session, Connect-flash Middlewere ↓
app.use(session(sessionOption));
app.use(flash());

// Passport Middleware ↓
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Connect-flash Define Middlewere ↓
app.use((req, res, next) => {
    res.locals.errorMsg = req.flash("error");
    res.locals.successMsg = req.flash("success");
    res.locals.currentUser = req.user;
    next();
});

// Demo Register
// app.get("/demouser", async(req, res) => {
//     let fuser = new User({
//         email: "Reshma@gmail.com",
//         username: "Reshma@123"
//     });
//     let regUser = await User.register(fuser, "helloworld");
//     res.send(regUser);
// });

// Router Middle Ware ↓
app.use("/listings", listingRouter);
app.use("/listings", reviewRouter);
app.use("/", userRouter);

// Random Page Error Handling Middle Ware ↓
app.all("*", (req, res, next) => {
    next(new ExError(404, "Page Not Found !!!"));
});

// Wrong Data Insert Error Handling Middle Ware ↓
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something Went Wrong..." } = err;
    res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
    console.log("listning port 8080");
});
