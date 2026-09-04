const stage = document.getElementById("stage");
const stageWrapper = document.getElementById("stageWrapper");
const addTextButton = document.getElementById("addTextButton");
const deleteButton = document.getElementById("deleteButton");
const addImageButton = document.getElementById("addImageButton");
const drawButton = document.getElementById("drawButton");
const undoButton = document.getElementById("undoButton");

const properties = document.getElementById("properties");
const textContent = document.getElementById("textContent");
const imageUrl = document.getElementById("imageUrl");
const brushColor = document.getElementById("brushColor");
const brushSize = document.getElementById("brushSize");
const brushPreview = document.getElementById("brushPreview");

let elements = {};
let selectedElementId = null;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

let resizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

let drawing = false;
let drawMode = false;
let currentStroke = null;
let currentDrawing = null;

function resizeStage() {
  const availableWidth = window.innerWidth - 40;
  const availableHeight = window.innerHeight - 40;

  const scale = Math.min(
    availableWidth / 1920,
    availableHeight / 1080
  );

  stageWrapper.style.width = "1920px";
  stageWrapper.style.height = "1080px";

  stageWrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener("resize", resizeStage);

resizeStage();

function handleState(state) {
  console.log("Display received state:", state);
  elements = state.elements || {};

  renderAll();
}

function handleAddElement(element) {
  elements[element.id] = element;
  renderAll();
}

function handleUpdateElement(update) {
  const element = elements[update.id];

  if (!element) {
    console.warn("Received update for unknown element:", update.id);
    return;
  }

  Object.assign(element, update);
  renderAll();

  if (update.id === selectedElementId) {
    showProperties(element);
  }
}

function handleDeleteElement(data) {
  delete elements[data.id];
  if (selectedElementId === data.id) {
    selectedElementId = null;
    properties.classList.add("hidden");
  }
  renderAll();
}

function updateBrushPreview() {
  const size = Number(brushSize.value);

  brushPreview.style.width = `${size}px`;
  brushPreview.style.height = `${size}px`;
  brushPreview.style.backgroundColor = brushColor.value;
}
brushSize.addEventListener("input", updateBrushPreview);
brushColor.addEventListener("input", updateBrushPreview);
updateBrushPreview();

function renderAll() {
  stage.replaceChildren();
  for (const id in elements) {
    renderElement(elements[id]);
  }

  if (currentDrawing) {
    const previewDrawing = { ...currentDrawing, strokes: [...currentDrawing.strokes] };

    if (currentStroke) {
      previewDrawing.strokes.push(currentStroke);
    }

    const preview = createDrawingElement(previewDrawing);
    preview.id = "drawing-preview";
    preview.classList.add("drawing-preview");
    preview.style.left = `${currentDrawing.x}px`;
    preview.style.top = `${currentDrawing.y}px`;
    preview.style.width = `${currentDrawing.width}px`;
    preview.style.height = `${currentDrawing.height}px`;
    stage.appendChild(preview);
  }
}

function renderElement(element) {
  let domElement;

  if (element.type === "text") {
    domElement = document.createElement("div");
    domElement.textContent = element.text;
    domElement.style.color = element.color;
    domElement.classList.add(
      "takeover-element",
      "text-element",
      "editor-element"
    );
  } else if (element.type === "image") {
    domElement = document.createElement("div");
    domElement.classList.add(
      "takeover-element",
      "image-element",
      "editor-element"
    );

    const image = document.createElement("img");
    image.src = element.src;
    image.draggable = false;
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.display = "block";
    domElement.appendChild(image);
  } else if (element.type === "drawing") {
    domElement = createDrawingElement(element);
  } else {
    console.warn("Unknown element type:", element.type);
    return;
  }

  domElement.dataset.id = element.id;
  domElement.style.left = `${element.x}px`;
  domElement.style.top = `${element.y}px`;

  if (element.width) {
    domElement.style.width = `${element.width}px`;
  }

  if (element.height) {
    domElement.style.height = `${element.height}px`;
  }

  if (element.id === selectedElementId) {
    domElement.classList.add("selected");
  }

  domElement.addEventListener("mousedown", beginDrag);

  if (element.type === "image" && element.id === selectedElementId) {
    const resizeHandle = document.createElement("div");
    resizeHandle.classList.add("resize-handle");
    resizeHandle.dataset.id = element.id;
    resizeHandle.addEventListener("mousedown", beginResize);
    domElement.appendChild(resizeHandle);
  }

  stage.appendChild(domElement);
}

function renderStroke(svg, stroke) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  if (!stroke.points || stroke.points.length === 0) return;

  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    const circle = document.createElementNS(svgNamespace, "circle");

    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", stroke.size / 2);
    circle.setAttribute("fill", stroke.color);
    svg.appendChild(circle);

    return;
  }

  const path = document.createElementNS(svgNamespace, "path");

  path.setAttribute("d", pointsToPath(stroke.points));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke.color);
  path.setAttribute("stroke-width", stroke.size);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
}

