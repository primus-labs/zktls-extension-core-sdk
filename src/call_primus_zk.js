
exports.init = async (logLevel = 'info') => {
  let res = await sendMessageAsync({
    type: 'algorithm',
    method: 'init',
    params: { logLevel }
  });
  return res.result;
};

exports.getAttestation = async (paramsObj) => {
  let res = await sendMessageAsync({
    type: 'algorithm',
    method: 'getAttestation',
    params: paramsObj
  });
  return res.result;
};

exports.getAttestationResult = async (timeout = 2 * 60 * 1000) => {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const tick = async () => {
      const timeGap = performance.now() - start;
      let resObj = null;
      try {
        let res = await sendMessageAsync({
          type: 'algorithm',
          method: 'getAttestationResult',
        });
        resObj = res.result;
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

exports.startOffline = async (paramsObj) => {
  let res = await sendMessageAsync({
    type: 'algorithm',
    method: 'startOffline',
    params: paramsObj
  });
  return res.result;
};

function sendMessageAsync(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response === undefined) {
        reject(new Error('No response from offscreen (channel closed or listener did not respond)'));
        return;
      }
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
}

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   console.log('onMessage receive message:', message);
//   const { resType, resMethodName, res } = message;
//   if (resType === 'algorithm' && resMethodName === 'init') {

//   }
// });
