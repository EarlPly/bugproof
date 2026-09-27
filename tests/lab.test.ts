import {describe,it,expect} from 'vitest';
import {parseQuantity,expectedFor,restoreCase,initialCase,matches} from '../src/lib/lab';
describe('interactive investigation input and proof',()=>{
 it.each([['7',7],['"3"','3'],['"banana"','banana'],['null',null],['true',true],['-2',-2]])('preserves input type for %s',(raw,value)=>{expect(parseQuantity(raw as string)).toBe(value);});
 it.each(['','banana','[]','{}','1e999'])('rejects malformed or unsupported quantity %s',raw=>expect(()=>parseQuantity(raw)).toThrow());
 it('evaluates the complete reservation contract',()=>{expect(expectedFor(7)).toEqual({status:409,stock:5,reserved:0});expect(expectedFor('3')).toEqual({status:400,stock:5,reserved:0});expect(expectedFor(3)).toEqual({status:200,stock:2,reserved:3});});
 it('does not call a matching status proof when stock is wrong',()=>{expect(matches({status:409,stock:-2,reserved:0,message:'bad'},expectedFor(7))).toBe(false);});
 it('does not trust persisted result or completion claims',()=>{const x=restoreCase({...initialCase,title:'example',original:{status:200,stock:-2},verifiedAt:'forged',checks:[{}],completedMissions:['overflow','unknown']});expect(x?.original).toBeNull();expect(x?.verifiedAt).toBeNull();expect(x?.checks).toEqual([]);expect(x?.completedMissions).toEqual(['overflow']);});
 it('ignores stale storage',()=>expect(restoreCase({version:1})).toBeNull());
 it('returns malformed saved input to the report instead of opening a broken replay',()=>{const x=restoreCase({...initialCase,title:'A report',description:'Test a quantity',rawQuantity:'not JSON',reportSaved:true});expect(x?.reportSaved).toBe(false);expect(x?.rawQuantity).toBe('not JSON');});
 it('restores a valid report without duplicating earned mission badges',()=>{const x=restoreCase({...initialCase,title:'A report',description:'Test a quantity',reportSaved:true,completedMissions:['overflow','overflow']});expect(x?.reportSaved).toBe(true);expect(x?.completedMissions).toEqual(['overflow']);});
});