function pointsToPath(points) {
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }

  return path;
}

function createDrawingElement(element) {
  const svgNamespace = "http://www.w3.org/2000/svg";

  const container = document.createElement("div");
  container.classList.add("takeover-element", "drawing-element", "editor-element");

  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("viewBox", `0 0 ${element.width} ${element.height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  for (const stroke of element.strokes) {
    renderStroke(svg, stroke);
  }

  container.appendChild(svg);
  return container;
}

addTextButton.addEventListener("click", () => {
  const id = Date.now();
  const element = {
    id: id,
    type: "text",
    text: ".",
    x: 960,
    y: 540,
    width: 0,
    height: 0,
    color: "#CCCCCC"
  };

  elements[id] = element;
  selectedElementId = id;
  renderAll();

  showProperties(element);
  sendMessage("ADD_ELEMENT", element);
});

deleteButton.addEventListener("click", deleteSelectedElement);

document.addEventListener("keydown", (event) => {
  if (
    event.key !== "Delete" &&
    event.key !== "Backspace"
  ) {
    return;
  }

  if (!selectedElementId) {
    return;
  }

  // Don't delete an element while typing
  // inside an input field.
  if (
    document.activeElement.tagName === "INPUT" ||
    document.activeElement.tagName === "TEXTAREA"
  ) {
    return;
  }

  deleteSelectedElement();
});

function deleteSelectedElement() {
  if (!selectedElementId) {
    return;
  }

  const id = selectedElementId;
  delete elements[id];
  selectedElementId = null;
  properties.classList.add("hidden");

  renderAll();
  sendMessage("DELETE_ELEMENT", { id: id });
}

function selectElement(element) {
  selectedElementId = element.id;
  showProperties(element);
  renderAll();
}

function showProperties(element) {
  properties.classList.remove("hidden");
  textContent.parentElement.style.display = "none";
  imageUrl.parentElement.style.display = "none";
  brushColor.parentElement.style.display = "none";
  brushSize.parentElement.style.display = "none";
  brushPreview.style.display = "none";

  if (element.type === "text") {
    textContent.parentElement.style.display = "block";
    textContent.value = element.text;
    brushColor.parentElement.style.display = "block";
    brushColor.value = element.color;
  }

  if (element.type === "image") {
    imageUrl.parentElement.style.display = "block";
    imageUrl.value = element.src;
  }
}

function beginDrag(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.id;
  const element = elements[id];
  selectElement(element);
  const rect = stage.getBoundingClientRect();

  const scale = rect.width / 1920;
  const mouseX = (event.clientX - rect.left) / scale;
  const mouseY = (event.clientY - rect.top) / scale;

  dragOffsetX = mouseX - element.x;
  dragOffsetY = mouseY - element.y;
  dragging = true;
}

document.addEventListener("mousemove", (event) => {
  if (drawing && currentStroke) {
    const point = getStagePoint(event);
    currentStroke.points.push(point);

    renderAll();
    return;
  }

  if (resizing) {
    const element = elements[selectedElementId];
    if (!element) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const scale = rect.width / 1920;

    const mouseDeltaX = (event.clientX - resizeStartX) / scale;
    const mouseDeltaY = (event.clientY - resizeStartY) / scale;

    const width = Math.max(50, resizeStartWidth + mouseDeltaX);
    const aspectRatio = resizeStartWidth / resizeStartHeight;
    const height = width / aspectRatio;
    element.width = Math.round(width);
    element.height = Math.round(height);

    renderAll();
    sendMessage("UPDATE_ELEMENT", {
      id: element.id,
      width: element.width,
      height: element.height
    });
    return;
  }

  if (!dragging) {
    return;
  }
  const element = elements[selectedElementId];
  if (!element) {
    return;
  }

  const rect = stage.getBoundingClientRect();
  const scale = rect.width / 1920;
  const mouseX = (event.clientX - rect.left) / scale;
  const mouseY = (event.clientY - rect.top) / scale;
  element.x = Math.round(mouseX - dragOffsetX);
  element.y = Math.round(mouseY - dragOffsetY);

  renderAll();
  showProperties(element);
  sendMessage("UPDATE_ELEMENT", {
    id: element.id,
    x: element.x,
    y: element.y
  });
});

document.addEventListener("mouseup", () => {
  if (drawing && currentStroke) {
    drawing = false;
    if (currentDrawing) {
      currentDrawing.strokes.push(currentStroke);
    }
    currentStroke = null;
    renderAll();
  }

  dragging = false;
  resizing = false;
});

textContent.addEventListener("input", () => {
  if (!selectedElementId) {
    return;
  }

  const element = elements[selectedElementId];
  if (!element || element.type !== "text") {
    return;
  }

  element.text = textContent.value;
  element.color = brushColor.value;
  renderAll();
  sendMessage("UPDATE_ELEMENT", {
    id: element.id,
    text: element.text,
    color: element.color
  });
});

brushColor.addEventListener("input", () => {
  if (!selectedElementId) return;

  const element = elements[selectedElementId];
  if (!element || element.type !== "text") return;

  element.color = brushColor.value;
  renderAll();
  sendMessage("UPDATE_ELEMENT", {
    id: element.id,
    color: element.color
  });
});

addImageButton.addEventListener("click", () => {
  const id = Date.now();
  const element = {
    id: id,
    type: "image",
    src: "",
    x: 760,
    y: 390,
    width: 400,
    height: 300
  };

  elements[id] = element;
  selectedElementId = id;
  renderAll();
  showProperties(element);
  sendMessage("ADD_ELEMENT", element);
});

imageUrl.addEventListener("change", () => {
  if (!selectedElementId) {
    return;
  }

  const element = elements[selectedElementId];
  if (!element || element.type !== "image") {
    return;
  }

  const newUrl = imageUrl.value.trim();
  element.src = newUrl;

  if (!newUrl) {
    renderAll();
    sendMessage("UPDATE_ELEMENT", {
      id: element.id,
      src: element.src
    });
    return;
  }

  const image = new Image();
  image.onload = () => {
    const maxWidth = 600;
    const maxHeight = 600;

    const scale = Math.min(
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight,
      1
    );
    element.width = Math.round(image.naturalWidth * scale);
    element.height = Math.round(image.naturalHeight * scale);

    renderAll();
    sendMessage("UPDATE_ELEMENT", {
      id: element.id,
      src: element.src,
      width: element.width,
      height: element.height
    });
  };

  image.onerror = () => {
    console.error("Unable to load image:", newUrl);
    renderAll();
    sendMessage("UPDATE_ELEMENT", {
      id: element.id,
      src: element.src
    });
  };

  image.src = newUrl;
});

function beginResize(event) {
  event.preventDefault();
  event.stopPropagation();

  const id = event.currentTarget.dataset.id;
  const element = elements[id];
  if (!element) {
    return;
  }
  selectedElementId = id;

  resizeStartX = event.clientX;
  resizeStartY = event.clientY;
  resizeStartWidth = element.width;
  resizeStartHeight = element.height;

  resizing = true;
}

drawButton.addEventListener("click", () => {
  if (drawMode) {
    finishDrawing();
    properties.classList.add("hidden");
    textContent.parentElement.style.display = "none";
    imageUrl.parentElement.style.display = "none";
    brushColor.parentElement.style.display = "none";
    brushSize.parentElement.style.display = "none";
    brushPreview.style.display = "none";
    undoButton.style.display = "none";
  } else {
    startDrawing();
    properties.classList.remove("hidden");
    textContent.parentElement.style.display = "none";
    imageUrl.parentElement.style.display = "none";
    brushColor.parentElement.style.display = "block";
    brushSize.parentElement.style.display = "block";
    brushPreview.style.display = "block";
    undoButton.style.display = "";
  }
});

function startDrawing() {
  drawMode = true;
  currentDrawing = {
    id: Date.now(),
    type: "drawing",
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
    strokes: []
  };

  selectedElementId = null;

  drawButton.textContent = "Finish";
  drawButton.classList.add("active");
  stage.classList.add("draw-mode");

  renderAll();
}

function finishDrawing() {
  drawMode = false;
  stage.classList.remove("draw-mode");
  drawButton.classList.remove("active");
  drawButton.textContent = "Draw";

  if (!currentDrawing || currentDrawing.strokes.length === 0) {
    currentDrawing = null;
    renderAll();
    return;
  }

  finalizeDrawingBounds(currentDrawing);

  elements[currentDrawing.id] = currentDrawing;
  selectedElementId = currentDrawing.id;

  sendMessage("ADD_ELEMENT", currentDrawing);
  currentDrawing = null;
  showProperties(elements[selectedElementId]);
  renderAll();
}

function undoStroke() {
  if (!drawMode || !currentDrawing) return;
  if (drawing) return;
  if (currentDrawing.strokes.length === 0) return;

  currentDrawing.strokes.pop();
  renderAll();
}
undoButton.addEventListener("click", undoStroke);

function getStagePoint(event) {
  const rect = stage.getBoundingClientRect();
  const scale = rect.width / 1920;

  return {
    x: Math.round((event.clientX - rect.left) / scale),
    y: Math.round((event.clientY - rect.top) / scale)
  };
}

stage.addEventListener("mousedown", beginDrawing);

function beginDrawing(event) {
  if (!drawMode) return;

  if (event.button !== 0) return;

  event.preventDefault();

  const point = getStagePoint(event);
  drawing = true;

  currentStroke = {
    color: brushColor.value,
    size: Number(brushSize.value),
    points: [point]
  };

  renderAll();
}

function finalizeDrawingBounds(drawingElement) {
  const allPoints = drawingElement.strokes.flatMap(stroke => stroke.points);

  if (allPoints.length === 0) return;

  const padding = Math.max(...drawingElement.strokes.map(stroke => stroke.size / 2));

  const minX = Math.min(...allPoints.map(point => point.x));
  const minY = Math.min(...allPoints.map(point => point.y));
  const maxX = Math.max(...allPoints.map(point => point.x));
  const maxY = Math.max(...allPoints.map(point => point.y));

  drawingElement.x = Math.max(0, minX - padding);
  drawingElement.y = Math.max(0, minY - padding);

  drawingElement.width =
    Math.min(1920, maxX + padding) - drawingElement.x;

  drawingElement.height =
    Math.min(1080, maxY + padding) - drawingElement.y;

  for (const stroke of drawingElement.strokes) {
    for (const point of stroke.points) {
      point.x -= drawingElement.x;
      point.y -= drawingElement.y;
    }
  }
}

connectWebSocket();
