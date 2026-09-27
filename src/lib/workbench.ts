export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Draft = {
  title: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  request: Json | undefined;
  expectedStatus: number;
  expectedBody: Json;
  actualStatus: number;
  actualBody: Json;
};
export type Difference = { path: string; expected: string; actual: string };

export function parseJson(text: string, label: string): Json {
  if (!text.trim()) throw new Error(`${label} is required. Enter valid JSON.`);
  if (text.length > 12000) throw new Error(`${label} is too long. Keep it under 12,000 characters.`);
  try { return JSON.parse(text) as Json; }
  catch { throw new Error(`${label} must be valid JSON. Put quotation marks around text.`); }
}

export function validateDraft(draft: Draft): void {
  if (draft.title.trim().length < 3 || draft.title.length > 100) throw new Error('Give the case a title between 3 and 100 characters.');
  if (!draft.path.startsWith('/') || draft.path.startsWith('//') || /\s/.test(draft.path) || draft.path.length > 300) throw new Error('Use a relative endpoint path such as /api/orders.');
  for (const [label, status] of [['Expected', draft.expectedStatus], ['Observed', draft.actualStatus]] as const) {
    if (!Number.isInteger(status) || status < 100 || status > 599) throw new Error(`${label} status must be a number from 100 to 599.`);
  }
  if (draft.method === 'GET' && draft.request !== undefined) throw new Error('A GET example should not include a request body. Select another method or clear the body.');
}

function shown(value: unknown, exists = true): string {
  return exists ? JSON.stringify(value) ?? String(value) : '(missing)';
}

export function compare(draft: Draft): Difference[] {
  const differences: Difference[] = [];
  if (draft.expectedStatus !== draft.actualStatus) differences.push({path:'HTTP status',expected:String(draft.expectedStatus),actual:String(draft.actualStatus)});
  function walk(expected: Json, actual: Json | undefined, path: string, exists = true): void {
    if (differences.length >= 40) return;
    if (!exists) {differences.push({path,expected:shown(expected),actual:'(missing)'});return;}
    if (Array.isArray(expected) && Array.isArray(actual)) {
      if (expected.length !== actual.length) differences.push({path:`${path}.length`,expected:String(expected.length),actual:String(actual.length)});
      expected.forEach((v,i)=>walk(v,actual[i],`${path}[${i}]`,i<actual.length));return;
    }
    if (expected !== null && actual !== null && typeof expected === 'object' && typeof actual === 'object' && !Array.isArray(expected) && !Array.isArray(actual)) {
      const e=expected as Record<string,Json>, a=actual as Record<string,Json>;
      for (const key of new Set([...Object.keys(e),...Object.keys(a)])) {
        const child=`${path}.${key}`;
        if (!Object.prototype.hasOwnProperty.call(e,key)) differences.push({path:child,expected:'(missing)',actual:shown(a[key])});
        else walk(e[key],a[key],child,Object.prototype.hasOwnProperty.call(a,key));
      }
      return;
    }
    if (expected !== actual) differences.push({path,expected:shown(expected),actual:shown(actual)});
  }
  walk(draft.expectedBody,draft.actualBody,'response');
  return differences.slice(0,40);
}

export function vitestSnippet(draft: Draft): string {
  validateDraft(draft);
  const request=draft.request === undefined ? '' : `,\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(${JSON.stringify(draft.request,null,2)})`;
  return `import { test, expect } from 'vitest';\n\n// Set BASE_URL to the server you are testing. Use redacted data.\ntest(${JSON.stringify(draft.title.trim())}, async () => {\n  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';\n  const response = await fetch(new URL(${JSON.stringify(draft.path)}, baseUrl), {\n    method: ${JSON.stringify(draft.method)}${request}\n  });\n  expect(response.status).toBe(${draft.expectedStatus});\n  expect(await response.json()).toEqual(${JSON.stringify(draft.expectedBody,null,2)});\n});\n`;
}

export function bobTask(draft: Draft): string {
  validateDraft(draft);
  return `Investigate this sanitized API failure in my authorized repository using IBM Bob IDE.\n\nCase: ${draft.title.trim()}\nRequest: ${draft.method} ${draft.path}\nRequest JSON: ${shown(draft.request,draft.request!==undefined)}\nExpected HTTP ${draft.expectedStatus}: ${shown(draft.expectedBody)}\nObserved HTTP ${draft.actualStatus}: ${shown(draft.actualBody)}\n\n1. Locate the handler and reproduce the observed response.\n2. Add the attached Vitest regression test without weakening its assertions. Run it before the fix and record the actual failure.\n3. Identify the cause, make the smallest repair, and run the regression and related boundary tests.\n4. Explain the code change and show actual commands, results, and remaining limits. Preserve the task-session summary screenshot.\n\nDo not claim success unless the test passes. Use redacted data and do not reveal secrets.\n`;
}

export function issueText(draft: Draft, differences: Difference[]): string {
  validateDraft(draft);
  return `# ${draft.title.trim()}\n\n## Request\n\`${draft.method} ${draft.path}\`\n\n\`\`\`json\n${shown(draft.request,draft.request!==undefined)}\n\`\`\`\n\n## Expected response\nHTTP ${draft.expectedStatus}\n\`\`\`json\n${shown(draft.expectedBody)}\n\`\`\`\n\n## Observed response\nHTTP ${draft.actualStatus}\n\`\`\`json\n${shown(draft.actualBody)}\n\`\`\`\n\n## Differences\n${differences.length?differences.map(d=>`- ${d.path}: expected ${d.expected}; observed ${d.actual}`).join('\n'):'No difference in the supplied status and JSON. Add a failing assertion before calling this a defect.'}\n\nGenerated locally in BugProof. Verify against the real service before filing.\n`;
}
