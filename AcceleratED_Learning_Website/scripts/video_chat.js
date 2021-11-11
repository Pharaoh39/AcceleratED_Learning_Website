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

let wb = new Whiteboard("canvas");
wb.activeColor = "#4198e9";
wb.activeSecondaryColor = "#a3c4e3";

// resize the canvas based on the window size and center the whiteboard menu vertically in the canvas
function resize() {
    wb.resize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight - 52);
}

// pressing ctrl+z will remove the last drawn element on the page
// TODO: Should be handled whithin the whiteboard object
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'z') {
      if(drawings.length > 0) {
          drawings.pop();
          wb.hardRefresh();
      }
    }
});

// pressing delete or backspace will delete the selected shape is possible
// TODO: should be handled whitin the whiteboard object
document.addEventListener('keydown', function(event) {
    if (event.key == "Backspace" || event.key == "Delete") {
      if (selectObject != null) {
          for(let i = 0; i < drawings.length; i++) {
              const drawing = drawings[i];
              if(selectObject == drawing) {
                  drawings.splice(i,1);
                  break;
              }
          }
          wb.hardRefresh();
      }
    }
});

// function to handle the different functions for the differen whiteboard tools that require a mouse position
function move(e) {
    if(e.target.id != "canvas") return;
    switch(wb.canvasFunction) {
        case "pen":
            wb.pen(e);
            break;
        case "pointer":
            wb.pointer(e);
            break;
        case "line":
            wb.line(e);
            break;
        case "rect":
            wb.rectangle(e);
            break;
        case "circle":
            wb.circle(e);
            break;
        case "move":
            wb.moveShape(e);
            break;
        case "erase":
            wb.erase(e);
        case "textBox":
            break;
        case "overlay":
            break;
        default:
            wb.pen(e);
    }
}

/* --------------------------------------- */
/* ---------- Whiteboard Object ---------- */
/* --------------------------------------- */

// Time to create a new whiteboard
function Whiteboard(canvasId) {
    // store the canvas information
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    // store the pages information
    this.currentPage = 1;
    this.pages = [{drawings: [], curTextBoxes: []}];
    this.imageData;
    // Store the current operation information
    this.currentLine = null;
    this.drawingNewShape = false;
    this.textLastPoint;
    this.canvasFunction;
    this.lastPoint;
    this.secondLastPoint;
    // store the object selection information
    this.selectObejctLayer;
    this.prevObjectLayer;
    this.selectObject;
    // store the object movement and resizing information
    this.inMotion;
    this.cursorOffsetFromOrigin;
    this.ctrlPointInUse;
    this.inMotionResize = false;
    // store th active style infomation
    this.penSize = 2;
    this.activeColor;
    this.activeSecondaryColor;
    this.fillShapes = true;
}

// Returns the current array of drawings
Whiteboard.prototype.drawings = function() { return this.pages[this.currentPage-1].drawings }

// Returns the current array of textboxes
Whiteboard.prototype.textBoxes = function() { return this.pages[this.currentPage-1].curTextBoxes }

// Loads the next page or creates a new page
Whiteboard.prototype.nextPage = function(counterId) {
    // TODO: mabye should save image data after new page loads
    let numPages = this.pages.length;
    this.currentPage += 1;
    if(this.currentPage <= numPages) {
        this.hardRefresh();
    } else {
        this.pages.push({drawings: [], curTextBoxes: []});
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        numPages += 1;
    }
    if(counterId) document.getElementById(counterId).textContent = (this.currentPage) + "/" + numPages;
}

// Loads the previous page if possible
Whiteboard.prototype.prevPage = function(counterId) {
    // TODO: mabye should save image data after new page loads
    let numPages = this.pages.length;
    if(this.currentPage - 1 > 0) {
        this.currentPage -= 1;
        this.hardRefresh();
    } else {
        return;
    }
    if(counterId) document.getElementById(counterId).textContent = (this.currentPage) + "/" + numPages;
}

// refreshes the screen by redrawing all items
Whiteboard.prototype.hardRefresh = function() {
    // TODO: this function contains references to objects and functions outside of the object
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.drawAllDrawings(this.drawings());
    fillTextBoxes(this.textBoxes());
}

