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


//starting of session
app.use(session({
    secret: "our little secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// mongoose.connect("mongodb://127.0.0.1:27017/test").then(()=>{
//     console.log("mongodb connected at port 27017");
// });
mongoose.connect(`mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASS}@cluster0.uqx03df.mongodb.net/todolistDB`).then(() => {
  console.log("mongodb connected at port 27017");
});

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    postNum: Number,
    time: String
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

const defaultUser = new User({
    username: "admin",
    passport: "password",
    post: [{
        title: "adminTitle",
        content: "adminContent",
        postNum: 0
    }]
});
// defaultUser.save();

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


//////////// REGISTER & LOGIN////////////
app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                User.findOne({username: req.body.username}).then((foundUser)=> {
                    res.redirect("/post");
                })
            })
        }
    })
    
});

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
                    res.redirect("/post")
                })
            })
        }
    })
});

////////////   SPECIFIC POSTS///////

app.get("/post/:postNum", (req,res)=>{
    const requestedPostNum = req.params.postNum;
    if(req.user) {
        User.findOne({username: req.user.username}).then((foundUser)=> {
            var totalPost = foundUser.post;
        
            for(var i = 0; i<totalPost.length; i++) {
                if(totalPost[i].postNum == requestedPostNum) {
                    
                    res.render("selectPost", {post: totalPost[i]});
                    break;
                } 
            }
        })
    } else {
        res.redirect("/home");
    }   
  })

  app.get("/del/:postNum", (req, res) => {
    const requestedPostNum = req.params.postNum;
    if(req.user) {
        
        User.findOne({username: req.user.username}).then((foundUser)=> {
            var totalPost = foundUser.post;
            
            var afterDelete = [];
        
            for(var i = 0; i<totalPost.length; i++) {
                if(totalPost[i].postNum == requestedPostNum) continue;
                afterDelete.push(totalPost[i]);
            }
            User.updateOne({username: req.user.username}, {$set: {post: afterDelete}}).then(()=>{console.log("done")});
            res.redirect("/post");
        })
    } else {
        res.redirect("/home");
    }
})

app.get("/edit/:postNum", (req, res)=> {

    const requestedPostNum = req.params.postNum;
    if(req.user) {
        
        User.findOne({username: req.user.username}).then((foundUser)=> {
            var totalPost = foundUser.post;
                    
            for(var i = 0; i<totalPost.length; i++) {
                if(totalPost[i].postNum == requestedPostNum) {
                    res.render("edit", {title: totalPost[i].title, content: totalPost[i].content, postNum: requestedPostNum})
                }
            }
        })
    } else {
        res.redirect("/home");
    }
})
app.post("/edit/:postNum", (req, res) => {
    const requestedPostNum = req.params.postNum;
    const num = Math.ceil(Math.random() * 5000000000000000);
    const toPrint = `${new Date().getDate()}-${new Date().getMonth()}-${new Date().getFullYear()}: ${new Date().getHours()}:${new Date().getMinutes()}`

   
    const newPost = new Post({
        title: req.body.postTitle,
        content: req.body.postBody,
        postNum: num,
        time: toPrint
    });
    if(req.user) {        
        User.findOne({username: req.user.username}).then((foundUser)=> {
            var totalPost = foundUser.post;
            
            var afterDelete = [];
        
            for(var i = 0; i<totalPost.length; i++) {
                if(totalPost[i].postNum == requestedPostNum) continue;
                afterDelete.push(totalPost[i]);                
            }
            if(newPost.title != "" && newPost.content != "") afterDelete.push(newPost);
           
            User.updateOne({username: req.user.username}, {$set: {post: afterDelete}}).then(()=>{console.log("done")});
            res.redirect("/post");
        })
    } else {
        res.redirect("/home");
    }
})

/////////////// FOR ALL/////////////
app.post("/submit", (req, res) => {

    const num = Math.ceil(Math.random() * 5000000000000000);
    const toPrint = `${new Date().getDate()}-${new Date().getMonth()}-${new Date().getFullYear()}: ${new Date().getHours()}:${new Date().getMinutes()}`
   
    const newPost = new Post({
        title: req.body.postTitle,
        content: req.body.postBody,
        postNum: num,
        time: toPrint
    });
    if(req.user) {
        User.findOne({username: req.user.username}).then((foundUser)=> {
            var totalPost = foundUser.post;
            if(newPost.title != "" && newPost.content != "") totalPost.push(newPost);
            console.log(totalPost);
            // userId = foundUser._id;
            User.updateOne({username: req.user.username}, {$set: {post: totalPost}}).then(()=>{console.log("done")});
            // res.render("post", {userPost: totalPost});
            res.redirect("/post");
        })
    } else {
        res.redirect("/home");
    }
});
app.get("/post", (req, res) => {
    if(req.user) {
        User.findOne({username : req.user.username}).then((foundUser) => {
            // console.log(req.user.username);
            
            res.render("post", {userPost: foundUser.post});
            
        });
    } else {
        res.redirect("/home");
    }
})




app.get("/user", (req, res)=> {
    
    if(req.user) {
    User.findOne({username: req.user.username}).then((foundUser)=> {
        if(foundUser) res.send(foundUser.username);
        
    })} else {
        res.send("no user");
    }
})


/////////////////// GET///////////////
app.get("/home", (req, res) => {
    res.render("home");
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

/////////////GOOGLE AUTHENTICATION /////////////
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/post');
});


////////////////home/////////
app.get("/", (req, res)=> {
    res.redirect("/home");
});

app.listen(port, ()=>{
    console.log(`app runs at ${port}`);
})


