let socket = null;

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  const socketURL = `${protocol}//${window.location.host}/ws`;
  console.log("Connecting to:", socketURL);

  socket = new WebSocket(socketURL);
  socket.addEventListener("open", () => {
    console.log("WebSocket connected.");
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);
      handleMessage(message);
    } catch (error) {
      console.error("Received invalid JSON:", event.data);
    }
  });

  socket.addEventListener("close", () => {
    console.log("WebSocket disconnected.");
    setTimeout(connectWebSocket, 2000);
  });

  socket.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });
}

function sendMessage(type, data = {}) {
  if (!socket) {
    console.warn("WebSocket is not connected.");
    return;
  }

  if (socket.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket is not connected.");
    return;
  }

  socket.send(JSON.stringify({
    type: type,
    data: data
  }));
}

function handleMessage(message) {
  console.log("Received message:", message);

  if (message.type === "STATE") {
    handleState(message.data);
  } else {
    console.warn("Unknown message type:", message.type);
  }
}

function handleState(state) {
  console.log("Received state:", state);
}

connectWebSocket();
function handleMessage(message) {
  console.log("Received message:", message);

  switch (message.type) {
    case "STATE":
      handleState?.(message.data);
      break;
    case "ADD_TEXT":
      handleAddText?.(message.data);
      break;
    case "UPDATE_ELEMENT":
      handleUpdateElement?.(message.data);
      break;
    case "DELETE_ELEMENT":
      handleDeleteElement?.(message.data);
      break;
    default:
      console.warn("Unknown message type:", message.type);
  }
}

connectWebSocket();