// resizes the canvas size on the page
Whiteboard.prototype.resize = function(width, height) {
    // TODO: probably should capture new image data when the data scaling is implemented
    this.ctx.canvas.width = width;
    this.ctx.canvas.height = height;
    this.clear();
}

// Removes all drawings from the current page
Whiteboard.prototype.clear = function() {
    let drawings = this.drawings() 
    drawings = [];
    for (const box of this.textBoxes()){
        box.remove();
    }
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.imageData = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
}

// Draws all of the drawings on the current page
Whiteboard.prototype.drawAllDrawings = function () {
    for(let drawing of this.drawings()) {
        // TODO: integrate for undo/redo objects
        drawing.draw(this);
    }
}

// Draws a line using the mouse position and stores the line for later use
Whiteboard.prototype.pen = function (e) {
    if(e.buttons) {
        // if newline
        if(!this.drawingNewShape) {
            this.currentLine = new Polyline(this.activeColor, this.penSize, []);
            this.lastPoint = {x: e.offsetX, y: e.offsetY};
            this.currentLine.points.push(this.lastPoint);
            this.drawingNewShape = true;
            return;
        }
        this.lastPoint = {x: e.offsetX, y: e.offsetY};
        this.currentLine.points.push(this.lastPoint);
        this.currentLine.draw(this);
    } else {
        if(this.currentLine != null) {
            this.drawingNewShape = false;
            this.drawings().push(this.currentLine);
            this.imageData = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
        }
        this.currentLine = null;
    }
}

// This function is called while the user is drawing the line
Whiteboard.prototype.line = function (e) {
    if(e.buttons) {
        if(!this.drawingNewShape) {
            this.currentLine = new Line(this.activeColor, this.penSize, {x: e.offsetX, y: e.offsetY}, null);
            this.drawingNewShape = true;
            return;
        }
        this.ctx.putImageData(this.imageData, 0, 0);
        if(e.ctrlKey) {
            let altitude = angle(this.currentLine.origin.x, this.currentLine.origin.y, e.offsetX, e.offsetY);
            if(Math.abs(altitude) < snapAngle || Math.abs((Math.abs(altitude) - 180)) < snapAngle) {
                this.currentLine.offset = {x: e.offsetX, y: this.currentLine.origin.y};
            } else
            if(Math.abs(Math.abs(altitude) - 90) < snapAngle) {
                this.currentLine.offset = {x: this.currentLine.origin.x, y: e.offsetY};
            } else {
                this.currentLine.offset = {x: e.offsetX, y: e.offsetY};
            }
        } else {
            this.currentLine.offset = {x: e.offsetX, y: e.offsetY};
        }
        this.currentLine.draw(this);
    } else {
        if(this.currentLine != null) {
            this.drawingNewShape = false;
            this.drawings().push(this.currentLine);
            this.imageData = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
        }
        this.currentLine = null;
    }
}

// This function is called while the user is drawing the rectangle
Whiteboard.prototype.rectangle = function (e) {
    // TODO: make fill variable into object
    let offsetX, offsetY;
    if(e.buttons) {
        this.ctx.putImageData(this.imageData, 0, 0);
        if(!this.lastPoint) {
            this.lastPoint = {x: e.offsetX, y: e.offsetY};
            return;
        }
        offsetX = e.offsetX-this.lastPoint.x
        offsetY = e.offsetY-this.lastPoint.y;
        if(e.ctrlKey) {
            offsetX <= offsetY ? offsetY = offsetX : offsetX = offsetY;
        }
        this.ctx.beginPath();
        this.ctx.rect(this.lastPoint.x, this.lastPoint.y, offsetX, offsetY);
        this.ctx.strokeStyle = this.activeColor;
        if(this.fillShapes) {
            this.ctx.fillStyle = this.activeSecondaryColor;
            this.ctx.fill();
        }
        this.ctx.lineWidth = this.penSize;
        this.ctx.lineCap = "round";
        this.ctx.stroke();
    } else {
        if(this.lastPoint != null) {
            let newRectObject = new Rectangle(this.activeColor, this.fillShapes, this.penSize, this.lastPoint, {x: e.offsetX-this.lastPoint.x, y: e.offsetY-this.lastPoint.y});
            this.drawings().push(newRectObject);
            this.imageData = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
        }
        this.lastPoint = null;
    }

}

