'use strict'

// A server that uses a database. 

// express provides basic server functions
const express = require("express");

// our database operations
const dbo = require('./databaseOps');

// object that provides interface for express
const app = express();

// use this instead of the older body-parser
app.use(express.json());

// make all the files in 'public' available on the Web
app.use(express.static('public'))

// when there is nothing following the slash in the url, return the main page of the app.
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/public/index.html");
});

var offset = 0;
app.post('/timezone', function(request, response, next) {
  /*console.log(request.body);*/
  response.send({
    message: "I recieved your POST request at /timezone"
  });
  offset = request.body.offset;
});

//GET request /reminder
app.get('/reminder', function(request, response, next){
  console.log("received GET request for /reminder");
  dbo.getReminder(offset)
  .then(function(data){
    response.send(data);
  }) 
  .catch(function(error){
      console.log("error:", error);}
  );
  /*
  const test = {
    "activity": "Walk",
    "date": 1619308800000 // 4/25/2021
    };
  response.send(test);*/
  //response.json(test); //same as response.send(JSON.stringify(x))
});

// handle Activity post requests
app.post('/store', function(request, response, next) {
  console.log(
    "Server recieved a post request /store with body: ",
    request.body
  );
  response.send({
    message: "I recieved your POST request at /store"
  });
  //insert data received into database as a row
  console.log(offset);
  if(request.body.scalar === undefined){ //is future activity
    dbo.insertActivity(request.body.date, request.body.activity, -1, offset).catch(
    function (error) {
    console.log("error:",error);}
    );
  } else{ //is past activity
      dbo.insertActivity(request.body.date, request.body.activity, request.body.scalar, offset).catch(
      function (error) {
      console.log("error:",error);}
    );
  }
});

// GET chart info
app.get('/week', function(request, response){
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

// This is where the server recieves and responds to POST requests
app.post('*', function(request, response, next) {
  console.log("Server recieved a post request at", request.url);
  // console.log("body",request.body);
  response.send("I got your POST request");
});


// listen for requests :)
const listener = app.listen(3000, () => {
  console.log("The static server is listening on port " + listener.address().port);
});


// call the async test function for the database
// this is an example showing how the database is used
// you will eventually delete this call.
/*
dbo.testDB().catch(
  function (error) {
    console.log("error:",error);}
);*/


