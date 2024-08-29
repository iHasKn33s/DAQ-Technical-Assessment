import net from "net";
import { WebSocket, WebSocketServer } from "ws";

interface VehicleData {
  battery_temperature: number;
  timestamp: number;
}

const TCP_PORT = 12000;
const WS_PORT = 8080;
const tcpServer = net.createServer();
const websocketServer = new WebSocketServer({ port: WS_PORT });

const TEMP_MIN = 20;
const TEMP_MAX = 80;
const TIMER = 5000;

let count = 0;
let exceedRangeTime : (number | null) = null;

tcpServer.on("connection", (socket) => {
  console.log("TCP client connected");

  socket.on("data", (msg) => {
    console.log(`Received: ${msg.toString()}`);

    const jsonData: VehicleData = JSON.parse(msg.toString());

    if ( jsonData.battery_temperature < TEMP_MIN
      || jsonData.battery_temperature > TEMP_MAX ) {

        const currentTime = jsonData.timestamp;
        count++;
        
        if(!exceedRangeTime) {
          exceedRangeTime = currentTime;
        }
        if(count > 3 && currentTime - exceedRangeTime <= TIMER){
          console.log(
            `Error: Timestamp ${Date.now()}, Range exceeded 3 times in 5 seconds`
          );
          count = 0;
          exceedRangeTime = null;

        } else if ( currentTime - exceedRangeTime > TIMER) {
          count = 1;
          exceedRangeTime = currentTime;
        }

      }

    // Send JSON over WS to frontend clients
    websocketServer.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg.toString());
      }
    });
  });

  socket.on("end", () => {
    console.log("Closing connection with the TCP client");
  });

  socket.on("error", (err) => {
    console.log("TCP client error: ", err);
  });
});

websocketServer.on("listening", () =>
  console.log(`Websocket server started on port ${WS_PORT}`)
);

websocketServer.on("connection", async (ws: WebSocket) => {
  console.log("Frontend websocket client connected");
  ws.on("error", console.error);
});

tcpServer.listen(TCP_PORT, () => {
  console.log(`TCP server listening on port ${TCP_PORT}`);
});
