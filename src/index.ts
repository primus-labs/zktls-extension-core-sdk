import { ethers } from 'ethers';
import { PADOADDRESS } from './config/constants'
import { AttNetworkRequest, AttNetworkResponseResolve, SignedAttRequest, Attestation } from './index.d'
// import { ZkAttestationError } from './error'
import { AttRequest } from './classes/AttRequest'
import { AlgorithmUrls } from "./classes/AlgorithmUrls";
import { encodeAttestation } from "./utils";
import { init, getAttestation, getAttestationResult } from "./call_primus_zk";
import { assemblyParams } from './assembly_params';
import { ZkAttestationError } from './classes/Error'
import { AttestationErrorCode } from 'config/error';

class PrimusExtCoreTLS {
  appId: string;
  appSecret?: string;
  algoUrls?: AlgorithmUrls

  constructor() {
    this.appId = '';
    this.appSecret = '';
    const isNodeEnv = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (isNodeEnv) {
      this.algoUrls = undefined;
    } else {
      this.algoUrls = new AlgorithmUrls();
    }
  }

  async init(appId: string, appSecret?: string): Promise<string | boolean> {
    this.appId = appId;
    this.appSecret = appSecret;
    const isNodeEnv = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (appSecret && isNodeEnv) {
      return Promise.resolve(true)
    } else {
      return await init();
    }
  }

  generateRequestParams(request: AttNetworkRequest, 
    responseResolves: AttNetworkResponseResolve[], 
    userAddress?: string): AttRequest {
    const userAddr = userAddress? userAddress: "0x0000000000000000000000000000000000000000";
    return new AttRequest({
      appId: this.appId,
      request,
      responseResolves,
      userAddress: userAddr
    })
  }

  async sign(signParams: string): Promise<string> {
    if (this.appSecret) {
      const wallet = new ethers.Wallet(this.appSecret);
      const messageHash = ethers.utils.keccak256(new TextEncoder().encode(signParams));
      const sig = await wallet.signMessage(messageHash);
      const result: SignedAttRequest = {
        attRequest: JSON.parse(signParams),
        appSignature: sig
      };
      return JSON.stringify(result);
    } else {
      throw new Error("Must pass appSecret");
    }
  }

  async startAttestation(attestationParamsStr: string): Promise<any> {
    try {
      const signedAttRequest = JSON.parse(attestationParamsStr) as SignedAttRequest;
      const attParams = assemblyParams(signedAttRequest, this.algoUrls);
      const getAttestationRes = await getAttestation(attParams);
      if (getAttestationRes.retcode !== "0") {
        return Promise.reject(new ZkAttestationError('00001'))
      }
      const res:any = await getAttestationResult();
      const {retcode, content, details } = res
      if (retcode === '0') {
        const { balanceGreaterThanBaseValue, signature, encodedData, extraData} = content
        if (balanceGreaterThanBaseValue === 'true' && signature) {
          return Promise.resolve(JSON.parse(encodedData))
        } else if (!signature || balanceGreaterThanBaseValue === 'false') {
          let errorCode;
          if (
            extraData &&
            JSON.parse(extraData) &&
            ['-1200010', '-1002001', '-1002002'].includes(
              JSON.parse(extraData).errorCode + ''
            )
          ) {
            errorCode = JSON.parse(extraData).errorCode + '';
          } else {
            errorCode = '00104';
          }
          return Promise.reject(new ZkAttestationError(errorCode as AttestationErrorCode, '', res))
        }
      } else if (retcode === '2') {
        const { errlog: { code } } = details;
        return Promise.reject(new ZkAttestationError(code, '', res))
      } 
    } catch (e: any) {
      if (e?.code === 'timeout') {
        return Promise.reject(new ZkAttestationError('00002','', e.data))
      } else {
        return Promise.reject(e)
      }
    }
  }

  verifyAttestation(attestation: Attestation): boolean {
    const encodeData = encodeAttestation(attestation);
    const signature = attestation.signatures[0];
    const result = ethers.utils.recoverAddress(encodeData, signature);
    const verifyResult = PADOADDRESS.toLowerCase() === result.toLowerCase();
    return verifyResult
  }

}

export { PrimusExtCoreTLS, Attestation };