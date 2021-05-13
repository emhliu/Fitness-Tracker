'use strict';  // always start with this 

import barchart from './barchart.js'
barchart.init('chart-anchor', 500, 300); //only init ONCE
// set default date of 'View Progress'
document.getElementById('oAct-date').valueAsDate = new Date(yesterday());


/* send client's time zone offset to server */
let offset = new Date().getTimezoneOffset(); //any date works
let offset_ms = offset * 60000; //convert hours to milliseconds
let offsetObj = {offset: offset_ms};
//console.log(JSON.stringify(offsetObj));
  fetch(`/timezone`, { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(offsetObj), // post body
  })
  .then(response => response.json()) 
  .then(data => {
    console.log('/timezone Success:', data);
  })
  .catch((error) => {
    console.error('/timezone Error:', error);
  });

/* Get user's name and display it */
console.log("sending GET request to /name")
fetch('/name', { 
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {return response.json();}) 
  .then(data => {
    console.log("received /name response");
    document.getElementById('username').textContent = data['name'];
  })
  .catch(error => {console.log("error:", error);})

/* Set default date in forms to current date */
document.getElementById('pAct-date').valueAsDate = newUTCDate()
document.getElementById('fAct-date').valueAsDate = newUTCDate()

/* Reminder Button Action*/
let reminder_button_yes = document.getElementById("reminder-yes")
reminder_button_yes.addEventListener("click", reminder_yes);
function reminder_yes(){
  add_past_activity_onclick();
  hide_reminder();
  //prefill date and activity
  console.log("remind data:",remind_data);
  document.getElementById('pAct-activity').value = remind_data['activity'];
  document.getElementById('pAct-date').valueAsDate = remind_data['date'];
}
let reminder_button_no = document.getElementById("reminder-no")
reminder_button_no.addEventListener("click", hide_reminder);
function hide_reminder(){
  document.getElementById("reminder-container").style.display = 'none';
}

let remind_data = {'activity':null, 'date':null}; //global variable to use in remind_button_yes
/* Reminder GET request */
console.log("sending GET request to /reminder")
fetch('/reminder', { 
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
})
.then(response => {return response.json();}) //unwrap response as a JSON
.then(data => {
  console.log("received /reminder response");
  if(data != false){
    //display container
    document.getElementById("reminder-container").style.display = 'flex'; 
    document.getElementById("reminder-activity").textContent = data["activity"];

    remind_data.activity = data["activity"];

    console.log(data["date"]);
    let date = new Date(data["date"]);
    console.log("date",date);

    remind_data.date = date;

    if(date.getTime() != yesterday()){
      let days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      let dateString = "\u00A0"+ "on "+ days[date.getDay()] + "?";
      document.getElementById("reminder-date").textContent = dateString;
    }
  }
  
})
.catch(error => {console.log("error:", error);})


/* View Progress Button - Show Overlay and Send GET Request*/
let view_progress_button = document.getElementById("view-progress");
view_progress_button.addEventListener("click", show_overlay);

function show_overlay() {
  //document.getElementById("overlay").classList.remove("hide");
  document.getElementById("overlay").style.display = 'flex';
  /* Chart Info GET request: DEFAULT 
     date = yesterday, activity = '' */
  getChart(yesterday(),'');
}

function yesterday(){ //in milliseconds
  let today = new Date();
  let yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(yesterday.toLocaleDateString()).getTime(); // 00:00:00
}

function convert_to_UTC(date){ // in milliseconds
  return new Date(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()).getTime();
}

function getChart(date, activity){ //date in milliseconds
  let urlString = '/week?date=' + date +'&activity=' + activity; //change to paramenters?
  console.log("sending GET request to /week")
  fetch(urlString, { 
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {return response.json();}) //unwrap response as a JSON
  .then(data => {
    console.log("received /week response");
    console.log(data);
    // render Chart
    activity = data[0];
    let units = chart_y_axis(activity);
    data.shift(); //remove first item (activity)
    console.log(data);
    // remove previous chart to avoid multiple charts displayed
    // OR move code to main.js (script approach)
    barchart.render(data, units, 'Day of the Week');
  })
}

function chart_y_axis(activity){
  console.log(activity)
  switch (activity) {
    case 'Walk': 
      return 'Kilometers Walked';
    case 'Run': 
      return 'Kilometers Run';
    case 'Bike':
      return 'Kilometers Biked';
    case 'Swim':
      return 'Laps Swam';
    case 'Yoga': 
      return 'Minutes of Yoga';
    case 'Soccer': 
      return 'Minutes of Soccer';
    case 'Basketball':
      return 'Minutes of Basketball';
    default:
      return 'Units';
  }
}

/* Go Button (inside Overlay) */
let go_button = document.getElementById("overlay-go");
go_button.addEventListener("click", go_button_onclick);

function go_button_onclick(){
  let input_date = document.getElementById("oAct-date").value;
  let date = new Date(input_date.split('-')); //create Date object
  let activity = document.getElementById("oAct-activity").value;

  let today = newUTCDate();
  console.log(today.getTime());
  console.log(date.getTime());
  if(date.getTime() >= today.getTime()){ //today or later
    alert("the date is too late"); 
  }
  else{
    getChart(date.getTime(), activity);
  }
}


/* X - Close Overlay */
let x_span = document.getElementById("close");
x_span.addEventListener("click", close_overlay);

function close_overlay() {
  //document.getElementById("overlay").classList.add("hide");
  document.getElementById("overlay").style.display = 'none';
}


/* Past Activity 'Add New Activity' Button - Show Form */
let add_past_activity_button = document.getElementById("addPastActivityButton")
add_past_activity_button.addEventListener("click", add_past_activity_onclick);


/* Future Activity 'Add New Activity' Button - Show Form */
let add_future_activity_button = document.getElementById("addFutureActivityButton")
add_future_activity_button.addEventListener("click", add_future_activity_onclick);


/* Past Activity Form Dropdown */
let past_activity_dropdown = document.getElementById("pAct-activity")
past_activity_dropdown.addEventListener("change", past_activity_dropdown_onchange);


/* Past Activity 'Submit' Button - Submit Form */
let submit_past_activity_button = document.getElementById("submitPastActivityButton")
submit_past_activity_button.addEventListener("click", submit_past_activity_onclick);


/* Future Activity 'Submit' Button - Submit Form */
let submit_future_activity_button = document.getElementById("submitFutureActivityButton")
submit_future_activity_button.addEventListener("click", submit_future_activity_onclick)


/**
 * ONCLICK - Hide 'Add New Activity' Button under the Past Section and Show
 * Form to Add a Past Activity
 */
function add_past_activity_onclick() {
  /* Connect to Past Activity Sections */
  let pActAdd = document.getElementById("pAct-Add");
  let pActForm = document.getElementById("pAct-Form");

  /* Show Form, Hide 'Add New Activity' Button */
  pActAdd.classList.add("hide");
  pActForm.classList.remove("hide");
}


/**
 * ONCLICK - Hide 'Add New Activity' Button under the Future Section and Show
 * Form to Add a Future Activity
 */
function add_future_activity_onclick() {
  /* Connect to Past Activity Sections */
  let fActAdd = document.getElementById("fAct-Add");
  let fActForm = document.getElementById("fAct-Form");

  /* Show Form, Hide 'Add New Activity' Button */
  fActAdd.classList.add("hide");
  fActForm.classList.remove("hide");
}


/**
 * ONCHANGE - Automatically Change Units in Past Activty Form to accomodate the
 * selected Activity from the dropdown menu
 */
function past_activity_dropdown_onchange() {
  /* Connect to Past Activity Unit Input */
  let pActUnit = document.getElementById("pAct-unit");

  /* Show Form, Hide 'Add New Activity' Button */
  switch (past_activity_dropdown.value) {
    case 'Walk': case 'Run': case 'Bike':
      pActUnit.value = 'km';
      break;
    case 'Swim':
      pActUnit.value = 'laps';
      break;
    case 'Yoga': case 'Soccer': case 'Basketball':
      pActUnit.value = 'minutes';
      break;
    default:
      pActUnit.value = 'units';
  }
}


/**
 * ONCLICK - Validate Past Activity Form Contents, Send Data to Server, Remove
 * Form, and Display 'Add ...' Button with confirmation text above
 */
function submit_past_activity_onclick() {
  /* Connect to Past Activity Sections */
  let pActAdd = document.getElementById("pAct-Add");
  let pActForm = document.getElementById("pAct-Form");
  
  /* Activity Data to Send to Server */
  let data = {
    date: document.getElementById('pAct-date').value,
    activity: document.getElementById('pAct-activity').value,
    scalar: document.getElementById('pAct-scalar').value,
    units: document.getElementById('pAct-unit').value
  }

  if (!past_activity_form_is_valid(data)) {  
    alert("Invalid Past Activity. Please fill in the entire form.");
    return
  }

  /* Hide Form, Show 'Add New Activity' Button */
  pActAdd.classList.remove("hide");
  pActForm.classList.add("hide");
  
  /* Add 'p' tag above 'Add New Activity' Button */
  let newActivity = create_submission_success_element(   
    "Got it! ",
    `${data.activity} for ${data.scalar} ${data.units}. `,
    "Keep it up!"
  )
  insert_latest_response(pActAdd, newActivity)

  console.log('Past Activity Sending:', data);

  /* Post Activity Data to Server */
  fetch(`/store`, { 
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data), // post body
  })
  .then(response => response.json()) 
  .then(data => {
    console.log('Store Activity Success:', data);
  })
  .catch((error) => {
    console.error('Store Activity Error:', error);
  });
 
  /* Reset Form */
  document.getElementById('pAct-date').valueAsDate = newUTCDate()
  document.getElementById('pAct-activity').value = "Walk"
  document.getElementById('pAct-scalar').value = ""
  document.getElementById('pAct-unit').value = "km"
}


/**
 * ONCLICK - Validate Future Activity Form Contents, Send Data to Server, Remove
 * Form, and Display 'Add ...' Button with confirmation text above
 */
function submit_future_activity_onclick() {
  /* Connect to Future Activity Sections */
  let fActAdd = document.getElementById("fAct-Add");
  let fActForm = document.getElementById("fAct-Form");
  
  /* Activity Data to Send to Server */
  let data = {
    date: document.getElementById('fAct-date').value,
    activity: document.getElementById('fAct-activity').value
  }
  
  /* Form Validation */
  if (!future_activity_form_is_valid(data)) {  
    alert("Invalid Future Plan. Please fill in the entire form.");
    return
  }

  /* Hide Form, Show 'Add New Activity' Button */
  fActAdd.classList.remove("hide");
  fActForm.classList.add("hide");

  /* Add 'p' tag above 'Add New Activity' Button  */
  let newActivity = create_submission_success_element(
    "Sounds good! Don't forget to come back to update your session for ",
    `${data.activity} on ${reformat_date(data.date)}`,
    "!"
  )
  insert_latest_response(fActAdd, newActivity)

  console.log('Future Plans Sending:', data);

  /* Post Activity Data to Server */
  fetch(`/store`, { // changed /futureActivity to /store
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data), // post body
  })
  .then(response => response.json())
  .then(data => {
    console.log('Future Plans Success:', data);
  })
  .catch((error) => {
    console.error('Future Plans Error:', error);
  });

  /* Reset Form */
  document.getElementById('fAct-date').valueAsDate = newUTCDate()
  document.getElementById('fAct-activity').value = "Walk"
}


