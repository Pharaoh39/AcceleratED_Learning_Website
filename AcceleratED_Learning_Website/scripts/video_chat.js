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
    type: null,
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
    switch(canvasFunction) {
        case "pen":
            pen(e);
            break;
        case "pointer":
            pointer(e);
            break;
        case "line":
            line(e);
            break;
        case "rect":
            rectangle(e);
            break;
        case "circle":
            circle(e);
            break;
        case "move":
            moveShape2(e);
            break;
        default:
            pen(e);
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
            currentLine = {type: "line", color: activeColor, lineWidth: penSize, points: []};
            currentLine.points.push(lastPoint);
            currentLine.points.push({x: e.offsetX, y: e.offsetY});
            drawings.push(currentLine);
        }
        lastPoint = null;
    }

}


function rectangle(e) {
    let offsetX, offsetY;
    if(e.buttons) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        if(!lastPoint) {
            lastPoint = {x: e.offsetX, y: e.offsetY};
            return;
        }
        offsetX = e.offsetX-lastPoint.x
        offsetY = e.offsetY-lastPoint.y;
        if(e.ctrlKey) {
            offsetX >= offsetY ? offsetY = offsetX : offsetX = offsetY;
        }
        ctx.beginPath();
        ctx.rect(lastPoint.x, lastPoint.y, offsetX, offsetY);
        ctx.strokeStyle = activeColor;
        ctx.fillStyle = activeSecondaryColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = "round";
        ctx.fill();
        ctx.stroke();
    } else {
        if(lastPoint != null) {
            currentLine = {type: "rect", color: activeColor, lineWidth: penSize, points: []};
            currentLine.points.push(lastPoint);
            currentLine.points.push({x: e.offsetX-lastPoint.x, y: e.offsetY-lastPoint.y});
            drawings.push(currentLine);
        }
        lastPoint = null;
    }

}


