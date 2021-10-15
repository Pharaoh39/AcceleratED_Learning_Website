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
var canvasFunction;

var pages = [];
var currentPage = 0;
var drawings = [];
var textBoxes = [];
var currentLine = {
    color: activeColor,
    points: []
}
changeCanvasFunction("pen");

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
    for (const box of textBoxes){
        box.remove();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// pressing ctrl+z will remove the last drawn element on the page
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'z') {
      if(drawings.length > 0) {
          drawings.pop();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          redrawCanvas(drawings);
          fillTextBoxes(textBoxes);
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
    fillTextBoxes(textBoxes);

    if(e.buttons) {
        if(!lastPoint) {
            lastPoint = {x: e.offsetX, y: e.offsetY};
            return;
        }
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();
    } else {
        if(lastPoint != null) {
            currentLine = {color: activeColor, points: []};
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
    fillTextBoxes(textBoxes);

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
            currentLine = {color: activeColor, points: []};
            lastPoint = {x: e.offsetX, y: e.offsetY};
            currentLine.points.push(lastPoint);
            return;
        }
        // else if continuing current line
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 5;
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
    for(let drawing of page) {
        let lastPoint = null;
        for(let point of drawing.points) {
            if(!lastPoint) {
                lastPoint = point;
            } else {
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(point.x, point.y);
                ctx.strokeStyle = drawing.color;
                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                ctx.stroke();
                lastPoint = point;
            }
        }
    }
}

//Creates text boxes which can be typed into and dragged around
function textBox(e) {
    var beingDragged = false;
    var textBox = document.createElement('textarea');
    textBox.classList.add("textBox");

    textBox.cols = '3';
    textBox.style.position = 'fixed';
    textBox.style.left = (500) + 'px';
    textBox.style.top = (500) + 'px';
    textBox.style.outline = 'none';

    textBox.addEventListener('input', resizeBox); //Change dimensions of text box depending on text

    //Start dragging sequence
    textBox.addEventListener('mousedown', function(e) {
        beingDragged = true;
        lastPoint = {x: e.offsetX, y: e.offsetY};
    }, true);

    //End dragging sequence
    document.addEventListener('mouseup', function() {
        beingDragged = false;
        lastPoint = null;
    }, true);

    //Drag text box
    document.addEventListener('mousemove', function(e) {
        if (beingDragged) {
            textBox.style.left = (e.clientX - lastPoint.x) + 'px';
            textBox.style.top  = (e.clientY - lastPoint.y) + 'px';
        }
    }, true);

    document.body.appendChild(textBox);

    textBox.focus();
    textBoxes.push(textBox);
}

//Draw the contents of the textboxes onto the canvas
function fillTextBoxes(curTextBoxes) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawCanvas(drawings);
    ctx.font="16px monospace";
    ctx.textBaseline = "top";
    for (obj of curTextBoxes) {
        var lineHeight = parseInt(window.getComputedStyle(obj).getPropertyValue('line-height'));
        var borderWidth = parseInt(window.getComputedStyle(obj).getPropertyValue('border-width'));
        var lines = obj.value.split('\n');
        for (var i = 0; i<lines.length; i++) {
            ctx.fillText(lines[i], parseInt(obj.style.left) - canvas.getBoundingClientRect().x + borderWidth, 
            parseInt(obj.style.top) - canvas.getBoundingClientRect().y + borderWidth + i*lineHeight);
        }
    }
}

function resizeBox() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + "px";
    var lines = this.value.split('\n');
    maxCols = Math.max(...lines.map(line => line.length));
    if (this.value.length > 3) {
        this.cols = maxCols;
    }
}

//show all textboxes
function overlay(e) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawCanvas(drawings);
    for (obj of textBoxes) {
        obj.style.display = "inline-block"
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
    pages[currentPage] = {drawings: drawings, textBoxes: textBoxes};
    let numPages = pages.length;
    console.log("test");
    console.log(pages);
    if(currentPage + 1 < numPages) {
        drawings = pages[currentPage + 1].drawings;
        textBoxes = pages[currentPage + 1].textBoxes;
        redrawCanvas(drawings);
        fillTextBoxes(textBoxes);
    } else {
        clearCanvas();
    }
    currentPage += 1;
    document.getElementById("pageCount").textContent = (currentPage+1) + "/" + numPages;
    console.log("test2");
}
 
// loads the previous page if possible
function prevPage() {
    pages[currentPage] = {drawings: drawings, textBoxes: textBoxes};
    let numPages = pages.length;
    if(currentPage - 1 >= 0) {
        drawings = pages[currentPage - 1].drawings;
        textBoxes = pages[currentPage - 1].textBoxes;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        fillTextBoxes(textBoxes);
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

    let borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    let dotDiv = document.createElement("div");
    dotDiv.classList.add("colorDot");
    dotDiv.style.backgroundColor = "grey";
    dotDiv.textContent = "C";
    dotDiv.addEventListener("click", clearCanvas, false);
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("pointer");
    dotDiv.addEventListener("click", pointerMenu, false);
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("line");
    dotDiv.addEventListener("click", lineDraw, false);
    dotDiv.style.backgroundColor = activeColor;
    lineOption = dotDiv;
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    //Add textbox button
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("colorDot");
    dotDiv.style.backgroundColor = "grey";
    dotDiv.textContent = "T";
    dotDiv.addEventListener("click", addTextBox, false);
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    //Add overlay button
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("colorDot");
    dotDiv.style.backgroundColor = "grey";
    dotDiv.textContent = "U";
    dotDiv.addEventListener("click", showOverlay, false);
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);
}

// indicates a menu item is selected by surrounding it by a circle
function menuItemActive(e) {
    activeDot.classList.remove("selectorActive");
    activeDot = e.currentTarget.parentNode;
    activeDot.classList.add("selectorActive");
}

//Check if need to draw textBoxes onto canvas
function changeCanvasFunction(newFunc) {
    if((canvasFunction == 'overlay' || canvasFunction == 'textBox') && (newFunc != 'overlay' || newFunc == 'textBox')){
        fillTextBoxes(textBoxes);
        for (const obj of textBoxes) {
            //Hide text boxes
            obj.style.display = "none"
        }
    }
    canvasFunction = newFunc;
}

// changes the pen color when drawing
function changeDrawColor(e) {
    changeCanvasFunction("pen");
    canvas.style.cursor = "default";
    menuItemActive(e);
    activeColor = e.currentTarget.style.backgroundColor;
    lineOption.style.backgroundColor = activeColor;
}

function pointerMenu(e) {
    changeCanvasFunction("pointer");
    menuItemActive(e);
    canvas.style.cursor = "none";
}

function lineDraw(e) {
    changeCanvasFunction("line");
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function addTextBox(e) {
    changeCanvasFunction("textBox");
    canvas.style.cursor = "default";
    menuItemActive(e);
    textBox();
}

function showOverlay(e) {
    changeCanvasFunction("overlay");
    canvas.style.cursor = "default";
    menuItemActive(e);
    overlay();
}


// some more functions run on setup
populateDrawBar();
window.onmousemove = move;
window.onresize = resize;
resize();
