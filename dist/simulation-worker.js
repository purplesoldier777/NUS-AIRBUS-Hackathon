importScripts('hard-rules.js','engine.js');
self.onmessage=({data:x})=>{const started=performance.now();try{const result=RecoveryEngine.run(x.scenario,x.options);postMessage({id:x.id,result,compute_ms:performance.now()-started});}catch(error){postMessage({id:x.id,error:error.message});}};