// lets the user draw an ellipse
function circle(e) {
    let radiusX, radiusY;
    if(e.buttons) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        if(!lastPoint) {
            lastPoint = {x: e.offsetX, y: e.offsetY};
            return;
        }
        ctx.beginPath();
        radiusX = Math.abs(lastPoint.x - e.offsetX);
        radiusY = Math.abs(lastPoint.y - e.offsetY);
        if(e.ctrlKey) {
            radiusX >= radiusY ? radiusY = radiusX : radiusX = radiusY;
        }
        ctx.ellipse(lastPoint.x, lastPoint.y, radiusX, radiusY, 0, 0, 2*Math.PI);
        console.log("draw circle");
        ctx.strokeStyle = activeColor;
        ctx.fillStyle = activeSecondaryColor;
        ctx.lineWidth = penSize;
        ctx.fill();
        ctx.stroke();
    } else {
        if(lastPoint != null) {
            let radiusX = Math.abs(lastPoint.x - e.offsetX);
            let radiusY = Math.abs(lastPoint.y - e.offsetY);
            currentLine = {type: "circle", color: activeColor, lineWidth: penSize, points: []};
            currentLine.points.push(lastPoint);
            currentLine.points.push({x: radiusX, y: radiusY});
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
            currentLine = {type: "poly", color: activeColor, lineWidth: penSize, points: []};
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


/* --------------------------------------------------- */
/* ---------- Functions for Resizing Shapes ---------- */
/* --------------------------------------------------- */
// TODO:
//  - behavior of these functions is not defined for fringe cases
//  - clicking on empty canvas should result in deselection of active shape
//  - ctrl+z of active object may cause errors
//  - selection border should take into account line thickness of the shapes


// Returns with object the user clicks on if they clicked on an object (an ellipse or )
function hasClickedShape(e) {
    if(e.buttons) {
        for(var i = drawings.length - 1; i >= 0; i--) {
            let object = drawings[i];
            if(object.type == "rect") {
                // check within x bounds of the rectangle
                if(object.points[1].x > 0) {
                    if(object.points[0].x > e.offsetX || (object.points[0].x + object.points[1].x) < e.offsetX) continue;
                } else {
                    if(object.points[0].x < e.offsetX || (object.points[0].x + object.points[1].x) > e.offsetX) continue;
                }
                // check within y bounds of the rectangle
                if(object.points[1].y > 0) {
                    if(object.points[0].y > e.offsetY || (object.points[0].y + object.points[1].y) < e.offsetY) continue;
                } else {
                    if(object.points[0].y < e.offsetY || (object.points[0].y + object.points[1].y) > e.offsetY) continue;
                }
                selectObjectLayer = i;
                return object;
            } else
            if(object.type == "circle") {
                let mult = Math.pow(object.points[1].x, 2)*Math.pow(object.points[1].y, 2);
                let ellipseCalculation = Math.pow(object.points[1].y, 2)*Math.pow(e.offsetX - object.points[0].x, 2) + Math.pow(object.points[1].x, 2)*Math.pow(e.offsetY - object.points[0].y, 2);
                if(ellipseCalculation <= mult) {
                    selectObjectLayer = i;
                    return object;
                }
            } else
            if(object.type == "line") {
                continue;
            }
        }
        //if(!inMotion && !inMotionResize) return null;
    }
}


// Draws the resize points on the corners of the rectangle
function drawEditSelectors(selectedObject) {
    
    let origin, offset;

    if(selectedObject.type == "circle") {
        origin = {x: selectedObject.points[0].x-selectedObject.points[1].x, y: selectedObject.points[0].y-selectedObject.points[1].y};
        offset = {x: selectedObject.points[1].x*2, y: selectedObject.points[1].y*2};
    } else if(selectedObject.type == "rect") {
        origin = {x: selectedObject.points[0].x, y: selectedObject.points[0].y};
        offset = {x: selectedObject.points[1].x, y: selectedObject.points[1].y};
    }

    let selectorRadius = 5;
    let borderRadius = selectedObject.lineWidth;
    let editPoints = [
        {x: origin.x, y: origin.y},
        {x: origin.x+offset.x, y: origin.y},
        {x: origin.x+offset.x/2, y: origin.y},
        {x: origin.x, y: origin.y+offset.y},
        {x: origin.x+offset.x, y: origin.y+offset.y},
        {x: origin.x+offset.x/2, y: origin.y+offset.y},
        {x: origin.x, y: origin.y+offset.y/2},
        {x: origin.x+offset.x, y: origin.y+offset.y/2},
    ];

    ctx.strokeStyle = "black";
    ctx.fillStyle = "grey";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.rect(origin.x, origin.y, offset.x, offset.y);
    ctx.stroke();

    for(let node of editPoints) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, selectorRadius, 0, 2*Math.PI);
        ctx.fill();
        ctx.stroke();
    }
}



// Changes the cursor icon depending on where on the rectangle the user hovers
function changeIcon(e, selectedObject) {
    
    let origin, offset;

    if(selectedObject.type == "circle") {
        origin = {x: selectedObject.points[0].x-selectedObject.points[1].x, y: selectedObject.points[0].y-selectedObject.points[1].y};
        offset = {x: selectedObject.points[1].x*2, y: selectedObject.points[1].y*2};
    } else if(selectedObject.type == "rect") {
        origin = {x: selectedObject.points[0].x, y: selectedObject.points[0].y};
        offset = {x: selectedObject.points[1].x, y: selectedObject.points[1].y};
    }

    let selectBound = 8;
    let editPoints = [
        {name: "top-left", cursor: "nwse-resize", x: origin.x, y: origin.y},
        {name: "top-right", cursor: "nesw-resize", x: origin.x+offset.x, y: origin.y},
        {name: "top-center", cursor: "ns-resize", x: origin.x+offset.x/2, y: origin.y},
        {name: "btm-left", cursor: "nesw-resize", x: origin.x, y: origin.y+offset.y},
        {name: "btm-right", cursor: "nwse-resize", x: origin.x+offset.x, y: origin.y+offset.y},
        {name: "btm-center", cursor: "ns-resize", x: origin.x+offset.x/2, y: origin.y+offset.y},
        {name: "left-center", cursor: "ew-resize", x: origin.x, y: origin.y+offset.y/2},
        {name: "right-center", cursor: "ew-resize", x: origin.x+offset.x, y: origin.y+offset.y/2},
    ];

    for(let node of editPoints) {
        let distanceFromNode = Math.ceil(Math.sqrt(Math.pow(e.offsetX-node.x, 2) + Math.pow(e.offsetY-node.y, 2)));
        if(distanceFromNode <= selectBound) {
            canvas.style.cursor = node.cursor;
            ctrlPointInUse = node.name;
            resizeRectFromPoint(e, node.name, selectedObject);
            return;
        }
    }
    if(inMotionResize) {
        resizeRectFromPoint(e, ctrlPointInUse, selectedObject);
        return;
    }

    if(origin.x <= e.offsetX && origin.x+offset.x >= e.offsetX && origin.y <= e.offsetY && origin.y+offset.y >= e.offsetY) {
        canvas.style.cursor = "all-scroll";
        moveShapeToCursor(e, selectedObject);
        return;
    }
    if(inMotion) {
        canvas.style.cursor = "all-scroll";
        moveShapeToCursor(e, selectedObject);
        return;
    }

    canvas.style.cursor = "default";
}


