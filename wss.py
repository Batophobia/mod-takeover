import asyncio
import json
from pathlib import Path

from aiohttp import web


HOST = "0.0.0.0"
PORT = 8765

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"

clients = set()

# This will eventually contain the complete state of the takeover canvas.
state = {
    "elements": {}
}


async def websocket_handler(request):
    """Handle a WebSocket connection from a browser."""

    websocket = web.WebSocketResponse()
    await websocket.prepare(request)

    clients.add(websocket)

    print(f"Client connected. Total clients: {len(clients)}")

    try:
        # Send the current state to the newly connected client.
        await websocket.send_json({
            "type": "STATE",
            "data": state
        })

        async for message in websocket:
            if message.type != web.WSMsgType.TEXT:
                continue;

            try:
                data = json.loads(message.data)
            except json.JSONDecodeError:
                print("Received invalid JSON.")
                continue

            print("Received:", data)

            if data.get("type") in ("ADD_ELEMENT", "ADD_ELEMENT"):
                element = data.get("data")
                if not element or "id" not in element:
                    continue
                state["elements"][element["id"]] = element

            elif data.get("type") == "UPDATE_ELEMENT":
                element = data.get("data")
                if not element or "id" not in element:
                    continue
                element_id = element["id"]
                if element_id in state["elements"]:
                    state["elements"][element_id].update(element)

            elif data.get("type") == "DELETE_ELEMENT":
                element = data.get("data")
                if element and "id" in element:
                    state["elements"].pop( element["id"], None )
            
            await broadcast(data, websocket)

    finally:
        clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(clients)}")

    return websocket

async def broadcast(data, sender=None):
    """Send a message to every connected client except sender."""

    for client in clients.copy():

        if client == sender:
            continue

        if client.closed:
            continue

        try:
            await client.send_json(data)
        except Exception as error:
            print("Error sending to client:", error)


async def display_handler(request):
    """Serve the display page."""

    return web.FileResponse(
        WEB_DIR / "display.html"
    )


async def editor_handler(request):
    """Serve the editor page."""

    return web.FileResponse(
        WEB_DIR / "editor.html"
    )


async def static_handler(request):
    """Serve CSS, JavaScript, images, etc."""

    filename = request.match_info["filename"]

    # Prevent paths such as ../server.py from escaping WEB_DIR.
    file_path = (WEB_DIR / filename).resolve()

    if WEB_DIR not in file_path.parents:
        raise web.HTTPForbidden()

    if not file_path.is_file():
        raise web.HTTPNotFound()

    return web.FileResponse(file_path)


async def main():

    app = web.Application()

    # Web pages
    app.router.add_get("/display", display_handler)
    app.router.add_get("/editor", editor_handler)

    # WebSocket endpoint
    app.router.add_get("/ws", websocket_handler)

    # Static files
    app.router.add_get("/{filename:.*}", static_handler)

    print()
    print("=" * 50)
    print("       MOD TAKEOVER SERVER")
    print("=" * 50)
    print()
    print(f"Display:  http://localhost:{PORT}/display")
    print(f"Editor:   http://localhost:{PORT}/editor")
    print(f"WebSocket: ws://localhost:{PORT}/ws")
    print()
    print(f"Listening on {HOST}:{PORT}")
    print("=" * 50)
    print()

    runner = web.AppRunner(app)
    await runner.setup()

    site = web.TCPSite(
        runner,
        HOST,
        PORT
    )

    await site.start()

    try:
        await asyncio.Future()
    finally:
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(main())