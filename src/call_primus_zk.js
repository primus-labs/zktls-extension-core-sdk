
exports.init = async () => {
  let res = await sendMessageAsync({
    type: 'algorithm',
    method: 'init',
  });
  return res.result;
};

exports.getAttestation = async (paramsObj) => {
  return {retcode:"0"};
};

exports.getAttestationResult = async (timeout = 2 * 60 * 1000) => {
  return {retcode:"0"};
}

function sendMessageAsync(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError));
      } else {
        resolve(response);
      }
    });
  });
}

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//   console.log('onMessage receive message:', message);
//   const { resType, resMethodName, res } = message;
//   if (resType === 'algorithm' && resMethodName === 'init') {

//   }
// });
