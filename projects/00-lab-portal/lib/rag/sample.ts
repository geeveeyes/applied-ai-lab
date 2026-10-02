import docs from "@/data/sample-docs.json";
import { Doc } from "./chunk";
import { Index } from "./index";

let cached: Index | undefined;
export const sampleDocs: Doc[] = docs;
export function sampleIndex(): Index { return (cached ??= new Index(sampleDocs)); }
