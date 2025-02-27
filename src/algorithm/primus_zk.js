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

init = async () => {
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

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('offscreen onMessage message', message);
  let result;
  if (message.type === 'algorithm' && message.method === 'init') {
    result = await init();
  } else if (
    message.type === 'algorithm' &&
    message.method === 'getAttestation'
  ) {
    result = await getAttestation(message.params);
  } else if (
    message.type === 'algorithm' &&
    message.method === 'getAttestationResult'
  ) {
    result = await getAttestationResult();
  } else if (
    message.type === 'algorithm' &&
    message.method === 'startOffline'
  ) {
    result = await startOffline(message.params);
  }
  console.log('offscreen onMessage send result', result);
  sendResponse({ result });
});


