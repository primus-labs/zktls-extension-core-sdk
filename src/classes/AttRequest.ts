import type { AttMode, AttNetworkRequest, AttNetworkResponseResolve, BaseAttestationParams, AttSslCipher} from '../index.d'
import { getInstanceProperties } from '../utils'

export class AttRequest {
  appId: string;
  request?: AttNetworkRequest | AttNetworkRequest[];
  responseResolves?: AttNetworkResponseResolve[] | AttNetworkResponseResolve[][];
  userAddress: string;
  timestamp: number;
  
  attMode?: AttMode;
  attConditions?: object;
  additionParams?: string;
  sslCipher?: AttSslCipher;
  requestInterval?: number; // in milliseconds

  constructor(baseAttestationParams: BaseAttestationParams) {
    const { appId, userAddress, request, responseResolves } = baseAttestationParams
    this.appId = appId
    this.userAddress = userAddress
    this.timestamp = + new Date()
    this.attMode = {
      algorithmType: 'proxytls',
      resultType: 'plain'
    }
    this.request = request
    this.responseResolves = responseResolves
    this.sslCipher = "ECDHE-RSA-AES128-GCM-SHA256";
    this.requestInterval = -1;
  }
  setAdditionParams(additionParams: string) {
    this.additionParams = additionParams
  }
  setAttMode({algorithmType, resultType='plain'}: AttMode) {
    this.attMode = {
      algorithmType,
      resultType
    };
  }
  setAttConditions(attConditions: Object) {
    this.attConditions = attConditions
  }
  setSslCipher(sslCipher :AttSslCipher) {
    this.sslCipher = sslCipher;
  }
  setRequestInterval(requestInterval: number) {
    this.requestInterval = requestInterval;
  }
  toJsonString() {
    return JSON.stringify(getInstanceProperties(this));
  }
}





