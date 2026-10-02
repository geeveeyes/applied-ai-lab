// Bundles the Project 03 sample documents into data/sample-docs.json so the deployed app needs no filesystem access.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
const dir = new URL("../../03-ask-my-documents/sample_docs/", import.meta.url);
const docs = readdirSync(dir).sort().map((name) => ({ source: name, text: readFileSync(new URL(name, dir), "utf8") }));
writeFileSync(new URL("../data/sample-docs.json", import.meta.url), JSON.stringify(docs, null, 1));
cp(new URL("../../03-ask-my-documents/evals/cases.json", import.meta.url), new URL("../data/cases.json", import.meta.url));
function cp(from, to) { writeFileSync(to, readFileSync(from)); }
console.log(`bundled ${docs.length} documents`);
