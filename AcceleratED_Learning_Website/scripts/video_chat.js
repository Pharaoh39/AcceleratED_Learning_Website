/* -------------------------------------------------- */
/* ---------- Javascript for Video Capture ---------- */
/* -------------------------------------------------- */

// Capture webcam video and display on the screen
var video = document.querySelector("#video_element");
var constraints = {
    video: true,
    audio: false
}

if (navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(function (stream) {
      video.srcObject = stream;
    })
    .catch(function (err0r) {
      console.log("Problem with video");
    });
}

document.getElementById("showCamera").addEventListener("click", showCamera, false);

// the camera toggle does not currently work
function showCamera() {
    if(constraints.video) {
        constraints.video = false;
        document.getElementById("showCamera").textContent = "Show Camera";
        video.applyConstraints(constraints);
    } else {
        constraints.video = true;
        document.getElementById("showCamera").textContent = "Hide Camera";
        video.applyConstraints(constraints);
    }
}



/* ----------------------------------------------- */
/* ---------- Javascript for Whiteboard ---------- */
/* ----------------------------------------------- */

var canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

var lastPoint;
var canvasFunction = "pen";
var penSize = 2;

var pages = [];
var currentPage = 0;
var drawings = [];
var currentLine = {
    color: activeColor,
    lineWidth: penSize,
    points: []
}

// resize the canvas based on the window size and center the whiteboard menu vertically in the canvas
function resize() {
    ctx.canvas.width = canvas.parentElement.clientWidth;
    ctx.canvas.height = canvas.parentElement.clientHeight;
    
    document.getElementById("drawBar").style.top = (canvas.parentElement.clientHeight/2 - document.getElementById("drawBar").clientHeight/2 + 70)+ 'px';
    clearCanvas();
}

// remove all elements from the convas
function clearCanvas() {
    drawings = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// pressing ctrl+z will remove the last drawn element on the page
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'z') {
      if(drawings.length > 0) {
          drawings.pop();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          redrawCanvas(drawings);
      }
    }
});

// function to handle the different functions for the differen whiteboard tools that require a mouse position
function move(e) {
    if(canvasFunction == "pen") {
        pen(e);
    } else if (canvasFunction == "pointer") {
        pointer(e);
    } else if (canvasFunction == "line") {
        line(e);
    }
}

function line(e) {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawCanvas(drawings);

    if(e.buttons) {
        if(!lastPoint) {
            lastPoint = {x: e.offsetX, y: e.offsetY};
            return;
        }
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = "round";
        ctx.stroke();
    } else {
        if(lastPoint != null) {
            //console.log(lastPoint);
            currentLine = {color: activeColor, lineWidth: penSize, points: []};
            currentLine.points.push(lastPoint);
            currentLine.points.push({x: e.offsetX, y: e.offsetY});
            drawings.push(currentLine);
        }
        lastPoint = null;
    }

}

//creates a pointer by drawing a red dot at the mouse postion, erasing everything, redrawing all the elements, and repeating
var secondLastPoint = null;
function pointer(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawCanvas(drawings);

    var grd = ctx.createRadialGradient(e.offsetX, e.offsetY, 1, e.offsetX, e.offsetY, 10);
    grd.addColorStop(0, "red");
    grd.addColorStop(1, "rgba(255, 0, 0, 0)");

    ctx.beginPath();
    ctx.arc(e.offsetX, e.offsetY, 10, 0, 2*Math.PI);
    ctx.fillStyle = grd;
    ctx.fill();

    if(!lastPoint) {
        lastPoint = {x: e.offsetX, y: e.offsetY};
        return;
    }
    if(!secondLastPoint) {
        secondLastPoint = lastPoint;
        lastPoint = {x: e.offsetX, y: e.offsetY};
        return;
    }
    ctx.beginPath();
    ctx.moveTo(secondLastPoint.x, secondLastPoint.y);
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    secondLastPoint = lastPoint;
    lastPoint = {x: e.offsetX, y: e.offsetY};

}

// draws a line using the mouse position and stores the line for later use
function pen(e) {
    if(e.buttons) {
        // if newline
        if(!lastPoint) {
            drawings.push(currentLine);
            currentLine = {color: activeColor, lineWidth: penSize, points: []};
            lastPoint = {x: e.offsetX, y: e.offsetY};
            currentLine.points.push(lastPoint);
            return;
        }
        // else if continuing current line
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = "round";
        ctx.stroke();
        lastPoint = {x: e.offsetX, y: e.offsetY};
        currentLine.points.push(lastPoint);
    } else {
        lastPoint = null;
    }
}