/**
 * Create DOM element for acknowledgment message to send to user for submitting a form
 * @param {string} beg - regular starting section
 * @param {string} mid - bolded middle section
 * @param {string} end - regular trailing text
 * @returns {HTMLElement} DOM element combining beg, mid, end
 */
function create_submission_success_element(beg, mid, end) {
  /* Create all HTML elements to add */
  let newMessage = document.createElement('p')
  let baseText = document.createElement('span')
  let dynamicText = document.createElement('strong')
  let exclamationText = document.createElement('span')
  
  /* Update textContent of all generated DOM elements */
  baseText.textContent = beg
  dynamicText.textContent = mid
  exclamationText.textContent = end
  
  /* Append all text contents back to back in wrapper 'p' tag */
  newMessage.appendChild(baseText)
  newMessage.appendChild(dynamicText)
  newMessage.appendChild(exclamationText)

  return newMessage  
}


/**
 * Checks if past activity data is valid
 * @param {Object} data
 * @param {string} data.date - format 'mm-dd-yyyy'
 * @param {string} data.activity
 * @param {string} data.scalar - time or distance integer or float
 * @param {string} data.units - units for scalar value
 * @returns {boolean} Boolean represents if data is valid
 */
function past_activity_form_is_valid(data) {
  let date = new Date(data.date.replace('-','/'))
  if ( date != "Invalid Date" && date > newUTCDate()) {
    return false
  }

  return !(data.date == "" || data.activity == "" || data.scalar == "" || data.units == "" )
}


