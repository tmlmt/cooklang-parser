import type { Step, Note } from "../types";

export class Section {
  name: string;
  content: (Step | Note)[] = [];

  constructor(name: string = "") {
    this.name = name;
  }

  isBlank(): boolean {
    return this.name === "" && this.content.length === 0;
  }
}
