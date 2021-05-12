'use strict'

const express = require('express');
const passport = require('passport');
const cookieSession = require('cookie-session');

const GoogleStrategy = require('passport-google-oauth20');

// our database operations
const dbo = require('./databaseOps.js');

// Google login credentials, used when the user contacts
// Google, to tell them where he is trying to login to, and show
// that this domain is registered for this service. 
// Google will respond with a key we can use to retrieve profile
// information, packed into a redirect response that redirects to
// server162.site:[port]/auth/redirect
const hiddenClientID = process.env['ClientID']
const hiddenClientSecret = process.env['ClientSecret']
let usrProfile;

// An object giving Passport the data Google wants for login.  This is 
// the server's "note" to Google.
const googleLoginData = {
    clientID: hiddenClientID,
    clientSecret: hiddenClientSecret,
    callbackURL: '/auth/accepted',
    proxy: true
};


// Tell passport we will be using login with Google, and
// give it our data for registering us with Google.
// The gotProfile callback is for the server's HTTPS request
// to Google for the user's profile information.
// It will get used much later in the pipeline. 
passport.use(new GoogleStrategy(googleLoginData, gotProfile) );


// Let's build a server pipeline!

// app is the object that implements the express server
const app = express();

// use this instead of the older body-parser
app.use(express.json());

// pipeline stage that just echos url, for debugging
app.use('/', printURL);

// Check validity of cookies at the beginning of pipeline
// Will get cookies out of request object, decrypt and check if 
// session is still going on. 
app.use(cookieSession({
    maxAge: 6 * 60 * 60 * 1000, // Six hours in milliseconds
    // after this user is logged out.
    // meaningless random string used by encryption
    keys: ['hanger waldo mercy dance']  
}));

// Initializes passport by adding data to the request object
app.use(passport.initialize()); 

// If there is a valid cookie, this stage will ultimately call deserializeUser(),
// which we can use to check for a profile in the database
app.use(passport.session()); 

// Public static files - /public should just contain the splash page
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/public/splash.html");
});

app.get('/*',express.static('public'));

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
  console.log("Successfully logged out!")
});

// next, handler for url that starts login with Google.
// The app (in public/login.html) redirects to here 
// (it's a new page, not an AJAX request!)
// Kicks off login process by telling Browser to redirect to
// Google. The object { scope: ['profile'] } says to ask Google
// for their user profile information.
app.get('/auth/google',
	passport.authenticate('google',{ scope: ['profile'] }) );
// passport.authenticate sends off the 302 (redirect) response
// with fancy redirect URL containing request for profile, and
// client ID string to identify this app. 
// The redirect response goes to the browser, as usual, but the browser sends it to Google.  
// Google puts up the login page! 

// Google redirects here after user successfully logs in
// This route has three middleware functions. It runs them one after another.
app.get('/auth/accepted',
	// for educational purposes
	function (req, res, next) {
	    console.log("at auth/accepted");
	    next();
	},
	// This will issue Server's own HTTPS request to Google
	// to access the user's profile information with the 
	// temporary key we got in the request. 
	passport.authenticate('google'),
	// then it will run the "gotProfile" callback function,
	// set up the cookie, call serialize, whose "done" 
	// will come back here to send back the response
	// ...with a cookie in it for the Browser! 
	function (req, res) {
      console.log("Inside auth profile has arrived: ",usrProfile);
	    console.log('Logged in and using cookies!')

      // tell browser to get the hidden main page of the app
      console.log("Request Body: "+JSON.stringify(req.body));
      res.redirect(`/public/index.html`); 
	    /*res.redirect(`/public/index.html?userName=${usrProfile.name['givenName']}`); */
      //in /user ??
      //?userName= query string
	});

// static files in /user are only available after login
app.get('/*',
	isAuthenticated, // only pass on to following function if
	// user is logged in 
	// serving files that start with /user from here gets them from ./
	express.static('user') 
       ); 

// next, put all queries (like store or reminder ... notice the isAuthenticated 
// middleware function; queries are only handled if the user is logged in
app.get('/query', isAuthenticated,
    function (req, res) { 
      console.log("saw query");
      res.send('HTTP query!') });

app.get('/name', isAuthenticated,
  function(req, res, next){
    console.log("received GET request for /name");
    res.send(req.user);
});

var offset = 0;
app.post('/timezone', isAuthenticated,
  function(request, response, next) {
    /*console.log(request.body);*/
    response.send({
      message: "I recieved your POST request at /timezone"
    });
    offset = request.body.offset;
  });