// This function is called while the user is drawing the ellipse
Whiteboard.prototype.circle = function (e) {
    if(e.buttons) {
        if(!this.drawingNewShape) {
            this.currentLine = new Ellipse(this.activeColor, this.fillShapes, this.penSize, {x: e.offsetX, y: e.offsetY}, null);
            this.drawingNewShape = true;
            return;
        }
        this.ctx.putImageData(this.imageData, 0, 0);
        let radiusX = Math.abs(this.currentLine.origin.x - e.offsetX);
        let radiusY = Math.abs(this.currentLine.origin.y - e.offsetY);
        if(e.ctrlKey) {
            radiusX <= radiusY ? radiusY = radiusX : radiusX = radiusY;
        }
        this.currentLine.radius = {x: radiusX, y: radiusY};
        this.currentLine.draw(this);
    } else {
        if(this.currentLine != null) {
            this.drawingNewShape = false;
            this.drawings().push(this.currentLine);
            this.imageData = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
        }
        this.currentLine = null;
    }
}

// Creates a pointer by drawing a red dot at the mouse postion and drawing a tail
Whiteboard.prototype.pointer = function (e) {
    //use snapshot to make canvas
    this.ctx.putImageData(this.imageData, 0, 0);

    var grd = this.ctx.createRadialGradient(e.offsetX, e.offsetY, 1, e.offsetX, e.offsetY, 10);
    grd.addColorStop(0, "red");
    grd.addColorStop(1, "rgba(255, 0, 0, 0)");

    this.ctx.beginPath();
    this.ctx.arc(e.offsetX, e.offsetY, 10, 0, 2*Math.PI);
    this.ctx.fillStyle = grd;
    this.ctx.fill();

    if(!this.lastPoint) {
        this.lastPoint = {x: e.offsetX, y: e.offsetY};
        return;
    }
    if(!this.secondLastPoint) {
        this.secondLastPoint = this.lastPoint;
        this.lastPoint = {x: e.offsetX, y: e.offsetY};
        return;
    }
    this.ctx.beginPath();
    this.ctx.moveTo(this.secondLastPoint.x, this.secondLastPoint.y);
    this.ctx.lineTo(this.lastPoint.x, this.lastPoint.y);
    this.ctx.lineTo(e.offsetX, e.offsetY);
    this.ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = "round";
    this.ctx.stroke();
    this.secondLastPoint = this.lastPoint;
    this.lastPoint = {x: e.offsetX, y: e.offsetY};
    
}

// simulates an eraser by drawing with the same color as the canvas background
Whiteboard.prototype.erase = function (e) {

    let eraserSize = this.penSize*4;

    this.hardRefresh();

    if(e.buttons) {
        // if newline
        if(!this.drawingNewShape) {
            this.currentLine = new Polyline("white", eraserSize, []);
            this.lastPoint = {x: e.offsetX, y: e.offsetY};
            this.currentLine.points.push(this.lastPoint);
            this.drawingNewShape = true;
            return;
        }
        this.lastPoint = {x: e.offsetX, y: e.offsetY};
        this.currentLine.points.push(this.lastPoint);
        this.currentLine.draw(this);
    } else {
        if(this.currentLine != null) {
            this.drawingNewShape = false;
            this.drawings().push(this.currentLine);
            this.imageData = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height);
        }
        this.currentLine = null;
    }

    this.ctx.beginPath();
    this.ctx.arc(e.offsetX, e.offsetY, eraserSize/2+1, 0, 2*Math.PI);
    this.ctx.strokeStyle = "grey";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5,5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
}

/* --------------------------------------------------- */
/* ---------- Functions for Resizing Shapes ---------- */
/* --------------------------------------------------- */
// TODO:
//  - behavior of these functions is not defined for fringe cases
//  - clicking on empty canvas should result in deselection of active shape
//  - ctrl+z of active object may cause errors
//  - selection border should take into account line thickness of the shapes


// Returns with topmost object the user clicks on if they clicked on an object
Whiteboard.prototype.clickedShape = function ({x, y}) {
    for(var i = this.drawings().length - 1; i >= 0; i--) {
        let object = this.drawings()[i];
        if(object.isWithin({x: x, y: y})) {
            this.selectObjectLayer = i;
            return object;
        }
    }
}

