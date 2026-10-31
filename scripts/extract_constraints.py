"""Extract the supplied workbook without modifying it; preserve every source cell."""
import json,zipfile,xml.etree.ElementTree as E,sys,re,shutil,hashlib
from pathlib import Path
source=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1];n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(source) as z:
 ss=[''.join(t.itertext()) for t in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',n)] if 'xl/sharedStrings.xml' in z.namelist() else []
 sheets={}
 for i,name in enumerate(['airport_capacity','wake_separation','fuel_and_crew','rules_of_play'],1):
  cells={}
  for c in E.fromstring(z.read(f'xl/worksheets/sheet{i}.xml')).findall('.//s:sheetData/s:row/s:c',n):
   v=c.find('s:v',n);value=v.text if v is not None else ''.join(c.find('s:is',n).itertext()) if c.find('s:is',n) is not None else ''
   if c.get('t')=='s':value=ss[int(value)]
   cells[c.get('r')]=value
  sheets[name]=cells
 c=sheets['airport_capacity'];airports={}
 for row in sorted({int(re.sub(r'\D','',k)) for k in c}):
  if row<4 or not c.get(f'A{row}'):continue
  code=c[f'A{row}'];airports[code]={'name':c.get(f'B{row}'),'row':row,**{field:float(c[f'{col}{row}']) for field,col in [('runways','G'),('gates','H'),('movements_per_hour','I'),('minimum_turnaround','J'),('spare_gates','K')]},'sources':{field:f'airport_capacity!{col}{row}' for field,col in [('runways','G'),('gates','H'),('movements_per_hour','I'),('minimum_turnaround','J'),('spare_gates','K')]}}
 data={'file':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'synthetic':True,'airports':airports,'sheets':sheets}
 (root/'dist/constraints-data.js').write_text('(function(r){r.CHALLENGE_CONSTRAINTS='+json.dumps(data,separators=(',',':'))+';if(typeof module!=="undefined")module.exports=r.CHALLENGE_CONSTRAINTS;})(typeof window!=="undefined"?window:globalThis);')
 shutil.copyfile(source,root/'dist/challenge2_operational_constraints.xlsx')
 print(json.dumps({'airports':len(airports),'MSY':airports.get('MSY'),'source':str(source)}))
