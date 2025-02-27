// load wasm module
Module_callAlgorithm = null;
const Module = require("./client_plugin.js");
Module.onRuntimeInitialized = async () => {
  console.log("Module onRuntimeInitialized");
  Module_callAlgorithm = Module.cwrap('callAlgorithm', 'string', ['string']);
  chrome.runtime.sendMessage({
    resType: 'algorithm',
    resMethodName: 'start',
    res: 'RuntimeInitialized',
  });
}

const callAlgorithm = async (params) => {
  if (!Module_callAlgorithm) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return Module_callAlgorithm(params);
};

exports.init = async () => {
  const params = `{"method":"init","version":"1.1.1","params":{}}`;
  const result = await callAlgorithm(params);
  return result;
};

exports.getAttestation = async (paramsObj) => {
  const _paramsObj = { method: "getAttestation", version: "1.1.1", params: paramsObj };
  const params = JSON.stringify(_paramsObj);
  const result = await callAlgorithm(params);
  return JSON.parse(result);
};

exports.getAttestationResult = async (timeout = 2 * 60 * 1000) => {
  const params = `{"method":"getAttestationResult","version":"1.1.1","params":{"requestid":"1"}}`;

  return new Promise((resolve, reject) => {
    const start = performance.now();
    const tick = async () => {
      const timeGap = performance.now() - start;
      let resObj = null;
      try {
        const res = await callAlgorithm(params);
        resObj = JSON.parse(res);
      } catch (err) {
      }

      if (resObj && (resObj.retcode == "0" || resObj.retcode == "2")) {
        resolve(resObj);
      } else if (timeGap > timeout) {
        reject({
          code: 'timeout',
          data: resObj
        });
      } else {
        setTimeout(tick, 1000);
      }
    };
    tick();
  });
}

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('offscreen onMessage message', message);
  let result;
  if (message.type === 'algorithm' && message.method === 'init') {
    result = await init(message.params);
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
  sendResponse({ result });
});


