// #######################
// #                     #
// #   REQUIRING STUFF   #
// #                     #
// #######################
// TODO: pridat | medzi datum a autora v SHOW
// TODO: dat EDIT a DELETE tlacitka v SHOW vedla seba
var express          = require("express"),
    methodOverride   = require('method-override'),
    expressSanitizer = require("express-sanitizer"),
    mongoose         = require("mongoose"),
    bodyParser       = require("body-parser"),
    flash            = require('connect-flash'),
    cookieParser     = require('cookie-parser'),
    path             = require('path'),
    favicon          = require('serve-favicon'),
    passport         = require('passport'),
    LocalStrategy    = require('passport-local'),
    passportLocalMongoose = require("passport-local-mongoose"),
    User             = require("./models/user"),
    app              = express();

// #####################
// #                   #
// #  THE APP CONFIG   #
// #                   #
// #####################

// connect to mongoDb
mongoose.Promise = global.Promise;
var url = process.env.DATABASEURL || "mongodb://localhost/restful_blog_app";
mongoose.connect(url);

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(expressSanitizer());

app.use(require("express-session")({
    secret: "Ja som Bratislava, chlapci ruky hore!",
    resave: false,
    saveUninitialized: false,
    // cookie: { maxAge: 60000 }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser('keyboard cat'));
app.use(flash());

// override method in html form with ?_method =..
app.use(methodOverride('_method'));

// use public dir with css, img and js..
app.use(express.static("public"));

// use pug and tell app to look in views for pug files
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "pug");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname,'public','favicon.ico')));

app.use(function(req, res, next){
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// ####################
// #                  #
// #  THE DB CONFIG   #
// #                  #
// ####################

// mongoose model config
var blogSchema = new mongoose.Schema({
  title: String,
  body: String,
  author: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String
  },
  date: {type: Date, default: Date.now}
});
// saving the mongoose model into var
var Blog = mongoose.model("Blog", blogSchema);

//TEST CREATE

// Blog.create({
//   title: "First Blog!",
//   body: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
// });

// #################################
// #                               #
// #   THE AUTHENTICATION CONFIG   #
// #                               #
// #################################

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ##########################
// #                        #
// #   THE ACTUAL ROUTES    #
// #                        #
// ##########################

// the index route
app.get("/", function(req, res){
   res.redirect("/blogs");
});
// the main /blogs route
app.get("/blogs", function(req, res){
  Blog.find({}, function(err, blogs){
    if(err){
      console.log(err);
      // res.redirect("back");
    }
    else {
      if(req.user !== undefined){
         res.locals.currentUser = req.user.username;
       };
      res.render("index", {blogs: blogs});
      }
  });
});

//////////////////////
//   BLOGS ROUTES   //
//////////////////////

// **********
// EDIT BLOGS
// **********

// the edit route and passing the blog to be edited
app.get("/blogs/:id/edit", isLoggedIn,isBlogAuthor,function(req, res){
  Blog.findById(req.params.id, function(err, foundBlog){
    if(err){
      req.flash("error", "This blog doesnt exist!");
      res.redirect("back");
    } else {
      if(req.user !== undefined){
         res.locals.currentUser = req.user.username;
       };
      res.render("edit", {blog: foundBlog});
    }
  });
});

app.put("/blogs/:id", isLoggedIn, isBlogAuthor ,function(req, res){
  var result = JSON.parse(JSON.stringify(req.body));

  result.blog.body = req.sanitize(result.blog.body);

  Blog.findByIdAndUpdate(req.params.id, result.blog, function(err, updatedBlog) {
    if(err){
      req.flash("error", "Unable to edit blog: No such blog with this id!");
      res.redirect("back");
    } else {
      req.flash("success", "Successfuly updated Blog!");
      res.redirect("/blogs/" + req.params.id);
    }
  });
});

// ************
// CREATE BLOGS
// ************

app.get("/blogs/new", isLoggedIn ,function(req, res){
  if(req.user !== undefined){
     res.locals.currentUser = req.user.username;
   };
  res.render("new");
});

app.post("/blogs", isLoggedIn ,function(req,res){
  var body = req.sanitize(req.body.blog.body);
  var title = req.sanitize(req.body.blog.title);
  var author = {
    id: req.user._id,
    username: req.user.username
  };
  var neuBlog = {title: title, body: body, author: author};
  Blog.create(neuBlog, function(err, newBlog){
    if(err){
      req.flash("error", "Something went wrong while creating the blog. Please try again.");
      res.redirect("/blogs/new");
    } else {
      req.flash("success", "Successfuly created a new Blog!");
      res.redirect("/blogs");
    }
  });
});

// ************
// DELETE BLOGS
// ************

app.delete("/blogs/:id", isLoggedIn, isBlogAuthor ,function(req, res){
  Blog.findByIdAndRemove(req.params.id, function(err){
    if(err){
      req.flash("error", "Something went wrong while deleting the blog. Please try again.");
      res.redirect("back");
    } else {
      req.flash("success", "Successfuly deleted Blog!");
      res.redirect("/blogs");
    }
  });
});

/////////////////////
//   AUTH ROUTES   //
/////////////////////

// *************
// REGISTER USER
// *************

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  var newUser = new User({username: req.body.username});

  User.register(newUser, req.body.password, function(err, user){
    if(err){
      req.flash("error", err.message);
      res.redirect("register");
    }
    passport.authenticate("local")(req, res, function(){
      req.flash("success", "Welcome to NodeBlog" + req.user.username);
      res.redirect("/blogs");
    });
  });
});

// **********
// LOGIN USER
// **********

app.get("/login", function(req, res){
  if(req.user !== undefined){
     res.locals.currentUser = req.user.username;
   };
  res.render("login");
  console.log(req.user);
});

app.post("/login", passport.authenticate("local",
{
    successRedirect: "/blogs",
    failureRedirect: "/login",

  }), function(req, res){
});

// ***********
// LOGOUT USER
// ***********

app.get("/logout", function(req, res){
  req.logout();
  req.flash("success","Successfuly logged out!");
  res.redirect("/blogs");
})

// the view route
app.get("/blogs/:id", function(req, res){
  Blog.findById(req.params.id, function(err, foundBlog){
    if(err){
      req.flash("error", "Cannot view Blog: There is no Blog with such id!");
      res.redirect("back");
      console.log(err);
    } else {
      if(req.user !== undefined){
         res.locals.currentUser = req.user.username;
       };
      res.render("show", {blog: foundBlog, colon: "|"});
    }
  });
});

// ########################
// #                      #
// #   MIDDLEWARE SETUP   #
// #                      #
// ########################

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  req.flash("error", "You need to be logged in to do that!");
  res.redirect("/login");
}

function isBlogAuthor(req, res, next){
  Blog.findById(req.params.id, function(err, foundBlog){
    if(err){
      req.flash("error", "There is no blog with such id!");
      res.redirect("back");
    }
    else{
      if(foundBlog.author.id.equals(req.user._id)){
        next();
      }
      else{
        req.flash("error", "You dont have permission to do that!");
        res.redirect("back");
      }
    }
  });
}

// ################################
// #                              #
// #   THE ACTUAL SERVER CONFIG   #
// #                              #
// ################################

app.listen(3000, process.env.IP, function(){
   console.log("The Blog Server Has Started!");
});
