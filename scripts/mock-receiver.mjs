// Throwaway local HTTP listener that stands in for ISC's stream delivery
// endpoint, so we can prove sendSsfSignal() actually pushes a valid signed
// SET before wiring up a real ISC tenant. Not part of the app.
import http from "node:http";

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    console.log(`[mock-receiver] ${req.method} ${req.url}`);
    console.log(`  content-type: ${req.headers["content-type"]}`);
    console.log(`  body (SET JWT): ${body.slice(0, 120)}...`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ received: true }));
  });
});

server.listen(3999, () => console.log("mock-receiver listening on :3999"));
