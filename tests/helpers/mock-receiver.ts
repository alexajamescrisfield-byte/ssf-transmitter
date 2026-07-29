import { createServer, type Server } from "http";
import type { AddressInfo } from "net";

export interface CapturedRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

// A local stand-in for ISC's stream delivery endpoint. Real integration
// tests need to see the ACTUAL bytes we POST -- decoding the captured SET
// is what catches claim-shape regressions (missing sub_id, missing aud,
// wrong nesting) instead of just trusting that fetch() didn't throw.
export class MockReceiver {
  private server: Server;
  private requests: CapturedRequest[] = [];
  url = "";

  private constructor(server: Server, url: string) {
    this.server = server;
    this.url = url;
  }

  static async start(): Promise<MockReceiver> {
    return new Promise((resolve) => {
      const requests: CapturedRequest[] = [];
      const server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          requests.push({
            method: req.method ?? "",
            headers: req.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
          res.statusCode = 202;
          res.end();
        });
      });
      server.listen(0, "127.0.0.1", () => {
        const { port } = server.address() as AddressInfo;
        const instance = new MockReceiver(server, `http://127.0.0.1:${port}`);
        // Share the same backing array so requests captured after
        // construction are still visible via instance.getRequests().
        (instance as unknown as { requests: CapturedRequest[] }).requests = requests;
        resolve(instance);
      });
    });
  }

  getRequests(): CapturedRequest[] {
    return this.requests;
  }

  async close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}
