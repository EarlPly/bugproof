export type Scalar = number | string | boolean | null;
export type Result = { status: number; stock: Scalar; reserved: Scalar; message: string };
export type Prediction = 'accept' | 'reject' | '';
export const missions = [
  { id: 'overflow', number: '01', title: 'The vanishing inventory', tag: 'BOUNDARY BUG', difficulty: 'Start here', color: 'coral', quantity: '7', summary: 'Five items on the shelf. Seven in the cart. Somehow, checkout says yes.', lesson: 'Catch an oversell before it reaches a customer.', hint: 'A reservation must never consume more stock than exists.', report: 'Reserving seven items succeeds even though only five are available. The remaining inventory becomes negative.' },
  { id: 'negative', number: '02', title: 'The infinite stock trick', tag: 'VALIDATION BUG', difficulty: 'A little sneaky', color: 'mint', quantity: '-2', summary: 'Place an order for minus two items. Watch the shelf mysteriously refill.', lesson: 'Explore what happens when an input breaks the rules.', hint: 'Quantities must be positive whole numbers.', report: 'A negative reservation adds inventory instead of being rejected. Stock should stay unchanged when the quantity is invalid.' },
  { id: 'text', number: '03', title: 'The number that wasn’t', tag: 'TYPE BUG', difficulty: 'Think differently', color: 'lilac', quantity: '"banana"', summary: 'Send a word where a number should be. Can the service still keep count?', lesson: 'See why a type assertion is not runtime validation.', hint: 'Text is not a valid quantity, even when the code casts it as a number.', report: 'Sending text as the reservation quantity returns success with NaN stock. The service should reject it and preserve the five items.' },
] as const;
export function missionFor(id: string) { return missions.find(m => m.id === id) ?? missions[0]; }
export function parseQuantity(raw: string): Scalar {
  if (!raw.trim()) throw new Error('Enter a quantity first. Try 7, -2, or "banana".');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Use a JSON value: 7 for a number, or "banana" with quotes for text.'); }
  if (value !== null && !['number', 'string', 'boolean'].includes(typeof value)) throw new Error('Use one number, text value, true, false, or null. Arrays and objects are not quantities.');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('That number is too large. Use a finite value.');
  if (typeof value === 'string' && value.length > 100) throw new Error('Keep the test value under 100 characters.');
  return value as Scalar;
}
export function expectedFor(quantity: Scalar) {
  if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity <= 0) return {status:400,stock:5,reserved:0};
  if (quantity > 5) return {status:409,stock:5,reserved:0};
  return {status:200,stock:5-quantity,reserved:quantity};
}
export function matches(result: Result, expected: ReturnType<typeof expectedFor>) {
  return result.status === expected.status && result.stock === expected.stock && result.reserved === expected.reserved;
}
export function display(value: Scalar) { return typeof value === 'string' ? value : String(value); }
export function labelStatus(status: number) { return status === 200 ? 'Accepted' : status === 409 ? 'Not enough stock' : status === 400 ? 'Invalid quantity' : 'Request error'; }
export async function runReservation(mode:'original'|'fixed', quantity: Scalar, signal?:AbortSignal):Promise<Result> {
  const response = await fetch('/api/reserve', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,quantity}),signal});
  const value = await response.json();
  if (!value || typeof value.status !== 'number' || ![200,400,409].includes(value.status) || typeof value.message !== 'string' || !('stock' in value) || !('reserved' in value)) throw new Error('The service returned an unexpected response. Please try again.');
  return value;
}
export const regressionCases: {id:string;name:string;quantity:Scalar}[] = [
  {id:'overflow',name:'Over capacity',quantity:7},{id:'valid',name:'A normal order',quantity:3},{id:'exact',name:'The last five items',quantity:5},
  {id:'zero',name:'Zero items',quantity:0},{id:'negative',name:'Negative quantity',quantity:-2},{id:'fraction',name:'Half an item',quantity:1.5},
  {id:'text',name:'A word, not a number',quantity:'banana'},{id:'string',name:'A number inside text',quantity:'3'},{id:'null',name:'Missing value',quantity:null},
  {id:'boolean',name:'True is not a quantity',quantity:true},{id:'unsafe',name:'Unsafe integer',quantity:Number.MAX_SAFE_INTEGER+1},
];
export type Check = {id:string;name:string;quantity:Scalar;original:Result;fixed:Result;originalPassed:boolean;fixedPassed:boolean};
export type CaseState = {version:2;missionId:string;title:string;description:string;rawQuantity:string;reportSaved:boolean;prediction:Prediction;original:Result|null;fixed:Result|null;replayStep:number;guardChoice:string;checks:Check[];verifiedAt:string|null;completedMissions:string[]};
export const initialCase: CaseState = {version:2,missionId:'overflow',title:'',description:'',rawQuantity:'7',reportSaved:false,prediction:'',original:null,fixed:null,replayStep:0,guardChoice:'',checks:[],verifiedAt:null,completedMissions:[]};
export function newCase(id:string,completedMissions:string[]=[]):CaseState {const m=missionFor(id);return {...initialCase,missionId:m.id,title:m.title,rawQuantity:m.quantity,completedMissions};}
export function restoreCase(value:unknown):CaseState|null {
  if (!value || typeof value !== 'object') return null;
  const v=value as Partial<CaseState>;
  if(v.version!==2||typeof v.missionId!=='string'||typeof v.title!=='string'||typeof v.description!=='string'||typeof v.rawQuantity!=='string'||!Array.isArray(v.completedMissions))return null;
  // Only restore bounded user inputs. Request results must be run again after refresh.
  const title=v.title.slice(0,100),description=v.description.slice(0,1000),rawQuantity=v.rawQuantity.slice(0,120);
  let validQuantity=false;
  try {parseQuantity(rawQuantity);validQuantity=true;} catch {}
  return {...newCase(v.missionId,[...new Set(v.completedMissions.filter(x=>typeof x==='string'&&missions.some(m=>m.id===x)))]),title,description,rawQuantity,reportSaved:v.reportSaved===true&&validQuantity&&Boolean(title.trim())&&Boolean(description.trim())};
}