/**
 * Checks if future activity data is valid
 * @param {Object} data
 * @param {string} data.date
 * @param {string} data.activity
 * @returns {boolean} Boolean represents if data is valid
 */
function future_activity_form_is_valid(data) {
  let date = new Date(data.date.replace('-','/'))
  if ( date != "Invalid Date" && date < newUTCDate()) {
    return false
  }

  return !(data.date == "" || data.activity == "")
}


/**
 * Insert Prompt at the top of parent and remove old prompts
 * @param {HTMLElement} parent - DOM element 
 * @param {HTMLElement} child - DOM element
 */
function insert_latest_response(parent, child) {
  if(parent.children.length > 1) {
    parent.removeChild(parent.children[0])
  }
  parent.insertBefore(child, parent.childNodes[0])
}


/**
 * Convert 'yyyy-mm-dd' to 'mm/dd/yy'
 * @param {string} date 
 * @returns {string} same date, but reformated
 */
function reformat_date(date) {
  let [yyyy, mm, dd] = date.split("-");
  return `${mm}/${dd}/${yyyy.substring(2,4)}`
}


/**
 * Convert GMT date to UTC
 * @returns {Date} current date, but converts GMT date to UTC date
 */
function newUTCDate() {
  let gmtDate = new Date()
  return new Date(gmtDate.toLocaleDateString())
}
