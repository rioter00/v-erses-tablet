var localUsername = "";
var TimeOuts = [];
var ping = 0;
var tablet = "";
var currentAmendment = 1;
var currentCase = 1;
var voteTime = 20;
var currentVoteTime = 0;
var readTime = 40;
var readSession;
var currentReadTime = 0;
var voteStarted = false;
var voted = false;
var voteSession;
var vote = "";
var progressBars = [];

//
var animationNode;
var textNode;
var welcomeNode;
var votedNode;

//
var previousScroll = 10000;

// WPA Install Events
window.addEventListener('beforeinstallprompt', (event) => {
  // Prevent the mini-infobar from appearing on mobile.
  event.preventDefault();
  console.log('👍', 'beforeinstallprompt', event);
  // Stash the event so it can be triggered later.
  window.deferredPrompt = event;
  // Remove the 'hidden' class from the install button container.
  // divInstall.showModal();
});

window.oncontextmenu = function(event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
};

// disable context menu
document.addEventListener("contextmenu", function(e) {
  e.preventDefault();
  });


// called when DOM is ready
$(function () {

const divInstall = document.getElementById('installContainer');
const buttonInstall = document.getElementById('buttonInstall');

buttonInstall.addEventListener('click', async () => {
  console.log('👍', 'buttonInstall-clicked');
  const promptEvent = window.deferredPrompt;
  if (!promptEvent) {
    // The deferred prompt isn't available.
    console.log("promptEvent is null");
    return;
  }
  // Show the install prompt.
  promptEvent.prompt();
  // Log the result
  const result = await promptEvent.userChoice;
  console.log('👍', 'userChoice', result);
  // Reset the deferred prompt variable, since
  // prompt() can only be called once.
  window.deferredPrompt = null;
  // Hide the install button.
  // divInstall.close();
});

window.addEventListener('appinstalled', (event) => {
  console.log('👍', 'appinstalled', event);
  // Clear the deferredPrompt so it can be garbage collected
  window.deferredPrompt = null;
});


  setInterval(() => {
      window.resizeTo(600, 795);
    }, 4000);

  function getTabletVal(pathname, separator) {
    var parts = pathname.split(separator);
    console.log("parts", parts);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
    return "";
  }

  tablet = getTabletVal(new URL(document.location.href).pathname, "/");
  // document.getElementById("tablet").innerHTML = `table: ${tablet} (will be removed for production)`;

  animationNode = document.getElementById("animation-node");
  textNode = document.getElementById("text-node");
  welcomeNode = document.getElementById("welcome-node");
  votedNode = document.getElementById("voted-node");
  // console.log("animationNode", animationNode);s
  
  $("#welcome-node").click(function () {
    socket.emit('startVoteSession');
  });

  function scroll(val){
    document.getElementById("animation-node").scrollTop = val;
    document.getElementById("text-node").scrollTop = val;
    window.scrollTo(0, val);
  }

  function scrollCheck() {
    if (bounds.scrollTop > 1100) {
      // document.getElementById("myImg").className = "slideUp";
      console.log("scrolled", bounds.scrollTop, previousScroll);
      if (bounds.scrollTop > previousScroll) {
        console.log("trigger vote");
        socket.emit('startReadSession');
      }
      previousScroll = bounds.scrollTop;
    }
  }

  // load animation
  var animation = document.getElementById("animation");
  animation.src = `/animations/screen${tablet}.mp4`;
  animation.load();
  animation.onloadeddata = function () {
    animation.play();
  };
  animation.play();
  // aniNode.appendChild(aniImg);
  // aniImg.className = "animation";

  // join Collab-Hub Server with tablet number
  const socket = io("/hub", {
    query: {
      username: tablet,
    },
  });

  socket.emit("addUsername", {
    username: "tablet" + tablet,
  });

  socket.emit("joinRoom", {
    room: "tablets",
  });

  setInterval(() => {
    const start = Date.now();
    const pingObject = { start };
    socket.volatile.emit("chPing", pingObject);
  }, 3000);

  socket.emit("getAmendment");
  socket.emit("getCase");

  //
  socket.emit("getTimes");
  socket.on("setVoteTime", (data) => {
    voteTime = data.time;
    console.log("vote time set: " + voteTime);
    // bounds.scrollTop = 1280;
  });

  socket.on("changeReadTime", (data) => {
    readTime = data.time;
    console.log("read time set: " + readTime);
  });

  socket.on("changeVoteTime", (data) => {
    voteTime = data.time;
    console.log("vote time set: " + voteTime);
  });

  socket.on("chPingBack", (data) => {
    const tempPing = Date.now() - data.start;
    if (tempPing !== ping) {
      $("#ping").text("Ping: " + tempPing + " ms");
      ping = tempPing;
    }
  });

  socket.on("serverMessage", (data) => {
    console.log("--------- received serverMessage: " + data.message);
  });

  socket.on("changeCase", (data) => {
    changeCase(data.case);
    voted = false;
    displayTextNode();
  });

  socket.on("getAmendment", () => {
    socket.emit("amendment", {
      amendment: currentAmendment,
    });
  });

  socket.on("voteTime", (data) => {
    if(voted){
      return;
    }
    
    displayTextNode();
    progressBars = Array.from(document.getElementsByClassName("progress-bar"));
    progressBars.forEach(element => {
      element.style.width = data.value + "%";
    });

    if (data.session != "vote") return;
      enableButtons();
      disableSubmitted();
  });

  socket.on("startIdleSession", () => {
    console.log("--------- received startIdleSession");
    textNode.style.display = "none";
    welcomeNode.style.display = "block";
    votedNode.style.display = "none";
  });

  socket.on("startWaitSession", () => {
        // animationNode.style.display = "block";
        textNode.style.display = "none";
        welcomeNode.style.display = "none";
        votedNode.style.display = "block";

        scroll(0);
        console.log("--------- received startWaitSession");
  });

  socket.on("stopVoteSession", () => {
    console.log("--------- received stopVoteSession");
    stopVoteSession();
  });

  socket.on("getVoteResults", () => {
    if (voted) {
      return;
    }
    // send random vote
    const vote = Math.floor(Math.random() * 2) + 1 > 1 ? "for" : "against";
    sendVote(vote);
    voted = true;
  });

  function stopVoteSession() {
    // stopVoteProgressBar();
    // disableButtons();
    // clearInterval(voteSession);
    voted = true;
    // resetCurrentVoteTime();
    enableSubmitted();
  }

  function resetCurrentVoteTime() {
    currentVoteTime = 0;
  }

  function displayTextNode(){
    textNode.style.display = "block";
    welcomeNode.style.display = "none";
    votedNode.style.display = "none";
    progressBars = Array.from(document.getElementsByClassName("progress-bar"));
    progressBars.forEach(element => {
      element.style.width = 0 + "%";
    });
  }

  function changeCase(newCase) {
    displayTextNode();
    console.log("--------- received changeCase: " + newCase);
    if (newCase > caseTitles.length) {
      alert("Case out of range");
      newCase = caseTitles.length - 1;
      return;
    }
    voteStarted = false;
    voted = false;

    currentCase = newCase;
    // load case information
    $("#case-details").text(caseTexts[currentCase]);
    $("#case-question").text(caseQuestions[currentCase]);
    //
    // disableButtons();
    disableSubmitted();
    // enableReadReminder();
  }

  function sendVote(vote) {
    // send vote
    socket.emit("vote", {
      from: tablet,
      vote: vote,
      amendment: currentAmendment,
    });
  }
  //

  function startMessageFade(listItemId) {
    // $("#"+listItemId).stop().fadeIn(10).delay( 1800 ).fadeOut( 400 );
    let toVar = setTimeout(messageFade, 3000, listItemId);
    return toVar;
  }

  function disableReadReminder() {
    var buttons = document.getElementById("read-container");
    buttons.style.display = "none";
  }

  function enableReadReminder() {
    var buttons = document.getElementById("read-container");
    buttons.style.display = "flex";
  }

  function disableButtons() {
    var buttons = document.getElementById("button-container");
    buttons.style.display = "none";
  }

  function enableButtons() {
    var buttons = document.getElementById("button-container");
    buttons.style.display = "flex";
  }

  function disableSubmitted() {
    // var submitFeedback = document.getElementById("submitted-container");
    // submitFeedback.style.display = "none";
    votedNode.style.display = "none";
  }

  function enableSubmitted() {
    // var submitFeedback = document.getElementById("submitted-container");
    // submitFeedback.style.display = "block";
    textNode.style.display = "none";
    votedNode.style.display = "block";
  }

  function stopVoteProgressBar() {
    // document.getElementById("vote-progress-bar").value = 0;
    progressBars.forEach(element => {
      element.value = 0;
    });
  }

  //

  const caseTitles = ["Reno v. Condon (2000)", 
  "Printz v. United States (1997)", 
  "Missouri v. Jenkins (1990)", 
  "United Transportation Union v. Long Island Rail Road Co.(1982)", 
  "United States v. Darby (1941)",
  "Morgan v. Virginia (1946)",
  "Gonzalez v. Raich (2005)",
  "State of Missouri v. Holland U.S. Game Warden (1920)",
];

  const caseTexts = [
    "State departments of motor vehicles (DMVs) require drivers and automobile owners to provide personal information, which may include a person's name, address, telephone number, vehicle description, Social Security number, medical information, and photograph, as a condition of obtaining a driver's license or registering an automobile. Finding that many States sell this information to individuals and businesses for significant revenues, Congress enacted the Driver's Privacy Protection Act of 1994 (DPPA), which establishes a regulatory scheme that restricts the States' ability to disclose a driver's personal information without the driver's consent.",
    "The Brady Handgun Violence Prevention Act provisions require the Attorney General to establish a national system for instantly checking prospective handgun purchasers' backgrounds, and command the \"chief law enforcement officer'' (CLEO) of each local jurisdiction to conduct such checks and perform related tasks. Petitioners, the CLEOs for counties in Montana and Arizona, filed separate actions challenging the provisions' constitutionality.",
    "Kansas City, Missouri, School District (KCMSD) operated a segregated school; a Federal court issued an order detailing a desegregation remedy. The federal court ruled that the State should levy a tax for the financing necessary to implement desegregation.",
    "New York Taylor’s law, prohibites strikes by public employees while the Federal Railway Labor Act specifically allows for strikes by railroad employees. The Long Island Rail Road is a state entity, and New York State sued to prevent their workers from striking.",
    "In 1938, Congress passed the Fair Labor Standards Act (FLSA) to regulate many aspects of employment, including minimum wages, maximum weekly hours, and child labor. As lumber manufacturer Darby, did not follow these regulations and then shipped lumber out of state, he was arrested for violating the FLSA. He then sued to be allowed to sell his product in other states.",
    "Irene Morgan, was riding an interstate Greyhound bus.She was arrested and convicted in Virginia for refusing to give up her seat to a white person. Greyhound company policy reserved “full control and discretion as to the seating of passengers and the right to change such seating at any time.” Virginia law, meanwhile, required buses to segregate their passengers on the basis of race, while the Federal Government had laws that states could not pass laws that regulated commercial passenger travel that crossed state lines.",
    "In 1996 California voters passed the Compassionate Use Act, legalizing marijuana for medical use. California's law conflicted with the federal Controlled Substances Act (CSA), which banned possession of marijuana. The medical marijuana users argued the Controlled Substances Act - which Congress passed using its constitutional power to regulate interstate commerce - exceeded Congress' commerce clause power.", 
    "The Federal government signed the Migratory Bird Treaty Act which specifies closed seasons and protection in other forms for migratory birds. Citizens in Missouri challenged the treaty arguing that the constitution gave Congress no enumerated power to regulate migratory bird hunting, and thus the regulation of such hunting was the province of the states according to the Tenth Amendment."
  ];
  
  const caseQuestions = [
    "Should a state be able to sell personal information gathered from drivers licenses, or should the Federal Government be allowed to restrict the ability to disclose a driver's personal information without the driver's consent?",
    "Can the Federal Government require states to perform the Federal background-checks in order to regulate handgun purchases?",
    "Can the Federal Government order the State to increase property taxes?",
    "Should employees of the Long Island Rail Road be allowed to strike under Federal law, or should they be constrained by New York State Law prohibiting strikes by public employees?",
    "Can the Federal Government outlaw substandard labor conditions since they have a significant impact on interstate commerce, or should the states be allowed to set their own labor laws? ",
    "Should states be allowed to segregate passengers by race on interstate travel routes, despite the Federal Government’s Interstate Commerce Clause which rejects such segregation?",
    "Does the Federal Government have the right to outlaw medical marijuana, or should states be able to enact laws expressly allowing it?",
    "Can the Federal Government force states to follow international treaties, or should the states have the power to choose not to abide by treaties signed by the Federal Government?",
  ];

  socket.emit("addUsername", {
    username: "tablet" + tablet,
  });

  // interface functions
  $("#for").click(function () {
    console.log(tablet + " clicked for");
    // update response message
    $("#response_message").text("You voted for the amendment.");
    // disableButtons();
    enableSubmitted();
    //
    // stopVoteSession();
    voted = true;
    // send vote
    sendVote("for");

    return false;
  });

  $("#against").click(function () {
    console.log(tablet + " clicked against");
    // update response message
    $("#response_message").text("You voted against the amendment.");
    disableButtons();
    enableSubmitted();
    //
    // stopVoteSession();
    voted = true;
    // send vote
    sendVote("against");
    return false;
  });

  // hide vote buttons
  // disableButtons();
  // hide response
  disableSubmitted();
  // hide read  reminder
});