// Changes the cursor icon depending on where on the rectangle the user hovers
Whiteboard.prototype.changeIcon = function (e, selectedObject) {
    
    let origin, offset, editPoints;

    if(selectedObject.constructor.name == "Ellipse") {
        origin = {x: selectedObject.origin.x-selectedObject.radius.x, y: selectedObject.origin.y-selectedObject.radius.y};
        offset = {x: selectedObject.radius.x*2, y: selectedObject.radius.y*2};
    } else if(selectedObject.constructor.name == "Rectangle") {
        origin = {x: selectedObject.origin.x, y: selectedObject.origin.y};
        offset = {x: selectedObject.offset.x, y: selectedObject.offset.y};
    } else if(selectedObject.constructor.name == "Line") {
        origin = {x: selectedObject.origin.x, y: selectedObject.origin.y};
        offset = {x: Math.abs(selectedObject.offset.x-selectedObject.origin.x), y: Math.abs(selectedObject.offset.y-selectedObject.origin.y)};
    }

    let selectBound = 8;
    if(selectedObject.constructor.name == "Line") {
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
            this.canvas.style.cursor = node.cursor;
            this.ctrlPointInUse = node.name;
            this.resizeRectFromPoint(e, node.name, selectedObject);
            return;
        }
    }
    if(this.inMotionResize) {
        this.resizeRectFromPoint(e, this.ctrlPointInUse, selectedObject);
        return;
    }

    if(origin.x <= e.offsetX && origin.x+offset.x >= e.offsetX && origin.y <= e.offsetY && origin.y+offset.y >= e.offsetY) {
        this.canvas.style.cursor = "all-scroll";
        this.moveShapeToCursor(e, selectedObject);
        return;
    }
    if(this.inMotion) {
        this.canvas.style.cursor = "all-scroll";
        this.moveShapeToCursor(e, selectedObject);
        return;
    }

    this.canvas.style.cursor = "default";
}

// Resizes the rectangle from one of the control points
// TODO: should only enter this function if you have button down!
Whiteboard.prototype.resizeRectFromPoint = function (e, ctrlPoint, selectedObject) {

    if(selectedObject.constructor.name == "Ellipse") {
        this.resizeCircleFromPoint(e, ctrlPoint, selectedObject);
        return;
    } else if(selectedObject.constructor.name == "Line") {
        this.resizeLineFromPoint(e, ctrlPoint, selectedObject);
        return;
    }

    const origin = selectedObject.origin;
    const offset = selectedObject.offset;

    if(e.buttons) {
        if(!this.inMotionResize) this.inMotionResize = true;
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
        this.hardRefresh();
        selectedObject.drawEditSelectors(this);
    } else {
        this.inMotionResize = false;
    }
}

