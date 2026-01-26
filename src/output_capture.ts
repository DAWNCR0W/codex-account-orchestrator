import { MAX_CAPTURED_LINES } from "./constants";

export class OutputCapture {
  private readonly lines: string[] = [];
  private partial = "";

  addChunk(chunk: Buffer | string): void {
    const text = chunk instanceof Buffer ? chunk.toString("utf8") : chunk;
    const combined = this.partial + text;
    const parts = combined.split(/\r?\n/);

    this.partial = parts.pop() ?? "";

    for (const line of parts) {
      this.lines.push(line);
    }

    if (this.lines.length > MAX_CAPTURED_LINES) {
      this.lines.splice(0, this.lines.length - MAX_CAPTURED_LINES);
    }
  }

  getText(): string {
    const allLines = this.partial.length > 0 ? [...this.lines, this.partial] : this.lines;
    return allLines.join("\n");
  }
}
