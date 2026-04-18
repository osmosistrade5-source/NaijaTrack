import { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export const registerClient = (ws: WebSocket) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
};

export const broadcast = (data: any) => {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
};
