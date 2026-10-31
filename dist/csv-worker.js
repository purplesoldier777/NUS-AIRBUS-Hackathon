importScripts('csv.js');
let selectedFile=null;
async function scan(file,onRecord,id,token){let keys=null,count=0,bytes=0,last=0;const decoder=new TextDecoder('utf-8',{fatal:true}),parser=new Csv.CsvParser(row=>{if(!keys){keys=Csv.headers(row);return;}count++;onRecord(Csv.record(keys,row),count,keys);});
const reader=file.stream().getReader();while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;parser.push(decoder.decode(value,{stream:true}));const now=Date.now();if(now-last>200){postMessage({id,type:'progress',cohort_token:token,progress:bytes/file.size,rows:count});last=now;}}
parser.push(decoder.decode());parser.end();if(!keys||!count)throw Error('CSV is empty or contains no data rows.');return {keys,count};}
function isDot(h){return ['YEAR','MONTH','DAY','AIRLINE','FLIGHT_NUMBER','ORIGIN_AIRPORT','DESTINATION_AIRPORT','SCHEDULED_ARRIVAL','WEATHER_DELAY','LATE_AIRCRAFT_DELAY','CANCELLED','DIVERTED'].every(k=>h.includes(k));}
function eligible(r){return Csv.num(r.YEAR)===2015&&Csv.num(r.CANCELLED)!==1&&Csv.num(r.DIVERTED)!==1&&(Csv.num(r.WEATHER_DELAY)>15||Csv.num(r.LATE_AIRCRAFT_DELAY)>20)&&Csv.time(r.SCHEDULED_ARRIVAL)!==undefined;}
self.onmessage=async({data:x})=>{try{
 if(x.type==='inspect'){selectedFile=x.file;if(!selectedFile||selectedFile.size>1073741824)throw Error('Choose a CSV no larger than 1 GB. Large DOT files are streamed locally.');let mode=null,qualifying=0,anchors=[],simple=[],skipped=0;
 const result=await scan(selectedFile,(r,index,h)=>{if(!mode){mode=isDot(h)?'dot':'operational';if(mode==='operational'&&!['CALLSIGN','ETA','FUEL'].every(k=>h.includes(k)))throw Error('Expected the DOT flight-delay headers or an operational CSV with CALLSIGN, ETA and FUEL. Download the template for the complete format.');}if(mode==='dot'){if(eligible(r)){qualifying++;const filter=x.filters||{},date=[r.YEAR,String(r.MONTH).padStart(2,'0'),String(r.DAY).padStart(2,'0')].join('-');if((!filter.airport||r.DESTINATION_AIRPORT===filter.airport)&&(!filter.date||date===filter.date)&&anchors.length<200)anchors.push({index,row:r});}}else if(simple.length<1000)simple.push({index,row:r});else skipped++;},x.id);
 if(mode==='dot'&&!anchors.length)throw Error('No non-cancelled 2015 rows match these filters and the required delay thresholds. Clear the airport/date filter or choose another CSV.');
 postMessage({id:x.id,type:'inspected',mode,rows:result.count,headers:result.keys,qualifying,anchors,records:simple,skipped});
 }else if(x.type==='cohort'){if(!selectedFile)throw Error('Select a CSV first.');const anchor=x.anchor,rows=[],a=anchor.row,at=Csv.time(a.SCHEDULED_ARRIVAL);let total=0;
 await scan(selectedFile,(r,index)=>{if(r.YEAR!==a.YEAR||r.MONTH!==a.MONTH||r.DAY!==a.DAY||r.DESTINATION_AIRPORT!==a.DESTINATION_AIRPORT||Csv.num(r.CANCELLED)===1||Csv.num(r.DIVERTED)===1)return;const t=Csv.time(r.SCHEDULED_ARRIVAL);if(t===undefined||Math.abs(t-at)>60)return;total++;if(rows.length<1000)rows.push({index,row:r});},x.id,x.cohort_token);
 rows.sort((x,y)=>(x.index===anchor.index?-1:y.index===anchor.index?1:Math.abs(Csv.time(x.row.SCHEDULED_ARRIVAL)-at)-Math.abs(Csv.time(y.row.SCHEDULED_ARRIVAL)-at)||x.index-y.index));
 postMessage({id:x.id,type:'cohort',cohort_token:x.cohort_token,records:rows,total,anchor});
 }
}catch(error){postMessage({id:x.id,type:'error',message:error.message});}};
