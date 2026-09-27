import {describe,expect,it} from 'vitest';
import {compare,validateDraft,vitestSnippet,type Draft} from '../src/lib/workbench';

const sample:Draft={title:'Inventory oversell',path:'/api/reserve',method:'POST',request:{quantity:7},expectedStatus:409,expectedBody:{stock:5,reserved:0},actualStatus:200,actualBody:{stock:-2,reserved:7}};
describe('developer workbench output',()=>{
 it('shows status and exact nested JSON differences',()=>{const result=compare({...sample,expectedBody:{stock:5,meta:{reserved:0}},actualBody:{stock:-2,meta:{reserved:7}}});expect(result).toEqual([{path:'HTTP status',expected:'409',actual:'200'},{path:'response.stock',expected:'5',actual:'-2'},{path:'response.meta.reserved',expected:'0',actual:'7'}]);});
 it('does not invent a difference for the same response',()=>expect(compare({...sample,actualStatus:409,actualBody:{stock:5,reserved:0}})).toEqual([]));
 it('escapes titles and paths in generated tests and asserts the expected contract',()=>{const code=vitestSnippet({...sample,title:'A "quoted" case',path:'/api/test?value=7'});expect(code).toContain('test("A \\"quoted\\" case"');expect(code).toContain('new URL("/api/test?value=7", baseUrl)');expect(code).toContain('expect(response.status).toBe(409)');expect(code).toContain('expect(await response.json()).toEqual(');});
 it('rejects an external URL as an endpoint',()=>expect(()=>validateDraft({...sample,path:'https://example.com/private'})).toThrow(/relative endpoint/));
});
