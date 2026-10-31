(function(root){'use strict';
class CsvParser{
 constructor(onRow,{maxField=1048576,maxColumns=128}={}){this.onRow=onRow;this.maxField=maxField;this.maxColumns=maxColumns;this.field='';this.row=[];this.quoted=false;this.pendingQuote=false;this.afterQuote=false;this.cr=false;this.first=true;}
 push(chunk){for(let ch of chunk){if(this.first){this.first=false;if(ch==='\ufeff')continue;}
 if(this.quoted){if(this.pendingQuote){if(ch==='"'){this.field+='"';if(this.field.length>this.maxField)throw Error('A CSV cell exceeds the 1 MB safety limit.');this.pendingQuote=false;continue;}this.quoted=false;this.pendingQuote=false;this.afterQuote=true;}else{if(ch==='"')this.pendingQuote=true;else this.field+=ch;if(this.field.length>this.maxField)throw Error('A CSV cell exceeds the 1 MB safety limit.');continue;}}
 if(this.cr){this.cr=false;if(ch==='\n')continue;}
 if(this.afterQuote&&ch!==' '&&ch!=='\t'&&ch!==','&&ch!=='\r'&&ch!=='\n')throw Error('Unexpected content after a quoted CSV cell.');
 if(this.afterQuote&&(ch===' '||ch==='\t'))continue;
 if(ch===','){this.finishField();}else if(ch==='\r'||ch==='\n'){this.finishRow();this.cr=ch==='\r';}else if(ch==='"'){if(this.field.length)throw Error('Unexpected quote in an unquoted CSV cell.');this.quoted=true;}else this.field+=ch;
 if(this.field.length>this.maxField)throw Error('A CSV cell exceeds the 1 MB safety limit.');
 }}
 finishField(){this.row.push(this.field);this.field='';this.afterQuote=false;if(this.row.length>this.maxColumns)throw Error('CSV has more than 128 columns.');}
 finishRow(){this.finishField();const row=this.row;this.row=[];if(row.some(v=>v.trim()!==''))this.onRow(row);}
 end(){if(this.quoted&&!this.pendingQuote)throw Error('CSV ends inside an unclosed quoted cell.');this.quoted=false;this.pendingQuote=false;if(this.field.length||this.row.length||this.afterQuote)this.finishRow();}
}
function normaliseHeader(v){return v.trim().replace(/^\ufeff/,'').toUpperCase().replace(/[ -]+/g,'_');}
function headers(row){const h=row.map(normaliseHeader);if(new Set(h).size!==h.length)throw Error('CSV has duplicate column names.');if(h.some(k=>!k))throw Error('CSV contains an unnamed column.');return h;}
function record(keys,row){if(row.length!==keys.length)throw Error('CSV row has '+row.length+' columns; expected '+keys.length+'.');return Object.fromEntries(keys.map((k,i)=>[k,row[i]]));}
function num(x){return x===null||x===undefined||String(x).trim()===''?undefined:(Number.isFinite(Number(x))?Number(x):undefined);}
function boolean(x){if(typeof x==='boolean')return x;const s=String(x??'').trim().toLowerCase();return ['true','1','yes'].includes(s)?true:['false','0','no'].includes(s)?false:undefined;}
function time(x){const v=String(x??'').trim();if(!/^\d{1,4}$/.test(v))return undefined;const n=Number(v),h=Math.floor(n/100),m=n%100;return (h<24&&m<60)||(h===24&&m===0)?h*60+m:undefined;}
root.Csv={CsvParser,headers,record,num,boolean,time};if(typeof module!=='undefined')module.exports=root.Csv;
})(typeof window!=='undefined'?window:globalThis);