// redraws all lines and shapes stored on the specified page
function redrawCanvas(page) {
    //console.log(page);
    for(let drawing of page) {
        //console.log(drawing);
        let lastPoint = null;
        //console.log(drawing);
        for(let point of drawing.points) {
            if(!lastPoint) {
                lastPoint = point;
            } else {
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(point.x, point.y);
                ctx.strokeStyle = drawing.color;
                //console.log("The color is " + drawing.color);
                ctx.lineWidth = drawing.lineWidth;
                ctx.lineCap = "round";
                ctx.stroke();
                lastPoint = point;
            }
        }
    }
}


/* ---------------------------------------------- */
/* ---------- Javascript for Page menu ---------- */
/* ---------------------------------------------- */

// create event listeners for the page control buttons
document.getElementById("forward").addEventListener("click", nextPage, false);
document.getElementById("backward").addEventListener("click", prevPage, false);

// loads the next page or creates a new page
function nextPage() {
    pages[currentPage] = drawings;
    let numPages = pages.length;
    //console.log(pages);
    if(currentPage + 1 < numPages) {
        drawings = pages[currentPage + 1];
        redrawCanvas(drawings);
    } else {
        clearCanvas();
    }
    currentPage += 1;
    document.getElementById("pageCount").textContent = (currentPage+1) + "/" + numPages;
}

// loads the previous page if possible
function prevPage() {
    pages[currentPage] = drawings;
    let numPages = pages.length;
    if(currentPage - 1 >= 0) {
        drawings = pages[currentPage - 1];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
    } else {
        return;
    }
    currentPage -= 1;
    document.getElementById("pageCount").textContent = (currentPage+1) + "/" + numPages;
}


/* ---------------------------------------------------- */
/* ---------- Javascript for whiteboard menu ---------- */
/* ---------------------------------------------------- */


const drawColors = ["#4198E9", "#E94B41", "#E9B041", "#44E941", "#B341E9"];

var activeColor = "#4198E9";
var activeDot = null;
var lineOption = null;

// create all of the menu elements dynamically
function populateDrawBar() {

    for(let color of drawColors) {
        let borderDiv = document.createElement("div");
        borderDiv.classList.add("selectorIndicator");
        if(activeColor == color) {
            borderDiv.classList.add("selectorActive");
            activeDot = borderDiv;
        }
        let dotDiv = document.createElement("div");
        dotDiv.classList.add("colorDot");
        dotDiv.style.backgroundColor = color;
        dotDiv.addEventListener("click", changeDrawColor,false);
        borderDiv.appendChild(dotDiv);
        var holder = document.getElementById("drawBar");
        holder.appendChild(borderDiv);
    }

    // clear button
    let borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    let dotDiv = document.createElement("div");
    dotDiv.classList.add("colorDot");
    dotDiv.style.backgroundColor = "grey";
    dotDiv.textContent = "C";
    dotDiv.addEventListener("click", clearCanvas, false);
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    // pointer button
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("pointer");
    dotDiv.addEventListener("click", pointerMenu, false);
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    // line button
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("line");
    dotDiv.addEventListener("click", lineDraw, false);
    dotDiv.style.backgroundColor = activeColor;
    lineOption = dotDiv;
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    // line size button
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    borderDiv.classList.add("selectorActive");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("penSize");
    dotDiv.style.backgroundColor = "grey";
    dotDiv.addEventListener("click", lineSize, false);
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);
}

// indicates a menu item is selected by surrounding it by a circle
function menuItemActive(e) {
    activeDot.classList.remove("selectorActive");
    activeDot = e.currentTarget.parentNode;
    activeDot.classList.add("selectorActive");
}

// changes the pen color when drawing
function changeDrawColor(e) {
    canvasFunction = "pen";
    canvas.style.cursor = "default";
    menuItemActive(e);
    activeColor = e.currentTarget.style.backgroundColor;
    lineOption.style.backgroundColor = activeColor;
}

function pointerMenu(e) {
    canvasFunction = "pointer";
    menuItemActive(e);
    canvas.style.cursor = "none";
}

function lineDraw(e) {
    canvasFunction = "line";
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function lineSize(e) {
    let min = 2;
    let max = 20;
    /*let currentPenSize = e.currentTarget.innerWidth;
    console.log(e.currentTarget);
    console.log(currentPenSize);*/
    // cannot seem to get the width of the object from the DOM
    // it would be more accurate to get the current size instead of assuming they will always match up
    if(penSize == max) {
        e.currentTarget.style.width = min + "px";
        e.currentTarget.style.height = min + "px";
        penSize = min;
    } else {
        e.currentTarget.style.width = (penSize + 2) + "px";
        e.currentTarget.style.height = (penSize + 2) + "px";
        penSize = penSize + 1;
    }
}


// some more functions run on setup
populateDrawBar();
window.onmousemove = move;
window.onresize = resize;
resize();
