/* The locator gathers all incident roots for expansion. Its teaching sequence
   ends at the first successful side-test result; later candidates are hidden. */
function pointLocationSequence(location){
 const first=location.trace.findIndex(t=>t.kind==='triangle'&&t.found);
 return first<0?location.trace:location.trace.slice(0,first+1);
}