// resizes the ellipse from one of the control points
Whiteboard.prototype.resizeCircleFromPoint = function (e, ctrlPoint, selectedObject) {

    const origin = selectedObject.origin;
    const offset = selectedObject.radius;

    if(e.buttons) {
        if(!this.inMotionResize) this.inMotionResize = true;
        switch(ctrlPoint) {
            case "top-left":
            case "top-right":
            case "btm-left":
            case "btm-right":
                offset.x = Math.abs(origin.x - e.offsetX);
                offset.y = Math.abs(origin.y - e.offsetY);
                if(e.ctrlKey) {
                    offset.x <= offset.y ? offset.y = offset.x : offset.x = offset.y;
                }
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
        this.hardRefresh();
        selectedObject.drawEditSelectors(this);
    } else {
        this.inMotionResize = false;
    }
}

// resizes the line from one of the control points
Whiteboard.prototype.resizeLineFromPoint = function (e, ctrlPoint, selectedObject) {

    const origin = selectedObject.origin;
    const offset = selectedObject.offset;

    if(e.buttons) {
        if(!this.inMotionResize) this.inMotionResize = true;
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
        this.hardRefresh();
        selectedObject.drawEditSelectors(this);
    } else {
        this.inMotionResize = false;
    }
}

// Moves the selected shape to the cursor
Whiteboard.prototype.moveShapeToCursor = function(e, selectedObject) {

    if(e.buttons) {
        if(this.cursorOffsetFromOrigin == null) {
            this.cursorOffsetFromOrigin = {x: e.offsetX-selectedObject.origin.x, y: e.offsetY-selectedObject.origin.y};
            this.inMotion = true;
            return;
        }
        let offsetX, offsetY;
        if(selectedObject.constructor.name == "Rectangle") {
            offsetX = selectedObject.offset.x-selectedObject.origin.x;
            offsetY = selectedObject.offset.y-selectedObject.origin.y;
            selectedObject.origin.x = e.offsetX - this.cursorOffsetFromOrigin.x;
            selectedObject.origin.y = e.offsetY - this.cursorOffsetFromOrigin.y;
        } else
        if(selectedObject.constructor.name == "Ellipse") {
            offsetX = selectedObject.radius.x-selectedObject.origin.x;
            offsetY = selectedObject.radius.y-selectedObject.origin.y;
            selectedObject.origin.x = e.offsetX - this.cursorOffsetFromOrigin.x;
            selectedObject.origin.y = e.offsetY - this.cursorOffsetFromOrigin.y;
        } else
        if(selectedObject.constructor.name == "Line") {
            offsetX = selectedObject.offset.x-selectedObject.origin.x;
            offsetY = selectedObject.offset.y-selectedObject.origin.y;
            selectedObject.origin.x = e.offsetX - this.cursorOffsetFromOrigin.x;
            selectedObject.origin.y = e.offsetY - this.cursorOffsetFromOrigin.y;
            selectedObject.offset.x = selectedObject.origin.x + offsetX;
            selectedObject.offset.y = selectedObject.origin.y + offsetY;
        }
        this.hardRefresh();
        selectedObject.drawEditSelectors(this);
    } else {
        this.cursorOffsetFromOrigin = null;
        this.inMotion = false;
    }
}

// Determines what happens when the user tries to modiy a shape
Whiteboard.prototype.moveShape = function(e) {
    if(e.buttons) {
        var selectedObject = this.clickedShape({x: e.offsetX, y: e.offsetY});
    }
    if((this.selectObject == null || this.prevObjectLayer != this.selectObjectLayer) && !this.inMotion && !this.inMotionResize) {
        this.prevObjectLayer = this.selectObjectLayer;
        this.selectObject = selectedObject;
    }
    if(this.selectObject != null) this.changeIcon(e, this.selectObject);
}

/* -------------------------------------- */
/* ---------- Poly Line Object ---------- */
/* -------------------------------------- */

// Time to create a polyline object!
function Polyline(color, lineWidth, points) {
    this.color = color;
    this.lineWidth = lineWidth;
    this.points = points;
}

// Draws the line on the canvas
Polyline.prototype.draw = function(wbl) {
    let prevPoint = null;
    for(let point of this.points) {
        if(!prevPoint) {
            prevPoint = point;
        } else {
            wbl.ctx.beginPath();
            wbl.ctx.moveTo(prevPoint.x, prevPoint.y);
            wbl.ctx.lineTo(point.x, point.y);
            wbl.ctx.strokeStyle = this.color;
            wbl.ctx.lineWidth = this.lineWidth;
            wbl.ctx.lineCap = "round";
            wbl.ctx.stroke();
            prevPoint = point;
        }
    }
}

/* ------------------------------------------ */
/* ---------- Straight Line Object ---------- */
/* ------------------------------------------ */

// Time to create a line object!
function Line(color, lineWidth, origin, offset) {
    this.color = color;
    this.lineWidth = lineWidth;
    this.origin = origin;
    this.offset = offset;
}

// Checks if the given point is on the line
Line.prototype.isWithin = function({x, y}) {
    let tolerance = this.lineWidth + 2;
    // calculate perpendicular distance from line
    let distanceFromLine = Math.abs((y - this.offset.y)*this.origin.x - (x - this.offset.x)*this.origin.y + x*this.offset.y - y*this.offset.x) / Math.sqrt(Math.pow((y - this.offset.y), 2) + Math.pow((x - this.offset.x), 2));
    if(distanceFromLine > tolerance) return false;
    // calculates if the point is between the the endpoints
    let dotProduct = (x - this.origin.x) * (this.offset.x - this.origin.x) + (y - this.origin.y) * (this.offset.y - this.origin.y);
    if(dotProduct < 0) return false;
    let squaredLengthBA = (this.offset.x - this.origin.x) * (this.offset.x - this.origin.x) + (this.offset.y - this.origin.y) * (this.offset.y - this.origin.y);
    if(dotProduct > squaredLengthBA) return false;
    return true;
}

// Draws the line on the canvas
Line.prototype.draw = function(wbl) {
    wbl.ctx.beginPath();
    wbl.ctx.moveTo(this.origin.x, this.origin.y);
    wbl.ctx.lineTo(this.offset.x, this.offset.y);
    wbl.ctx.strokeStyle = this.color;
    wbl.ctx.lineWidth = this.lineWidth;
    wbl.ctx.lineCap = "round";
    wbl.ctx.stroke();
}

// Draws the control points and rectangle around the line to indicate it is selected
Line.prototype.drawEditSelectors = function (wbl) {

    let selectorRadius = 5;
    let editPoints = [
        {x: this.origin.x, y: this.origin.y},
        {x: this.offset.x, y: this.offset.y},
    ];

    wbl.ctx.strokeStyle = "black";
    wbl.ctx.fillStyle = "grey";
    wbl.ctx.lineWidth = 1;

    wbl.ctx.beginPath();
    wbl.ctx.rect(this.origin.x, this.origin.y, this.offset.x-this.origin.x, this.offset.y-this.origin.y);
    wbl.ctx.stroke();

    for(let node of editPoints) {
        wbl.ctx.beginPath();
        wbl.ctx.arc(node.x, node.y, selectorRadius, 0, 2*Math.PI);
        wbl.ctx.fill();
        wbl.ctx.stroke();
    }
}

// https://stackoverflow.com/questions/9614109/how-to-calculate-an-angle-from-points
function angle(cx, cy, ex, ey) {
    var dy = ey - cy;
    var dx = ex - cx;
    var theta = Math.atan2(dy, dx); // range (-PI, PI]
    theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
    //if (theta < 0) theta = 360 + theta; // range [0, 360)
    return theta;
  }

/* -------------------------------------- */
/* ---------- Rectangle Object ---------- */
/* -------------------------------------- */


// Time to create a rectangle object!
function Rectangle(color, fill, lineWidth, origin, offset) {
    this.color = color;
    this.fill = fill;
    this.lineWidth = lineWidth;
    this.origin = origin;
    this.offset = offset;
}

// Checks if the given point is within the rectangle
Rectangle.prototype.isWithin = function ({x, y}) {
    // Check if within x bounds of the rectangle
    if(this.offset.x > 0 && this.origin.x < x && (this.origin.x + this.offset.x) > x) return true;
    if(this.offset.x > 0 && this.origin.x < x && (this.origin.x + this.offset.x) > x) return true;
    // Check if within y bounds of the rectangle
    if(this.offset.y > 0 && this.origin.y < y && (this.origin.y + this.offset.y) > y) return true;
    if(this.offset.y > 0 && this.origin.y < y && (this.origin.y + this.offset.y) > y) return true;
    // Else
    return false;
}

// Draws the rectangle on the canvas
Rectangle.prototype.draw = function(wbl) {
    wbl.ctx.beginPath();
    wbl.ctx.rect(this.origin.x, this.origin.y, this.offset.x, this.offset.y);
    wbl.ctx.strokeStyle = this.color;
    if(this.fill) {
        // HACK: this should really be done better
        try {
            wbl.ctx.fillStyle = secondaryColors[drawColors.indexOf(rgb2hex(this.color))];
        } catch {
            wbl.ctx.fillStyle = secondaryColors[drawColors.indexOf(this.color)];
        }
        wbl.ctx.fill();
    }
    wbl.ctx.lineWidth = this.lineWidth;
    wbl.ctx.stroke();
}

// Draws the control points and rectangle around the shape to indicate it is active
// TODO: split into general and ungeneral points
Rectangle.prototype.drawEditSelectors = function (wbl) {
    
    let origin, offset, editPoints;

    origin = {x: this.origin.x, y: this.origin.y};
    offset = {x: this.offset.x, y: this.offset.y};

    let selectorRadius = 5;
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
    

    wbl.ctx.strokeStyle = "black";
    wbl.ctx.fillStyle = "grey";
    wbl.ctx.lineWidth = 1;

    wbl.ctx.beginPath();
    wbl.ctx.rect(origin.x, origin.y, offset.x, offset.y);
    wbl.ctx.stroke();

    for(let node of editPoints) {
        wbl.ctx.beginPath();
        wbl.ctx.arc(node.x, node.y, selectorRadius, 0, 2*Math.PI);
        wbl.ctx.fill();
        wbl.ctx.stroke();
    }
}

/* ------------------------------------ */
/* ---------- Ellipse Object ---------- */
/* ------------------------------------ */

// Time to create an ellipse object!
function Ellipse(color, fill, lineWidth, origin, radius) {
    this.color = color;
    this.fill = fill;
    this.lineWidth = lineWidth;
    this.origin = origin;
    this.radius = radius;
}

// Checks if the given point is within the rectangle
Ellipse.prototype.isWithin = function({x, y}) {
    let multiplier = Math.pow(this.radius.x,2) * Math.pow(this.radius.y,2);
    let ellipseCalculation = Math.pow(this.radius.y,2) * Math.pow(x - this.origin.x, 2) + Math.pow(this.radius.x,2) * Math.pow(y - this.origin.y, 2);
    return ellipseCalculation <= multiplier ? true : false;
}

// Draws the ellipse on the canvas
Ellipse.prototype.draw = function(wbl) {
    wbl.ctx.beginPath();
    wbl.ctx.ellipse(this.origin.x, this.origin.y, this.radius.x, this.radius.y, 0, 0, 2*Math.PI);
    wbl.ctx.strokeStyle = this.color;
    if(this.fill) {
        // HACK: this should really be done better
        try {
            wbl.ctx.fillStyle = secondaryColors[drawColors.indexOf(rgb2hex(this.color))];
        } catch {
            wbl.ctx.fillStyle = secondaryColors[drawColors.indexOf(this.color)];
        }
        wbl.ctx.fill();
    }
    wbl.ctx.lineWidth = this.lineWidth;
    wbl.ctx.stroke();
}


Ellipse.prototype.drawEditSelectors = function (wbl) {
    
    let origin, offset, editPoints;

    origin = {x: this.origin.x-this.radius.x, y: this.origin.y-this.radius.y};
    offset = {x: this.radius.x*2, y: this.radius.y*2};

    let selectorRadius = 5;
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

    wbl.ctx.strokeStyle = "black";
    wbl.ctx.fillStyle = "grey";
    wbl.ctx.lineWidth = 1;

    wbl.ctx.beginPath();
    wbl.ctx.rect(origin.x, origin.y, offset.x, offset.y);
    wbl.ctx.stroke();

    for(let node of editPoints) {
        wbl.ctx.beginPath();
        wbl.ctx.arc(node.x, node.y, selectorRadius, 0, 2*Math.PI);
        wbl.ctx.fill();
        wbl.ctx.stroke();
    }
}

/* ------------------------------------ */
/* ---------- Textbox Object ---------- */
/* ------------------------------------ */
// HACK: textbox functions not converted to object functins

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
    wb.ctx.clearRect(0, 0, wb.canvas.width, wb.canvas.height);
    wb.drawAllDrawings();
    wb.ctx.font="16px monospace";
    wb.ctx.textBaseline = "top";
    for (let obj of curTextBoxes) {
        var lineHeight = parseInt(window.getComputedStyle(obj).getPropertyValue('line-height'));
        var borderWidth = parseInt(window.getComputedStyle(obj).getPropertyValue('border-width'));
        var lines = obj.value.split('\n');
        for (var i = 0; i<lines.length; i++) {
            //reset fillstyle
            wb.ctx.fillStyle = '#000000';
            wb.ctx.fillText(lines[i], parseInt(obj.style.left) - canvas.getBoundingClientRect().x + borderWidth, 
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
    wb.ctx.clearRect(0, 0, canvas.width, canvas.height);
    wb.drawAllDrawings();
    for (let obj of textBoxes) {
        obj.style.display = "inline-block"
    }
}

/* ---------------------------------------------------- */
/* ---------- Javascript for whiteboard menu ---------- */
/* ---------------------------------------------------- */


const drawColors = ["#4198e9", "#e94b41", "#e9b041", "#44e941", "#b341e9", "#000000"];
const secondaryColors = ["#a3c4e3", "#eba4a0", "#ebd3a4", "#a0ed9f", "#d2a0eb", "#e6e6e6"];

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
                    menuBtn.addEventListener("click", wb.clear(), false);
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
    if((wb.canvasFunction == 'overlay' || wb.canvasFunction == 'textBox') && newFunc != 'overlay'){
        fillTextBoxes(wb.textBoxes());
        for (const obj of wb.textBoxes()) {
            //Hide text boxes
            obj.style.display = "none";
        }
    }
    wb.canvasFunction = newFunc;
}

function enablePen(e) {
    changeCanvasFunction("pen");
    wb.canvas.style.cursor = "default";
    menuItemActive(e);
}

function pointerMenu(e) {
    changeCanvasFunction("pointer");
    //take snapshot of current canvas
    wb.imageData = wb.ctx.getImageData(0,0,wb.canvas.width,wb.canvas.height);
    wb.canvas.style.cursor = "none";
    menuItemActive(e);
}

function lineDraw(e) {
    //take snapshot of current canvas
    wb.imageData = wb.ctx.getImageData(0,0,wb.canvas.width,wb.canvas.height);
    changeCanvasFunction("line");
    wb.canvas.style.cursor = "default";
    menuItemActive(e);
}

function addTextBox(e) {
    changeCanvasFunction("textBox");
    wb.canvas.style.cursor = "default";
    menuItemActive(e);
    textBox();
}

function showOverlay(e) {
    changeCanvasFunction("overlay");
    wb.canvas.style.cursor = "default";
    menuItemActive(e);
    overlay();
}

//Using changeCanvasFunction in case of unfilled textbox
function goToNextPage() {
    changeCanvasFunction("nextPage");
    wb.nextPage("pageCount");
}

function goToPrevPage() {
    changeCanvasFunction("prevPage");
    wb.prevPage("pageCount");
}

function rectangleDraw(e) {
    wb.imageData = wb.ctx.getImageData(0,0,wb.canvas.width,wb.canvas.height);
    changeCanvasFunction("rect");
    canvas.style.cursor = "default";
    menuItemActive(e);
}

function circleDraw(e) {
    wb.imageData = wb.ctx.getImageData(0,0,wb.canvas.width,wb.canvas.height);
    changeCanvasFunction("circle");
    wb.canvas.style.cursor = "default";
    menuItemActive(e);
}

function moveObject(e) {
    changeCanvasFunction("move");
    wb.canvas.style.cursor = "default";
    menuItemActive(e);
}

function eraseObjects(e) {
    changeCanvasFunction("erase");
    wb.canvas.style.cursor = "default";
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
            if(drawColors[i-1] != wb.activeColor) {
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
    wb.activeColor = color;
    wb.activeSecondaryColor = secondaryColors[drawColors.indexOf(wb.activeColor)];
    for(let element of menuList) {
        element.remove();
    }
    menuList = [];
    activeColorDiv.children[0].style.backgroundColor = wb.activeColor;
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
        // fill shape option button
        menuBtn = document.createElement("div");
        menuBtn.classList.add("canvasBtnAbs");
        menuBtn.style.height = info.height + "px";
        menuBtn.style.width = info.width + "px";
        menuBtn.style.top = (info.top - info.height*(counter+1)) + "px";
        menuBtn.style.left = info.left + "px";
        let div = document.createElement("div");
        let text = document.createElement("label");
        text.textContent = "Fill";
        text.style.fontSize = "18px";
        shapeChoice = document.createElement("INPUT");
        shapeChoice.setAttribute("type", "checkbox");
        shapeChoice.checked = wb.fillShapes;
        div.appendChild(shapeChoice);
        div.appendChild(text);
        menuBtn.appendChild(div);
        menuShapeList.push(menuBtn);
        document.getElementById("drawBar").appendChild(menuBtn);
        shapeChoice.addEventListener("change", setFillStatus, false);
    } else {
        for(let element of menuShapeList) {
            element.remove();
        }
        menuShapeList = [];
    }
}

function setFillStatus(e) {
    wb.fillShapes = e.currentTarget.checked;
}

function lineDrawActive(e) {
    //take snapshot of current canvas
    imageData = wb.ctx.getImageData(0,0,canvas.width,canvas.height);
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
    imageData = wb.ctx.getImageData(0,0,canvas.width,canvas.height);
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
    imageData = wb.ctx.getImageData(0,0,canvas.width,canvas.height);
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