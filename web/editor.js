const stage = document.getElementById("stage");
const stageWrapper = document.getElementById("stageWrapper");
const addTextButton = document.getElementById("addTextButton");
const deleteButton = document.getElementById("deleteButton");

const properties = document.getElementById("properties");
const positionX = document.getElementById("positionX");
const positionY = document.getElementById("positionY");
const textContent = document.getElementById("textContent");

let elements = {};
let selectedElementId = null;
let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

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

function renderAll() {
  stage.replaceChildren();
  for (const id in elements) {
    renderElement(elements[id]);
  }
}

function renderElement(element) {
  let domElement;

  if (element.type === "text") {
    domElement = document.createElement("div");
    domElement.textContent = element.text;
    domElement.classList.add(
      "takeover-element",
      "text-element",
      "editor-element"
    );
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
  stage.appendChild(domElement);
}

addTextButton.addEventListener("click", () => {
  const id = crypto.randomUUID();
  const element = {
    id: id,
    type: "text",
    text: "Hello, world!",
    x: 960,
    y: 540,
    width: 0,
    height: 0
  };

  elements[id] = element;
  selectedElementId = id;
  renderAll();

  showProperties(element);
  sendMessage("ADD_TEXT", element);
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
  positionX.value = element.x;
  positionY.value = element.y;

  if (element.type === "text") {
    textContent.value = element.text;
  } else {
    textContent.value = "";
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

document.addEventListener("mouseup", () => { dragging = false; });

positionX.addEventListener("change", () => {
  if (!selectedElementId) {
    return;
  }
  const element = elements[selectedElementId];
  element.x = Number(positionX.value);

  renderAll();
  sendMessage("UPDATE_ELEMENT", {
    id: element.id,
    x: element.x
  });
});

positionY.addEventListener("change", () => {
  if (!selectedElementId) {
    return;
  }
  const element = elements[selectedElementId];
  element.y = Number(positionY.value);
  renderAll();
  sendMessage("UPDATE_ELEMENT", {
    id: element.id,
    y: element.y
  });
});

textContent.addEventListener("onchange", () => {
  if (!selectedElementId) {
    return;
  }

  const element = elements[selectedElementId];
  if (element.type !== "text") {
    return;
  }

  element.text = textContent.value;
  renderAll();
  sendMessage("UPDATE_ELEMENT", {
    id: element.id,
    text: element.text
  });
});

connectWebSocket();
