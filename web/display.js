const stage = document.getElementById("stage");
let elements = {};

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
}

function handleDeleteElement(data) {
  delete elements[data.id];
  renderAll();
}

function renderAll() {
  stage.replaceChildren();
  for (const id in elements) {
    renderElement(elements[id]);
  }
}

function renderElement(element) {
  let domElement;

  switch (element.type) {
    case "text":
      domElement = document.createElement("div");
      domElement.textContent = element.text;
      domElement.classList.add("takeover-element", "text-element");
      break;
    case "image":
      domElement = document.createElement("img");
      domElement.src = element.src;
      domElement.classList.add("takeover-element", "image-element");
      break;
    case "drawing":
      domElement = createDrawingElement(element);
    default:
      console.warn("Unknown element type:", element.type);
      return;
  }

  domElement.dataset.id = element.id;
  domElement.style.left = `${element.x}px`;
  domElement.style.top = `${element.y}px`;
  if (element.width)
    domElement.style.width = `${element.width}px`;
  if (element.height)
    domElement.style.height = `${element.height}px`;

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
  container.classList.add("drawing-element");

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

connectWebSocket();
