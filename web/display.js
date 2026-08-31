const stage = document.getElementById("stage");
let elements = {};

function handleState(state) {
  console.log("Display received state:", state);
  elements = state.elements || {};

  renderAll();
}

function handleAddText(element) {
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
    default:
      console.warn("Unknown element type:", element.type);
      return;
  }

  domElement.dataset.id = element.id;
  domElement.style.left = `${element.x}px`;
  domElement.style.top = `${element.y}px`;
  stage.appendChild(domElement);
}

connectWebSocket();
