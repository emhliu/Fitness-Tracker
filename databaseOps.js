'use strict'

// using a Promises-wrapped version of sqlite3
const db = require('./sqlWrap');

// SQL commands for ActivityTable
const insertDB = "insert into ActivityTable (activity, date, amount, userid) values (?,?,?,?)"

const getOneDB = "select * from ActivityTable where activity = ? and date = ? and amount = ?";

const allDB = "select * from ActivityTable where activity = ?";

const getPastAct = "select * from ActivityTable WHERE userid = ? AND NOT amount = -1 and activity = ? and date = ?";

// delete all planned activities before a certain date
const deletePast = "delete from ActivityTable where amount = -1 and date <= ?";

const getRecentPlanned = "SELECT * FROM ActivityTable WHERE amount = -1 AND userid = ? AND date BETWEEN ? AND ? ORDER BY date DESC LIMIT 1"

const getRecentEntered = "SELECT * FROM ActivityTable WHERE userid = ? ORDER BY rowIdNum DESC LIMIT 1"

async function testDB () {

  // for testing, always use today's date
  const today = new Date().getTime();

  // all DB commands are called using await

  // empty out database - probably you don't want to do this in your program
  await db.deleteEverything();

  await db.run(insertDB,["running",today,2.4]);
  await db.run(insertDB,["walking",today,1.1]);
  await db.run(insertDB,["walking",today,2.7]);
  
  console.log("inserted two items");

  // look at the item we just inserted
  let result = await db.get(getOneDB,["running",today,2.4]);
  console.log(result);

  // get multiple items as a list
  result = await db.all(allDB,["walking"]);
  console.log(result);
}

async function insertActivity (date, activity, scalar, offset, userid) { 
  //await db.deleteEverything(); //temp
  // add offset to get correct milliseconds that client entered
  // UTC --> local time
  const inDate = new Date(date.split("-")).getTime() + offset;
  await db.run(insertDB,[activity, inDate, scalar, userid]); 

  //testing: print all in db
  let result = await db.all("select * from ActivityTable");
  console.log('all of db:',result);
}

async function getReminder (offset, userid) {
  let result = await db.all("select * from ActivityTable");
  console.log('all of db:',result);

  let today = new Date(); //today in UTC
  //console.log("today UTC:", today.getTime()); 
  let todayLocalMil = today.getTime() - offset;
  let todayLocal = new Date(todayLocalMil);
  //console.log("today local:", todayLocal, todayLocalMil);
  todayLocal.setHours(0,0,0,0);
  let finalToday = todayLocal.getTime() + offset; //today in Local
  console.log("finalToday:", finalToday);


  let yesterdayMil = finalToday - 86400000; //yesterday 00:00:00 local time
  console.log("yesterday:",yesterdayMil);

  let weekBeforeMil = finalToday - 7*86400000; //added
  console.log('weekBefore:',weekBeforeMil); 

  let recentPlanned = await db.get(getRecentPlanned, [userid, weekBeforeMil, yesterdayMil]);

  console.log("Recent planned:", recentPlanned);

  // delete planned activities (before today)
  await db.run(deletePast, [yesterdayMil]);

  if (recentPlanned == undefined){ 
    // no reminder needed: no activity found of correct dates
    console.log("exit: no reminder");
    return false;
  } else {
    return recentPlanned;
  }
}

async function getChartData (date, activity, userid) {
  // input: ending date(in milliseconds) and activity
  // output: array of objects (json?)
  // activity can be EMPTY ''
  
  // get DB entries for each day of the week, that match the activity
  
  // weekDataReversed: starting from end date, to first day of week (I will reverse the order later)
  //first element will be the activity (add after reversing)
  let weekDataReversed = [null,null,null,null,null,null,null,null];

  if(activity == ''){ // use the most recently entered database entry's activity
    let mostRecent = await db.all(getRecentEntered,[userid]);
    if(mostRecent.length == 0){
      activity = 'Walk';
    } else{
        activity = mostRecent[0]["activity"];
    }
  }

  // for each day of the week
  for(let i = 0; i < 7; i++){
    let amount = 0; //default (if no entries found)
    let dayOfWeek = date - (86400000 * i); // 86400000 ms in a day
    //console.log(dayOfWeek);

    // can be none, or 1, or array of multiple entries 
    let dayData = await db.all(getPastAct,[userid, activity, dayOfWeek]); 
    //console.log(dayData);

    if(dayData.length == 1){ //array of 1 element
      amount = dayData[0]['amount'];
      //console.log(amount);
    }
    else{ //multiple entries
      let numEntries = dayData.length;
      for(let i=0; i<numEntries; i++){ //sum up amounts from all entries
        amount += dayData[i]['amount'];
      }
    }
    weekDataReversed[i] = {'date': dayOfWeek, 'value': amount};
    //do I need to make the dates 12PM UTC (add 5 hours)?
  }
  let weekData = weekDataReversed.reverse();
  weekData[0] = activity;
  //console.log(weekData);
  return weekData;

  //testing
  //let all = await db.all("select * from ActivityTable");
  //console.log(all); 
}

// SQL commands for ProfileTable
const insertP = "insert into ProfileTable (userid, name) values (?,?)"
const selectId = "SELECT * FROM ProfileTable WHERE userid = ?"
const deleteP = "delete from ProfileTable"

async function insertProfile (userid, name) {
  let before = await db.all("select * from ProfileTable");
  console.log("before:", before);

  //if not in DB, insert it
  let matchingId = await db.all(selectId,[userid]);
  console.log("matchingId:", matchingId);
  if (matchingId.length == 0){
    await db.run(insertP,[userid, name]);
  }

  let after = await db.all("select * from ProfileTable");
  console.log("after: ",after);
}

async function getName (userid) {
  let matchingId = await db.get(selectId,[userid]);
  let name = matchingId['name'];
  return name;
}


module.exports.testDB = testDB;
module.exports.insertActivity = insertActivity;
module.exports.getReminder = getReminder;
module.exports.getChartData = getChartData;
module.exports.insertProfile = insertProfile;
module.exports.getName = getName;