// Resizes the rectangle from one of the control points
var ctrlPointInUse = null;
var inMotionResize = false;
function resizeRectFromPoint(e, ctrlPoint, selectedObject) {

    if(selectedObject.type == "circle") {
        resizeCircleFromPoint(e, ctrlPoint, selectedObject);
        return;
    }

    const [origin, offset] = selectedObject.points;

    if(e.buttons) {
        if(!inMotionResize) inMotionResize = true;
        switch(ctrlPoint) {
            case "top-left":
                offset.x = (origin.x - e.offsetX) + offset.x;
                offset.y = (origin.y - e.offsetY) + offset.y;
                origin.x = e.offsetX;
                origin.y = e.offsetY;
                break;
            case "top-right":
                offset.x = Math.abs(origin.x - e.offsetX);
                offset.y = (origin.y - e.offsetY) + offset.y;
                origin.y = e.offsetY;
                break;
            case "top-center":
                offset.y = (origin.y - e.offsetY) + offset.y;
                origin.y = e.offsetY;
                break;
            case "btm-left":
                offset.y = Math.abs(origin.y - e.offsetY);
                offset.x = (origin.x - e.offsetX) + offset.x;
                origin.x = e.offsetX;
                break;
            case "btm-right":
                offset.x = Math.abs(origin.x - e.offsetX);
                offset.y = Math.abs(origin.y - e.offsetY);
                break;
            case "btm-center":
                offset.y = Math.abs(origin.y - e.offsetY);
                break;
            case "left-center":
                offset.x = (origin.x - e.offsetX) + offset.x;
                origin.x = e.offsetX;
                break;
            case "right-center":
                offset.x = Math.abs(origin.x - e.offsetX);
                break;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        drawEditSelectors(selectedObject);
    } else {
        inMotionResize = false;
    }
}

// resizes the ellipse from one of the control points
function resizeCircleFromPoint(e, ctrlPoint, selectedObject) {

    const [origin, offset] = selectedObject.points;

    if(e.buttons) {
        if(!inMotionResize) inMotionResize = true;
        switch(ctrlPoint) {
            case "top-left":
            case "top-right":
            case "btm-left":
            case "btm-right":
                offset.x = Math.abs(origin.x - e.offsetX);
                offset.y = Math.abs(origin.y - e.offsetY);
                break;
            case "top-center":
            case "btm-center":
                offset.y = Math.abs(origin.y - e.offsetY);
                break;
            case "left-center":
            case "right-center":
                offset.x = Math.abs(origin.x - e.offsetX);
                break;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        drawEditSelectors(selectedObject);
    } else {
        inMotionResize = false;
    }
}


// Moves the selected shape to the cursor
var cursorOffsetFromOrigin = null;
var inMotion = false;
function moveShapeToCursor(e, selectedObject) {

    if(e.buttons) {
        if(cursorOffsetFromOrigin == null) {
            cursorOffsetFromOrigin = {x: e.offsetX-selectedObject.points[0].x, y: e.offsetY-selectedObject.points[0].y};
            inMotion = true;
            return;
        }
        selectedObject.points[0].x = e.offsetX - cursorOffsetFromOrigin.x;
        selectedObject.points[0].y = e.offsetY - cursorOffsetFromOrigin.y;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        drawEditSelectors(selectedObject);
    } else {
        cursorOffsetFromOrigin = null;
        inMotion = false;
    }
}


var selectObjectLayer = null;
var prevObjectLayer = null;
var selectObject = null;
function moveShape2(e) {
    var newSelect = true;
    var selectedObject = hasClickedShape(e);
    if((selectObject == null || prevObjectLayer != selectObjectLayer) && !inMotion && !inMotionResize) {
        prevObjectLayer = selectObjectLayer;
        selectObject = selectedObject;
    }
    changeIcon(e, selectObject);
}


// redraws all lines and shapes stored on the specified page
function redrawCanvas(page) {
    //console.log(page);
    for(let drawing of page) {
        if(drawing.type == "line" || drawing.type == "poly") {
            redrawLine(drawing);
        } else if(drawing.type == "rect") {
            redrawRect(drawing);
        } else if (drawing.type == "circle") {
            redrawCircle(drawing);
        }
    }
}


function redrawLine(drawing) {
    let lastPoint = null;
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


function redrawRect(drawing) {
    ctx.beginPath();
    ctx.rect(drawing.points[0].x, drawing.points[0].y, drawing.points[1].x, drawing.points[1].y);
    ctx.strokeStyle = drawing.color;
    // HACK: bad workaround
    try {
        ctx.fillStyle = secondaryColors[drawColors.indexOf(rgb2hex(drawing.color))];
    } catch {
        ctx.fillStyle = secondaryColors[drawColors.indexOf(drawing.color)];
    }
    ctx.lineWidth = drawing.lineWidth;
    ctx.fill();
    ctx.stroke();
}

function redrawCircle(drawing) {
    ctx.beginPath();
    //let radius = Math.sqrt(Math.pow(drawing.points[1].x, 2) + Math.pow(drawing.points[1].y, 2));
    let radiusX = drawing.points[1].x;
    let radiusY = drawing.points[1].y;
    ctx.ellipse(drawing.points[0].x, drawing.points[0].y, radiusX, radiusY, 0, 0, 2*Math.PI);
    ctx.strokeStyle = drawing.color;
    // HACK: bad workaround
    try {
        ctx.fillStyle = secondaryColors[drawColors.indexOf(rgb2hex(drawing.color))];
    } catch {
        ctx.fillStyle = secondaryColors[drawColors.indexOf(drawing.color)];
    }
    ctx.lineWidth = drawing.lineWidth;
    ctx.fill();
    ctx.stroke();
}

/* --------------------------------------------------- */
/* ---------- Advanced eraser functionality ---------- */
/* --------------------------------------------------- */





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


const drawColors = ["#4198e9", "#e94b41", "#e9b041", "#44e941", "#b341e9"];
const secondaryColors = ["#a3c4e3", "#eba4a0", "#ebd3a4", "#a0ed9f", "#d2a0eb"];

var activeColor = "#4198e9";
var activeSecondaryColor = "#a3c4e3";
var activeDot = null;
var lineOption = null;
var squareOption = null;
var circleOption = null;

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

    // rectangle button
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("rectangle");
    dotDiv.addEventListener("click", rectangleDraw, false);
    squareOption = dotDiv;
    borderDiv.appendChild(dotDiv);
    document.getElementById("drawBar").appendChild(borderDiv);

    // circle button
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("circle");
    dotDiv.addEventListener("click", circleDraw, false);
    circleOption = dotDiv;
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

    // move/edit button
    // this button functionality should be updated to the other buttons in the future
    borderDiv = document.createElement("div");
    borderDiv.classList.add("selectorIndicator");
    dotDiv = document.createElement("div");
    dotDiv.classList.add("colorDot");
    dotDiv.style.backgroundColor = "grey";
    dotDiv.textContent = "M";
    dotDiv.addEventListener("click", moveObject, false);
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
    activeSecondaryColor = secondaryColors[drawColors.indexOf(rgb2hex(activeColor))];
    lineOption.style.backgroundColor = activeColor;
    squareOption.style.borderColor = activeColor;
    squareOption.style.backgroundColor = activeSecondaryColor;
    circleOption.style.borderColor = activeColor;
    circleOption.style.backgroundColor = activeSecondaryColor;
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

function rectangleDraw(e) {
    canvasFunction = "rect";
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function circleDraw(e) {
    canvasFunction = "circle";
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function moveObject(e) {
    canvasFunction = "move";
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

const rgb2hex = (rgb) => `#${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`;

// some more functions run on setup
populateDrawBar();
window.onmousemove = move;
window.onresize = resize;
resize();
