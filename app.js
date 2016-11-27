// #######################
// #                     #
// #   REQUIRING STUFF   #
// #                     #
// #######################

var express          = require("express"),
    methodOverride   = require('method-override'),
    expressSanitizer = require("express-sanitizer"),
    mongoose         = require("mongoose"),
    bodyParser       = require("body-parser"),
    flash            = require('connect-flash'),
    path             = require('path'),
    favicon          = require('serve-favicon'),
    app              = express();

// #####################
// #                   #
// #  THE APP CONFIG   #
// #                   #
// #####################

// connect to mongoDb
mongoose.connect("mongodb://localhost/restful_blog_app");

app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
// override method in html form with ?_method =..
app.use(methodOverride('_method'));

// use public dir with css, img and js..
app.use(express.static("public"));

// use pug and tell app to look in views for pug files
app.set('views', path.join(__dirname, 'views'));
app.set("view engine", "pug");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname,'public','favicon.ico')));


// ####################
// #                  #
// #  THE DB CONFIG   #
// #                  #
// ####################



// mongoose model config
var blogSchema = new mongoose.Schema({
  title: String,
  body: String,
  date: {type: Date, default: Date.now}
});
// saving the mongoose model into var
var Blog = mongoose.model("Blog", blogSchema);

//TEST CREATE

// Blog.create({
//   title: "First Blog!",
//   body: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
// });

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
app.get("/blogs/:id/edit", function(req, res){
  Blog.findById(req.params.id, function(err, foundBlog){
    if(err){
      res.redirect("back");
    } else {
      res.render("edit", {blog: foundBlog});
    }
  });
});

app.put("/blogs/:id", function(req, res){
  var result = JSON.parse(JSON.stringify(req.body));

  result.blog.body = req.sanitize(result.blog.body);

  Blog.findByIdAndUpdate(req.params.id, result.blog, function(err, updatedBlog) {
    if(err){
      res.redirect("back");
    } else {
      res.redirect("/blogs/" + req.params.id);
    }
  });
});

// ************
// CREATE BLOGS
// ************

app.get("/blogs/new", function(req, res){
  res.render("new");
});

app.post("/blogs", function(req,res){
  req.body.blog.body = req.sanitize(req.body.blog.body);
  Blog.create(req.body.blog, function(err, newBlog){
    if(err){
      res.render("new");
    } else {
      res.redirect("/blogs");
    }
  });
});

// ************
// DELETE BLOGS
// ************

app.delete("/blogs/:id", function(req, res){
  Blog.findByIdAndRemove(req.params.id, function(err){
    if(err){
      res.redirect("back");
    } else {
      res.redirect("/blogs");
    }
  });
});


// the view route
app.get("/blogs/:id", function(req, res){
  Blog.findById(req.params.id, function(err, foundBlog){
    if(err){
      res.redirect("back");
      console.log(err);
    } else {
      res.render("show", {blog: foundBlog});
    }
  });
});





// ################################
// #                              #
// #   THE ACTUAL SERVER CONFIG   #
// #                              #
// ################################

app.listen(3000, process.env.IP, function(){
   console.log("The Blog Server Has Started!");
});
