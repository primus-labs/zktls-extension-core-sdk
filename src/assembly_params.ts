import { v4 as uuidv4 } from 'uuid';
import { AttNetworkRequest, AttNetworkResponseResolve, SignedAttRequest } from './index.d';
import { AlgorithmUrls } from './classes/AlgorithmUrls';


export function assemblyParams(att: SignedAttRequest, algorithmUrls: AlgorithmUrls) {
    let { primusMpcUrl, primusProxyUrl, proxyUrl } = algorithmUrls
    let padoUrl = primusProxyUrl;
    let modelType = "proxytls";
    const { attRequest: { request, responseResolves, attMode, userAddress, appId, additionParams, sslCipher, requestInterval }, appSignature } = att
    const requestUrl = Array.isArray(request) ? request[0].url : request.url;
    let host = new URL(requestUrl).host;
    const requestid = uuidv4();
    if (attMode?.algorithmType === "mpctls") {
        padoUrl = primusMpcUrl;
        modelType = "mpctls"
    }
    console.log('assemblyParams', padoUrl, proxyUrl, modelType);
    let timestamp = (+ new Date()).toString();
    const attestationParams = {
        source: "source", // not empty
        requestid,
        padoUrl,
        proxyUrl,
        getdatatime: timestamp,
        credVersion: "1.0.5",
        modelType, // one of [mpctls, proxytls]
        user: {
            userid: "0",
            address: userAddress,
            token: "",
        },
        authUseridHash: "",
        appParameters: {
            appId: appId,
            appSignParameters: JSON.stringify(att.attRequest),
            appSignature: appSignature,
            additionParams: additionParams || ''
        },
        reqType: "web",
        host,
        requests: assemblyRequest(request),
        responses: assemblyResponse(responseResolves),
        templateId: "",
        padoExtensionVersion: "0.3.21",
        cipher: sslCipher,
        requestIntervalMs: String(requestInterval),
    };
    // console.log('attestationParams====', attestationParams.responses[0].conditions);
    return attestationParams;
}

function assemblyRequest(request: AttNetworkRequest | AttNetworkRequest[]) {
    const requests = Array.isArray(request) ? request : [request]
    return requests.map(({ url, header, method, body, bodyEncoding }, idx) => {
        return {
            url,
            method,
            headers: {
                ...header,
                'Accept-Encoding': 'identity',
            },
            body,
            ...(bodyEncoding ? { bodyEncoding } : {}),
            name: `${url}-${idx}`
        };
    })
}

function _getField(parsePath: string, op?: string, parseType?: string) {
    const formatPath = parseType === 'html' ? parsePath.endsWith('?') ? parsePath : `${parsePath}?` : parsePath;
    if (op === "SHA256_EX") {
      return { "type": "FIELD_ARITHMETIC", "op": "SHA256", "field": formatPath };
    }
    return formatPath;
  }
function _getOp(op?: string) {
    if (op === "SHA256_EX") {
        return "REVEAL_HEX_STRING";
    }
    return op ? op: 'REVEAL_STRING';
}
function _getType(op?: string) {
    if (['>', '>=', '=', '!=', '<', '<=', 'STREQ', 'STRNEQ'].includes(op ?? "")) {
        return 'FIELD_RANGE';
    } else if (op === 'SHA256') {
        return "FIELD_VALUE"
    }
    return "FIELD_REVEAL"
}

function assemblyResponse(responseResolves: AttNetworkResponseResolve[] | AttNetworkResponseResolve[][]) {
    const groups = Array.isArray(responseResolves[0])
        ? responseResolves as AttNetworkResponseResolve[][]
        : [responseResolves as AttNetworkResponseResolve[]];
    return groups.map(subArr => {
      const subconditions = subArr.map(({ keyName, parsePath, op, value, parseType }) => ({
        field: _getField(parsePath, op, parseType || 'json'),
        reveal_id: keyName,
        op: _getOp(op),
        type: _getType(op),
        value
      }));
      return {
        conditions: {
          type: 'CONDITION_EXPANSION',
          op: 'BOOLEAN_AND',
          subconditions
        }
      };
    });
  }
