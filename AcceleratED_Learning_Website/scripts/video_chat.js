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
changeCanvasFunction("pen");
var penSize = 5;
var textLastPoint;

var pages = [];
var currentPage = 1;
var drawings = [];
var textBoxes = [];
var currentLine = {
    type: null,
    color: activeColor,
    lineWidth: penSize,
    points: []
}
var imageData;

// resize the canvas based on the window size and center the whiteboard menu vertically in the canvas
function resize() {
    ctx.canvas.width = canvas.parentElement.clientWidth;
    ctx.canvas.height = canvas.parentElement.clientHeight - 52;
    clearCanvas();
}

// remove all elements from the convas
function clearCanvas() {
    drawings = [];
    for (const box of textBoxes){
        box.remove();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
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
    if(e.target.id != "canvas") return;
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
        case "erase":
            erase(e);
        case "textBox":
            break;
        case "overlay":
            break;
        default:
            pen(e);
    }
}

function line(e) {
    ctx.putImageData(imageData, 0, 0);

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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        fillTextBoxes(textBoxes);
        imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
        lastPoint = null;
    }

}


function rectangle(e) {
    let offsetX, offsetY;
    if(e.buttons) {
        ctx.putImageData(imageData, 0, 0);
        if(!lastPoint) {
            lastPoint = {x: e.offsetX, y: e.offsetY};
            return;
        }
        offsetX = e.offsetX-lastPoint.x
        offsetY = e.offsetY-lastPoint.y;
        if(e.ctrlKey) {
            offsetX <= offsetY ? offsetY = offsetX : offsetX = offsetY;
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
            imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
        }
        lastPoint = null;
    }

}


// lets the user draw an ellipse
function circle(e) {
    let radiusX, radiusY;
    if(e.buttons) {
        ctx.putImageData(imageData, 0, 0);
        if(!lastPoint) {
            lastPoint = {x: e.offsetX, y: e.offsetY};
            return;
        }
        ctx.beginPath();
        radiusX = Math.abs(lastPoint.x - e.offsetX);
        radiusY = Math.abs(lastPoint.y - e.offsetY);
        if(e.ctrlKey) {
            radiusX <= radiusY ? radiusY = radiusX : radiusX = radiusY;
        }
        ctx.ellipse(lastPoint.x, lastPoint.y, radiusX, radiusY, 0, 0, 2*Math.PI);
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
            imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
        }
        lastPoint = null;
    }

}

