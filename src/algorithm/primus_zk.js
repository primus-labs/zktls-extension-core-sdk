// load wasm module
Module = {};
Module_callAlgorithm = null;
Module.onRuntimeInitialized = async () => {
  console.log("Module onRuntimeInitialized");
  Module_callAlgorithm = Module.cwrap('callAlgorithm', 'string', ['string']);
  chrome.runtime.sendMessage({
    resType: 'algorithm',
    resMethodName: 'start',
    res: 'RuntimeInitialized',
  });
};

// Module_callAlgorithm = null;
// const Module = require("./client_plugin.js");
// Module.onRuntimeInitialized = async () => {
//   console.log("Module onRuntimeInitialized");
//   Module_callAlgorithm = Module.cwrap('callAlgorithm', 'string', ['string']);
//   chrome.runtime.sendMessage({
//     resType: 'algorithm',
//     resMethodName: 'start',
//     res: 'RuntimeInitialized',
//   });
// }

const callAlgorithm = async (params) => {
  if (!Module_callAlgorithm) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return Module_callAlgorithm(params);
};

init = async (logLevel = 'info') => {
  const logParams = `{"method":"setLogLevel","version":"1.1.1","params":{"logLevel":"${logLevel}"}}`;
  const logResult = await callAlgorithm(logParams);

  const params = `{"method":"init","version":"1.1.1","params":{}}`;
  const result = await callAlgorithm(params);
  return JSON.parse(result);
};

getAttestation = async (paramsObj) => {
  const _paramsObj = { method: "getAttestation", version: "1.1.1", params: paramsObj };
  const params = JSON.stringify(_paramsObj);
  const result = await callAlgorithm(params);
  return JSON.parse(result);
};

getAttestationResult = async () => {
  const params = `{"method":"getAttestationResult","version":"1.1.1","params":{"requestid":"1"}}`;
  const result = await callAlgorithm(params);
  return JSON.parse(result);
}

startOffline = async (paramsObj) => {
  const _paramsObj = { method: "startOffline", version: "1.1.1", params: paramsObj };
  const params = JSON.stringify(_paramsObj);
  const result = await callAlgorithm(params);
  return JSON.parse(result);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('offscreen onMessage message', message);
  let responded = false;
  const safeSendResponse = (payload) => {
    if (responded) return;
    responded = true;
    try {
      sendResponse(payload);
    } catch (e) {
      console.warn('offscreen sendResponse error', e);
    }
  };

  (async () => {
    try {
      if (message.type === 'algorithm' && message.method === 'init') {
        const { logLevel } = message.params || {};
        const result = await init(logLevel);
        console.log('offscreen onMessage send result', result);
        safeSendResponse({ result });
      } else if (
        message.type === 'algorithm' &&
        message.method === 'getAttestation'
      ) {
        const result = await getAttestation(message.params);
        console.log('offscreen onMessage send result', result);
        safeSendResponse({ result });
      } else if (
        message.type === 'algorithm' &&
        message.method === 'getAttestationResult'
      ) {
        const result = await getAttestationResult();
        console.log('offscreen onMessage send result', result);
        safeSendResponse({ result });
      } else if (
        message.type === 'algorithm' &&
        message.method === 'startOffline'
      ) {
        const result = await startOffline(message.params);
        console.log('offscreen onMessage send result', result);
        safeSendResponse({ result });
      } else {
        safeSendResponse({
          error: 'unknown message',
          type: message?.type,
          method: message?.method,
        });
      }
    } catch (err) {
      console.error('offscreen onMessage error', err);
      safeSendResponse({
        error: err?.message ?? String(err),
        result: undefined,
      });
    }
  })();

  return true;
});