//GET request /reminder
app.get('/reminder', isAuthenticated,
  function(request, response, next){
    console.log("received GET request for /reminder");
    let userid = request.user['userid'];
    dbo.getReminder(offset, userid) 
    .then(function(data){
      response.send(data);
    }) 
    .catch(function(error){
        console.log("error:", error);}
    );
  });

// handle Activity post requests
app.post('/store', isAuthenticated,
  function(request, response, next) {
    console.log(
      "Server recieved a post request /store with body: ",
      request.body
    );
    response.send({
      message: "I recieved your POST request at /store"
    });
    //insert data received into database as a row
    if(request.body.scalar === undefined){ //is future activity
      dbo.insertActivity(request.body.date, request.body.activity, -1, offset,request.user['userid']).catch(
      function (error) {
      console.log("error:",error);}
      );
    } else{ //is past activity
        dbo.insertActivity(request.body.date, request.body.activity, request.body.scalar, offset, request.user['userid']).catch(
        function (error) {
        console.log("error:",error);}
      );
    }
  });  

// GET chart info
app.get('/week', isAuthenticated,
  function(request, response){
    //extract query parameters
    let date = request.query.date;
    let activity = request.query.activity;
    //get info from database
    dbo.getChartData(date, activity) 
    .then(function(data){
      response.send(data)
    })
    .catch(function(error){
        console.log("error:", error);}
    );
  });

// finally, file not found, if we cannot handle otherwise.
app.use( fileNotFound );

// Pipeline is ready. Start listening!  
const listener = app.listen(3000, () => {
  console.log("The static server is listening on port " + listener.address().port);
});

// middleware functions called by some of the functions above. 

// print the url of incoming HTTP request
function printURL (req, res, next) {
    console.log(req.url);
    next();
}

// function for end of server pipeline
function fileNotFound(req, res) {
    let url = req.url;
    res.type('text/plain');
    res.status(404);
    res.send('Cannot find '+url);
    }


// function to check whether user is logged when trying to access
// personal data
function isAuthenticated(req, res, next) {
    if (req.user) {
      // user field is filled in in request object
      // so user must be logged in! 
	    console.log("user",req.user,"is logged in");
	    next();
    } else {
	res.redirect('/splash.html');  // send response telling
	// Browser to go to login page
    }
}

// Some functions Passport calls, that we can use to specialize.
// This is where we get to write our own code, not just boilerplate. 
// The callback "done" at the end of each one resumes Passport's
// internal process.  It is kind of like "next" for Express. 

// function called during login, the second time passport.authenticate
// is called (in /auth/redirect/), // /auth/accepted ??
// once we actually have the profile data from Google. 
function gotProfile(accessToken, refreshToken, profile, done) {
    console.log("Google profile has arrived",profile);
    // here is a good place to check if user is in DB,
    // and to store him in DB if not already there. 
    // Second arg to "done" will be passed into serializeUser,
    // should be key to get user out of database.
    usrProfile = profile; //global var: used to display name on hidden page
    let userid = profile.id;  
    let firstName = profile.name['givenName'];
    console.log("gotProfile");

    //check if user is in DB. If not, store in DB
    dbo.insertProfile(userid, firstName)
      .then(()=> console.log("insertProfile success")) 
      .catch(function(error){
        console.log("error in insertProfile:", error);}
      );

    done(null, userid); 
}

// Part of Server's sesssion set-up.  
// The second operand of "done" becomes the input to deserializeUser
// on every subsequent HTTP request with this session's cookie. 
passport.serializeUser((userid, done) => {
    console.log("SerializeUser. Input is",userid);
    done(null, userid);
});

// Called by passport.session pipeline stage on every HTTP request with
// a current session cookie. 
// Where we should lookup user database info. 
// Whatever we pass in the "done" callback becomes req.user
// and can be used by subsequent middleware.
passport.deserializeUser((userid, done) => {
    console.log("deserializeUser. Input is:", userid);
    // here is a good place to look up user data in database using
    // dbRowID. Put whatever you want into an object. It ends up
    // as the property "user" of the "req" object. 

    let userData = {'userid': userid};
    dbo.getName(userid)
      .then((data)=> {
        userData.name = data;
        console.log('req.user:',userData);
        done(null, userData);
        })
      .catch((error)=> console.log("error in deserializeUser: ",error));
});