//creates a pointer by drawing a red dot at the mouse postion, erasing everything, redrawing all the elements, and repeating
var secondLastPoint = null;
function pointer(e) {
    //use snapshot to make canvas
    ctx.putImageData(imageData, 0, 0);

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


// simulates an eraser by drawing with the same color as the canvas background
function erase(e) {

    let eraserSize = penSize*4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawCanvas(drawings);
    redrawLine(currentLine);

    if(e.buttons) {
        // if newline
        if(!lastPoint) {
            drawings.push(currentLine);
            currentLine = {type: "poly", color: "white", lineWidth: penSize*4, points: []};
            lastPoint = {x: e.offsetX, y: e.offsetY};
            currentLine.points.push(lastPoint);
            return;
        }
        // else if continuing current line
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.strokeStyle = "white"/*canvas.style.backgroundColor*/;
        ctx.lineWidth = eraserSize;
        ctx.lineCap = "round";
        ctx.stroke();
        lastPoint = {x: e.offsetX, y: e.offsetY};
        currentLine.points.push(lastPoint);
    } else {
        lastPoint = null;
    }

    ctx.beginPath();
    ctx.arc(e.offsetX, e.offsetY, eraserSize/2+1, 0, 2*Math.PI);
    ctx.strokeStyle = "grey";
    ctx.lineWidth = 1;
    ctx.setLineDash([5,5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
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
            if(object.type == "rect" && withinRectangleBounds(e, object)) {
                selectObjectLayer = i;
                return object;
            } else
            if(object.type == "circle" && withinEllipseBounds(e, object)) {
                selectObjectLayer = i;
                return object;
            } else
            if(object.type == "line" && withinLineBounds(e, object)) {
                selectObjectLayer = i;
                return object;
            }
        }
        //if(!inMotion && !inMotionResize) return null;
    }
}

// Takes the mouse position event and a rectangle object and outputs true if the mouse position is within the ellipse bounds
function withinRectangleBounds({offsetX, offsetY}, {points}) {
    // check within x bounds of the rectangle
    if(points[1].x > 0) {
        if(points[0].x > offsetX || (points[0].x + points[1].x) < offsetX) return false;
    } else {
        if(points[0].x < offsetX || (points[0].x + points[1].x) > offsetX) return false;
    }
    // check within y bounds of the rectangle
    if(points[1].y > 0) {
        if(points[0].y > offsetY || (points[0].y + points[1].y) < offsetY) return false;
    } else {
        if(points[0].y < offsetY || (points[0].y + points[1].y) > offsetY) return false;
    }
    return true;
}

// Takes the mouse position event and an ellipse object and outputs true if the mouse position is within the ellipse bounds
function withinEllipseBounds({offsetX, offsetY}, {points}) {
    let multiplier = Math.pow(points[1].x, 2) * Math.pow(points[1].y, 2);
    let ellipleCalculation = Math.pow(points[1].y, 2) * Math.pow(offsetX - points[0].x, 2) + Math.pow(points[1].x, 2) * Math.pow(offsetY - points[0].y, 2);
    return ellipleCalculation <= multiplier ? true : false;
}

// Takes the mouse position event and an line object and outputs true if the mouse position is within the line bounds
function withinLineBounds({offsetX, offsetY}, {points}) {
    // calculates distance from line
    let tolerance = penSize + 2;
    let distanceFromLine = Math.abs((offsetY - points[1].y)*points[0].x - (offsetX - points[1].x)*points[0].y + offsetX*points[1].y - offsetY*points[1].x) / Math.sqrt(Math.pow((offsetY - points[1].y), 2) + Math.pow((offsetX - points[1].x), 2));
    if(distanceFromLine > tolerance) return false;
    // calculates if between the two points
    let dotProduct = (offsetX - points[0].x) * (points[1].x - points[0].x) + (offsetY - points[0].y) * (points[1].y - points[0].y);
    if(dotProduct < 0) return false;
    let squaredLengthBA = (points[1].x - points[0].x) * (points[1].x - points[0].x) + (points[1].y - points[0].y) * (points[1].y - points[0].y);
    if(dotProduct > squaredLengthBA) return false;
    return true;
}


// Draws the resize nodes on the corners of the rectangle
function drawEditSelectors(selectedObject) {
    
    let origin, offset, editPoints;

    if(selectedObject.type == "circle") {
        origin = {x: selectedObject.points[0].x-selectedObject.points[1].x, y: selectedObject.points[0].y-selectedObject.points[1].y};
        offset = {x: selectedObject.points[1].x*2, y: selectedObject.points[1].y*2};
    } else if(selectedObject.type == "rect") {
        origin = {x: selectedObject.points[0].x, y: selectedObject.points[0].y};
        offset = {x: selectedObject.points[1].x, y: selectedObject.points[1].y};
    } else if(selectObject.type == "line") {
        origin = {x: selectedObject.points[0].x, y: selectedObject.points[0].y};
        offset = {x: selectedObject.points[1].x-selectedObject.points[0].x, y: selectedObject.points[1].y-selectedObject.points[0].y};
    }

    let selectorRadius = 5;
    let borderRadius = selectedObject.lineWidth;
    if(selectObject.type == "line") {
        editPoints = [
            {x: origin.x, y: origin.y},
            {x: origin.x+offset.x, y: origin.y+offset.y},
        ];
    } else {
        editPoints = [
            {x: origin.x, y: origin.y},
            {x: origin.x+offset.x, y: origin.y},
            {x: origin.x+offset.x/2, y: origin.y},
            {x: origin.x, y: origin.y+offset.y},
            {x: origin.x+offset.x, y: origin.y+offset.y},
            {x: origin.x+offset.x/2, y: origin.y+offset.y},
            {x: origin.x, y: origin.y+offset.y/2},
            {x: origin.x+offset.x, y: origin.y+offset.y/2},
        ];
    }
    

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
    
    let origin, offset, editPoints;

    if(selectedObject.type == "circle") {
        origin = {x: selectedObject.points[0].x-selectedObject.points[1].x, y: selectedObject.points[0].y-selectedObject.points[1].y};
        offset = {x: selectedObject.points[1].x*2, y: selectedObject.points[1].y*2};
    } else if(selectedObject.type == "rect") {
        origin = {x: selectedObject.points[0].x, y: selectedObject.points[0].y};
        offset = {x: selectedObject.points[1].x, y: selectedObject.points[1].y};
    } else if(selectObject.type == "line") {
        origin = {x: selectedObject.points[0].x, y: selectedObject.points[0].y};
        offset = {x: Math.abs(selectedObject.points[1].x-selectedObject.points[0].x), y: Math.abs(selectedObject.points[1].y-selectedObject.points[0].y)};
    }

    let selectBound = 8;
    if(selectedObject.type == "line") {
        editPoints = [
            {name: "top-left", cursor: "nwse-resize", x: origin.x, y: origin.y},
            {name: "btm-right", cursor: "nwse-resize", x: origin.x+offset.x, y: origin.y+offset.y},
        ];
    } else {
        editPoints = [
            {name: "top-left", cursor: "nwse-resize", x: origin.x, y: origin.y},
            {name: "top-right", cursor: "nesw-resize", x: origin.x+offset.x, y: origin.y},
            {name: "top-center", cursor: "ns-resize", x: origin.x+offset.x/2, y: origin.y},
            {name: "btm-left", cursor: "nesw-resize", x: origin.x, y: origin.y+offset.y},
            {name: "btm-right", cursor: "nwse-resize", x: origin.x+offset.x, y: origin.y+offset.y},
            {name: "btm-center", cursor: "ns-resize", x: origin.x+offset.x/2, y: origin.y+offset.y},
            {name: "left-center", cursor: "ew-resize", x: origin.x, y: origin.y+offset.y/2},
            {name: "right-center", cursor: "ew-resize", x: origin.x+offset.x, y: origin.y+offset.y/2},
        ];
    }


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
// TODO: should only enter this function if you have button down!
var ctrlPointInUse = null;
var inMotionResize = false;
function resizeRectFromPoint(e, ctrlPoint, selectedObject) {

    if(selectedObject.type == "circle") {
        resizeCircleFromPoint(e, ctrlPoint, selectedObject);
        return;
    } else if(selectedObject.type == "line") {
        resizeLineFromPoint(e, ctrlPoint, selectedObject);
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
                if(e.ctrlKey) {
                    if(offset.y < offset.x) {
                        origin.x = (origin.x + offset.x) - offset.y;
                        offset.x = offset.y;
                    } else {
                        origin.y = (origin.y + offset.y) - offset.x;
                        offset.y = offset.x;
                    }
                }
                break;
            case "top-right":
                offset.x = Math.abs(origin.x - e.offsetX);
                offset.y = (origin.y - e.offsetY) + offset.y;
                origin.y = e.offsetY;
                if(e.ctrlKey) {
                    if(offset.y < offset.x) {
                        offset.x = offset.y;
                    } else {
                        origin.y = (origin.y + offset.y) - offset.x;
                        offset.y = offset.x;
                    }
                }
                break;
            case "top-center":
                offset.y = (origin.y - e.offsetY) + offset.y;
                origin.y = e.offsetY;
                break;
            case "btm-left":
                offset.y = Math.abs(origin.y - e.offsetY);
                offset.x = (origin.x - e.offsetX) + offset.x;
                origin.x = e.offsetX;
                if(e.ctrlKey) {
                    if(offset.y < offset.x) {
                        origin.x = (origin.x + offset.x) - offset.y;
                        offset.x = offset.y;
                    } else {
                        offset.y = offset.x;
                    }
                }
                break;
            case "btm-right":
                offset.x = Math.abs(origin.x - e.offsetX);
                offset.y = Math.abs(origin.y - e.offsetY);
                if(e.ctrlKey) offset.x <= offset.y ? offset.y = offset.x : offset.x = offset.y;
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
        fillTextBoxes(textBoxes);
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
        fillTextBoxes(textBoxes);
        drawEditSelectors(selectedObject);
    } else {
        inMotionResize = false;
    }
}

function resizeLineFromPoint(e, ctrlPoint, selectedObject) {

    let [origin, offset] = selectedObject.points;

    if(e.buttons) {
        if(!inMotionResize) inMotionResize = true;
        switch(ctrlPoint) {
            case "top-left":
                origin.x = e.offsetX;
                origin.y = e.offsetY;
                break;
            case "btm-right":
                offset.x = e.offsetX;
                offset.y = e.offsetY;
                break;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        fillTextBoxes(textBoxes);
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
        let offsetX = selectedObject.points[1].x-selectedObject.points[0].x;
        let offsetY = selectedObject.points[1].y-selectedObject.points[0].y;
        selectedObject.points[0].x = e.offsetX - cursorOffsetFromOrigin.x;
        selectedObject.points[0].y = e.offsetY - cursorOffsetFromOrigin.y;
        if(selectedObject.type == "line") {
            selectedObject.points[1].x = selectedObject.points[0].x + offsetX;
            selectedObject.points[1].y = selectedObject.points[0].y + offsetY;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        fillTextBoxes(textBoxes);
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
    if(selectObject != null) changeIcon(e, selectObject);
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

//Creates text boxes which can be typed into and dragged around
function textBox() {
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
        textLastPoint = {x: e.offsetX, y: e.offsetY};
    }, true);

    //End dragging sequence
    document.addEventListener('mouseup', function() {
        beingDragged = false;
        textLastPoint = null;
    }, true);

    //Drag text box
    document.addEventListener('mousemove', function(e) {
        if (beingDragged) {
            textBox.style.left = (e.clientX - textLastPoint.x) + 'px';
            textBox.style.top  = (e.clientY - textLastPoint.y) + 'px';
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
    for (let obj of curTextBoxes) {
        var lineHeight = parseInt(window.getComputedStyle(obj).getPropertyValue('line-height'));
        var borderWidth = parseInt(window.getComputedStyle(obj).getPropertyValue('border-width'));
        var lines = obj.value.split('\n');
        for (var i = 0; i<lines.length; i++) {
            //reset fillstyle
            ctx.fillStyle = '#000000';
            ctx.fillText(lines[i], parseInt(obj.style.left) - canvas.getBoundingClientRect().x + borderWidth, 
            parseInt(obj.style.top) - canvas.getBoundingClientRect().y + borderWidth + i*lineHeight);
        }
    }
}

function resizeBox() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + "px";
    var lines = this.value.split('\n');
    var maxCols = Math.max(...lines.map(line => line.length));
    if (this.value.length > 3) {
        this.cols = maxCols;
    }
}

//show all textboxes
function overlay() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawCanvas(drawings);
    for (let obj of textBoxes) {
        obj.style.display = "inline-block"
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

/* ---------------------------------------------- */
/* ---------- Javascript for Page menu ---------- */
/* ---------------------------------------------- */

// loads the next page or creates a new page
function nextPage() {
    pages[currentPage - 1] = {drawings: drawings, curTextBoxes: textBoxes};
    let numPages = pages.length;
    if(currentPage + 1 <= numPages) {
        drawings = pages[currentPage].drawings;
        textBoxes = pages[currentPage].curTextBoxes;
        redrawCanvas(drawings);
        fillTextBoxes(textBoxes);
    } else {
        //Manually clear canvas for now instead of clearCanvas() since that function removes textboxes from document
        drawings = [];
        textBoxes = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        numPages += 1;
    }
    currentPage += 1;
    document.getElementById("pageCount").textContent = (currentPage) + "/" + numPages;
}
 
// loads the previous page if possible
function prevPage() {
    pages[currentPage - 1] = {drawings: drawings, curTextBoxes: textBoxes};
    let numPages = pages.length;
    if(currentPage - 1 > 0) {
        drawings = pages[currentPage - 2].drawings;
        textBoxes = pages[currentPage - 2].curTextBoxes;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas(drawings);
        fillTextBoxes(textBoxes);
        currentPage -= 1;
    } else {
        return;
    }
    document.getElementById("pageCount").textContent = (currentPage) + "/" + numPages;
}



/* ---------------------------------------------------- */
/* ---------- Javascript for whiteboard menu ---------- */
/* ---------------------------------------------------- */


const drawColors = ["#4198e9", "#e94b41", "#e9b041", "#44e941", "#b341e9", "#000000"];
const secondaryColors = ["#a3c4e3", "#eba4a0", "#ebd3a4", "#a0ed9f", "#d2a0eb", "#e6e6e6"];

var activeColor = "#4198e9";
var activeSecondaryColor = "#a3c4e3";
var activeDot = null;

const rgb2hex = (rgb) => `#${rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`;

// some more functions run on setup
//populateDrawBar();
window.onmousemove = move;
window.onresize = resize;
resize();


function populateDrawBar2() {

    let buttons = [
        "gg-pen",
        "gg-border-style-solid",
        /*"gg-shape-square",
        "gg-shape-circle",*/
        "colorRect",
        "pointer",
        "gg-arrow-left",
        "pageNumber",
        "gg-arrow-right",
        "sizeDot",
        "text",
        "overlay",
        "gg-controller",
        "gg-erase",
        "gg-trash"
    ];
    let menuBtn, btnContents;

    for(let buttonType of buttons) {

        if(buttonType == "pageNumber") {
            menuBtn = document.createElement("div");
            menuBtn.classList.add("center");
            menuBtn.textContent = "1/1";
            document.getElementById("drawBar").appendChild(menuBtn);
            menuBtn.id = "pageCount";
            continue;
        } else 
        if(buttonType == "text") {
            menuBtn = document.createElement("div");
            menuBtn.classList.add("canvasBtn");
            btnContents = document.createElement("i");
            btnContents.classList.add("center");
            btnContents.textContent = "Tt";
            menuBtn.addEventListener("click", addTextBox, false);
            menuBtn.appendChild(btnContents);
            document.getElementById("drawBar").appendChild(menuBtn);
            continue;
        } if(buttonType == "overlay") {
            menuBtn = document.createElement("div");
            menuBtn.classList.add("canvasBtn");
            btnContents = document.createElement("i");
            btnContents.classList.add("center");
            btnContents.textContent = "Ov";
            menuBtn.addEventListener("click", showOverlay, false);
            menuBtn.appendChild(btnContents);
            document.getElementById("drawBar").appendChild(menuBtn);
            continue;
        } else {
            activeDot = menuBtn;
            menuBtn = document.createElement("div");
            menuBtn.classList.add("canvasBtn");
            btnContents = document.createElement("i");
            btnContents.classList.add(buttonType, "center");
            menuBtn.appendChild(btnContents);
            document.getElementById("drawBar").appendChild(menuBtn);

            switch(buttonType) {
                case "gg-pen":
                    menuBtn.addEventListener("click", enablePen, false);
                    break;
                /*case "gg-shape-square":
                    menuBtn.addEventListener("click", rectangleDraw, false);
                    break;
                case "gg-shape-circle":
                    menuBtn.addEventListener("click", circleDraw, false);
                    break;
                case "gg-border-style-solid":
                    menuBtn.addEventListener("click", lineDraw, false);
                    break;*/
                case "gg-border-style-solid":
                    menuBtn.addEventListener("click", lineDraw/*shapesDropdown*/, false);
                    menuBtn.addEventListener("dblclick", shapesDropdown, false);
                    activeShape = buttonType;
                    activeShapeDiv = menuBtn;
                    break;
                case "colorRect":
                    activeColorDiv = menuBtn;
                    menuBtn.addEventListener("click", colorsDropDown, false);
                    break;
                case "pointer":
                    menuBtn.addEventListener("click", pointerMenu, false);
                    break;
                case "gg-arrow-left":
                    menuBtn.addEventListener("click", goToPrevPage, false);
                    break;
                case "gg-arrow-right":
                    menuBtn.addEventListener("click", goToNextPage, false);
                    break;
                case "gg-controller":
                    menuBtn.addEventListener("click", moveObject, false);
                    break;
                case "gg-trash":
                    menuBtn.addEventListener("click", clearCanvas, false);
                    break;
                case "sizeDot":
                    btnContents.id = "penSize";
                    menuBtn.addEventListener("click", lineSizeMenu, false);
                    break;
                case "gg-erase":
                    menuBtn.addEventListener("click", eraseObjects, false);
                    break;
            }
            
        }
    }
}

function menuItemActive(e) {
    activeDot.classList.remove("canvasBtnActive");
    activeDot = e.currentTarget;
    activeDot.classList.add("canvasBtnActive");
}

//Check if need to draw textBoxes onto canvas
function changeCanvasFunction(newFunc) {
    if((canvasFunction == 'overlay' || canvasFunction == 'textBox') && newFunc != 'overlay'){
        fillTextBoxes(textBoxes);
        for (const obj of textBoxes) {
            //Hide text boxes
            obj.style.display = "none";
        }
    }
    canvasFunction = newFunc;
}

function enablePen(e) {
    changeCanvasFunction("pen");
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function pointerMenu(e) {
    changeCanvasFunction("pointer");
    //take snapshot of current canvas
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    canvas.style.cursor = "none";
    menuItemActive(e);
}

function lineDraw(e) {
    //take snapshot of current canvas
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
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

//Using changeCanvasFunction in case of unfilled textbox
function goToNextPage() {
    changeCanvasFunction("nextPage");
    nextPage();
}

function goToPrevPage() {
    changeCanvasFunction("prevPage");
    prevPage();
}

function rectangleDraw(e) {
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    changeCanvasFunction("rect");
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function circleDraw(e) {
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    changeCanvasFunction("circle");
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function moveObject(e) {
    changeCanvasFunction("move");
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function eraseObjects(e) {
    changeCanvasFunction("erase");
    canvas.style.cursor = "default";
    menuItemActive(e);
}


// TODO: do these event listeners have to be removed later?
let menuList = [];
let activeColorDiv = null;
function colorsDropDown(e) {
    let menuBtn, colorChoice;
    let btn = e.currentTarget;
    let counter = 0;
    if(menuList.length == 0) {
        let info = btn.getBoundingClientRect();
        for(let i = 1; i <= drawColors.length; i++) {
            if(drawColors[i-1] != activeColor) {
                menuBtn = document.createElement("div");
                menuBtn.id = drawColors[i-1];
                menuBtn.classList.add("canvasBtnAbs");
                menuBtn.style.height = info.height + "px";
                menuBtn.style.width = info.width + "px";
                menuBtn.style.top = (info.top - info.height*(counter+1)) + "px";
                menuBtn.style.left = info.left + "px";
                colorChoice = document.createElement("i");
                colorChoice.classList.add("colorRect", "center");
                colorChoice.style.backgroundColor = drawColors[i-1];
                menuBtn.appendChild(colorChoice);
                menuList.push(menuBtn);
                document.getElementById("drawBar").appendChild(menuBtn);
                menuBtn.addEventListener("click", changeColor, false);
                counter++;
            }
        }
    } else {
        for(let element of menuList) {
            element.remove();
        }
        menuList = [];
    }
}

function changeColor(e) {
    let color = e.currentTarget.id;
    activeColor = color;
    activeSecondaryColor = secondaryColors[drawColors.indexOf(activeColor)];
    for(let element of menuList) {
        element.remove();
    }
    menuList = [];
    activeColorDiv.children[0].style.backgroundColor = activeColor;
}

var menuOpen = false;
var popupElement = null;
// TODO: don't have to delete and recreate it, just create it once and hide it!
function lineSizeMenu(e) {

    let btn = e.currentTarget;
    let info = btn.getBoundingClientRect();

    if(!menuOpen) {
        menuOpen = true;
        let sizeChooserPopup = document.createElement("div");
        sizeChooserPopup.classList.add("lineSizePopup");
        sizeChooserPopup.style.height = info.height + "px";
        sizeChooserPopup.style.width = info.width + "px";
        sizeChooserPopup.style.top = (info.top - info.height) + "px";
        sizeChooserPopup.style.left = info.left + "px";

        let decreaseSize = document.createElement("i");
        decreaseSize.classList.add("canvasBtn", "center");
        decreaseSize.textContent = "-";
        decreaseSize.addEventListener("click", decreasePenSize, false);

        let increaseSize = document.createElement("i");
        increaseSize.classList.add("canvasBtn", "center");
        increaseSize.textContent = "+";
        increaseSize.addEventListener("click", increasePenSize, false);

        sizeChooserPopup.appendChild(decreaseSize);
        sizeChooserPopup.appendChild(increaseSize);
        document.getElementById("drawBar").appendChild(sizeChooserPopup);
        popupElement = sizeChooserPopup;
    } else {
        popupElement.remove();
        popupElement = null;
        menuOpen = false;
    }
    
}
function decreasePenSize(e) {
    let min = 2;
    if(penSize > min) {
        penSize -= 2;
    }
    document.getElementById("penSize").style.width = penSize + "px";
    document.getElementById("penSize").style.height = penSize + "px";
}
function increasePenSize(e) {
    let max = 20;
    if(penSize < max) {
        penSize += 2;
    }
    document.getElementById("penSize").style.width = penSize + "px";
    document.getElementById("penSize").style.height = penSize + "px";
}


// TODO: do these event listeners have to be removed later?
let shapesList = ["gg-border-style-solid","gg-shape-square","gg-shape-circle",];
let menuShapeList = [];
let activeShapeDiv = null;
let activeShape = null;
function shapesDropdown(e) {
    let menuBtn, shapeChoice;
    let btn = e.currentTarget;
    let counter = 0;
    if(menuShapeList.length == 0) {
        let info = btn.getBoundingClientRect();
        for(let i = 1; i <= shapesList.length; i++) {
            if(shapesList[i-1] != activeShape) {
                menuBtn = document.createElement("div");
                menuBtn.id = shapesList[i-1];
                menuBtn.classList.add("canvasBtnAbs");
                menuBtn.style.height = info.height + "px";
                menuBtn.style.width = info.width + "px";
                menuBtn.style.top = (info.top - info.height*(counter+1)) + "px";
                menuBtn.style.left = info.left + "px";
                shapeChoice = document.createElement("i");
                shapeChoice.classList.add(shapesList[i-1], "center");
                menuBtn.appendChild(shapeChoice);
                menuShapeList.push(menuBtn);
                document.getElementById("drawBar").appendChild(menuBtn);
                switch(shapesList[i-1]) {
                    case "gg-border-style-solid":
                        menuBtn.addEventListener("click", lineDrawActive, false);
                        break;
                    case "gg-shape-square":
                        menuBtn.addEventListener("click", rectangleDrawActive, false);
                        break;
                    case "gg-shape-circle":
                        menuBtn.addEventListener("click", circleDrawActive, false);
                        break;
                }
                counter++;
            }
        }
    } else {
        for(let element of menuShapeList) {
            element.remove();
        }
        menuShapeList = [];
    }
}

function lineDrawActive(e) {
    //take snapshot of current canvas
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    changeCanvasFunction("line");
    canvas.style.cursor = "default";
    //menuItemActive(e);
    activeShapeDiv.children[0].classList.remove(activeShape);
    activeShape = "gg-border-style-solid";
    activeShapeDiv.children[0].classList.add(activeShape);
    for(let element of menuShapeList) {
        element.remove();
    }
    menuShapeList = [];
    activeShapeDiv.addEventListener("click", lineDraw, false);
}

function rectangleDrawActive(e) {
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    changeCanvasFunction("rect");
    canvas.style.cursor = "default";
    //menuItemActive(e);
    activeShapeDiv.children[0].classList.remove(activeShape);;
    activeShape = "gg-shape-square";
    activeShapeDiv.children[0].classList.add(activeShape);
    for(let element of menuShapeList) {
        element.remove();
    }
    menuShapeList = [];
    activeShapeDiv.addEventListener("click", rectangleDraw, false);
}

function circleDrawActive(e) {
    imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    changeCanvasFunction("circle");
    canvas.style.cursor = "default";
    //menuItemActive(e);
    activeShapeDiv.children[0].classList.remove(activeShape);
    activeShape = "gg-shape-circle";
    activeShapeDiv.children[0].classList.add(activeShape);
    for(let element of menuShapeList) {
        element.remove();
    }
    menuShapeList = [];
    activeShapeDiv.addEventListener("click", circleDraw, false);
}

populateDrawBar2();