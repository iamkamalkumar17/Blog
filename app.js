require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
const port = 3000;
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));


var userId = 0;

//starting of session
app.use(session({
    secret: "our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1:27017/test").then(()=>{
    console.log("mongodb connected at port 27017");
});

const postSchema = new mongoose.Schema({
    title: String,
    content: String
});
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    post: [postSchema]
});
//we need to plugin to schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// const newUser = new User({
//     username: "kamal kumar",
//     password: "password",
//     post: [{
//         title: "title 1",
//         content: "content 1"
//     }, {
//         title: "title 2",
//         content: "content 2"
//     }]
// });
// newUser.post.push({
//     title: "title 5",
//     content: "content 5"
// })

// newUser.save();
// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
passport.deserializeUser(function(user, cb) {
process.nextTick(function() {
    return cb(null, user);
});
})

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const Post = mongoose.model("Post", postSchema);
// const newPost = new Post({
//     title: "title 3",
//     content: "content 3"
// });
const noContent = new Post({
    title: "no content",
    content: "nothing to show sorry"
});
var nothing = [noContent];
User.findOne({username: "kamal kumar"}).then((foundUser)=> {
    // totalPost = foundUser.post;
    // totalPost.push(newPost);
    // console.log(totalPost);
    userId = foundUser._id;
    // User.updateOne({username: "kamal kumar"}, {$set: {post: totalPost}}).then(()=>{console.log("done")});
})
app.get("/kamal", (req, res) => {
    User.findOne({_id: userId}).then((foundUser) => {
        
        res.render("post", {userPost: foundUser.post});
        
    })
})
////////////register////////////
app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                // res.redirect("/secrets");
                User.findOne({username: req.body.username}).then((foundUser)=> {
                    res.send(foundUser.post);
                })
            })
        }
    })
    
});
//////////////login route/////////

app.post("/login", (req,res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                User.findOne({username: req.body.username}).then((foundUser)=> {
                    
                    // userId = foundUser._id;
                    // res.send(userId);
                    res.redirect("/post")
                })
            })
        }
    })
})
app.post("/submit", (req, res) => {
   
    const newPost = new Post({
        title: req.body.postTitle,
        content: req.body.postBody
    });
    if(req.user) {
        User.findOne({username: req.user.username}).then((foundUser)=> {
            var totalPost = foundUser.post;
            totalPost.push(newPost);
            console.log(totalPost);
            // userId = foundUser._id;
            User.updateOne({username: req.user.username}, {$set: {post: totalPost}}).then(()=>{console.log("done")});
            // res.render("post", {userPost: totalPost});
            res.redirect("/post");
        })
    } else {
        res.send("no user");
    }
});
app.get("/post", (req, res) => {
    if(req.user) {
        User.findOne({username : req.user.username}).then((foundUser) => {
            // console.log(req.user.username);
            
            res.render("post", {userPost: foundUser.post});
            
        });
    } else {
        res.redirect("/login")
        // res.send("no user");
    }
})



//////////////LOGIN//////////////
app.get("/user", (req, res)=> {
    // res.send(req.user.id);
    
    if(req.user) {
    User.findOne({username: req.user.username}).then((foundUser)=> {
        if(foundUser) res.send(foundUser.username);
        
    })} else {
        res.send("no user");
    }
})

app.get("/login", (req, res)=> {
    res.render("login");
});
app.get("/register", (req, res) => {
    res.render("register");
});
app.get("/compose", (req, res)=> {
    // res.render("compose");
    if(req.isAuthenticated()) {
        res.render("compose");
    } else {
        res.redirect("/login");
    }
});
app.get('/logout', function(req, res, next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });
////////////////home/////////
app.get("/", (req, res)=> {
    res.render("home")
});

app.listen(port, ()=>{
    console.log(`app runs at ${port}`);
})