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
import { getAppQuote } from './api';
import { eventReport } from './utils/eventReport'
import { ClientType } from './api/index.d';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json') as { name: string; version: string };

class PrimusExtCoreTLS {
  appId: string;
  appSecret?: string;
  algoUrls?: AlgorithmUrls;
  private _isAttesting: boolean = false;

  constructor() {
    this.appId = '';
    this.appSecret = '';
    this.algoUrls = new AlgorithmUrls();
  }

  async init(appId: string, appSecret?: string): Promise<string | boolean> {
    this.appId = appId;
    this.appSecret = appSecret;
    return await init();
  }

  private _validateRequest(request: AttNetworkRequest, index?: number): void {
    if (!request || typeof request !== 'object') {
      const errorMsg = index !== undefined 
        ? `Invalid request object at index ${index}`
        : 'Invalid request object';
      throw new ZkAttestationError('00005', errorMsg);
    }

    // Validate URL
    if (!request.url || typeof request.url !== 'string' || request.url.trim() === '') {
      const errorMsg = index !== undefined
        ? `Missing or invalid request.url at index ${index}`
        : 'Missing or invalid request.url';
      throw new ZkAttestationError('00005', errorMsg);
    }

    // Validate URL format
    try {
      new URL(request.url.trim());
    } catch (e) {
      const errorMsg = index !== undefined
        ? `Invalid URL format at index ${index}: ${request.url}`
        : `Invalid URL format: ${request.url}`;
      throw new ZkAttestationError('00005', errorMsg);
    }

    // Validate method
    if (!request.method || typeof request.method !== 'string' || request.method.trim() === '') {
      const errorMsg = index !== undefined
        ? `Missing or invalid request.method at index ${index}`
        : 'Missing or invalid request.method';
      throw new ZkAttestationError('00005', errorMsg);
    }

    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];
    const methodUpper = request.method.trim().toUpperCase();
    if (!validMethods.includes(methodUpper)) {
      const errorMsg = index !== undefined
        ? `Invalid HTTP method at index ${index}: ${request.method}. Valid methods are: ${validMethods.join(', ')}`
        : `Invalid HTTP method: ${request.method}. Valid methods are: ${validMethods.join(', ')}`;
      throw new ZkAttestationError('00005', errorMsg);
    }
  }

  generateRequestParams(request: AttNetworkRequest | AttNetworkRequest[],
    responseResolves: AttNetworkResponseResolve[] | AttNetworkResponseResolve[][],
    userAddress?: string): AttRequest {
    // Validate request parameter
    if (request === undefined || request === null) {
      throw new ZkAttestationError('00005', 'Missing request parameter');
    }

    if (Array.isArray(request)) {
      if (request.length === 0) {
        throw new ZkAttestationError('00005', 'Request array cannot be empty');
      }
      request.forEach((req, index) => {
        this._validateRequest(req, index);
      });
    } else {
      this._validateRequest(request);
    }

    const userAddr = userAddress ? userAddress : "0x0000000000000000000000000000000000000000";
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

  private _validateAttestationParams(signedAttRequest: SignedAttRequest, timeout: number): void {
    // Validate signedAttRequest exists
    if (!signedAttRequest) {
      throw new ZkAttestationError('00005', 'Missing signedAttRequest parameter')
    }

    // Validate appSignature
    if (!signedAttRequest.appSignature || typeof signedAttRequest.appSignature !== 'string' || signedAttRequest.appSignature.trim() === '') {
      throw new ZkAttestationError('00005', 'Missing or invalid appSignature')
    }

    // Validate attRequest exists
    if (!signedAttRequest.attRequest) {
      throw new ZkAttestationError('00005', 'Missing attRequest parameter')
    }

    const attRequest = signedAttRequest.attRequest;

    // Validate appId
    if (!attRequest.appId || typeof attRequest.appId !== 'string' || attRequest.appId.trim() === '') {
      throw new ZkAttestationError('00005', 'Missing or invalid appId')
    }

    // Validate userAddress
    if (!attRequest.userAddress || typeof attRequest.userAddress !== 'string' || attRequest.userAddress.trim() === '') {
      throw new ZkAttestationError('00005', 'Missing or invalid userAddress')
    }

    // Validate userAddress format (Ethereum address)
    if (!ethers.utils.isAddress(attRequest.userAddress)) {
      throw new ZkAttestationError('00005', 'Invalid userAddress format')
    }

    // Validate timeout
    if (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0) {
      throw new ZkAttestationError('00005', 'Invalid timeout parameter')
    }

    // Validate timestamp (required in FullAttestationParams)
    if (attRequest.timestamp === undefined || attRequest.timestamp === null) {
      throw new ZkAttestationError('00005', 'Missing timestamp parameter')
    }
    if (typeof attRequest.timestamp !== 'number' || !Number.isFinite(attRequest.timestamp)) {
      throw new ZkAttestationError('00005', 'Invalid timestamp parameter')
    }
    if (attRequest.timestamp <= 0) {
      throw new ZkAttestationError('00005', 'Timestamp must be a positive number')
    }

    // Validate attMode if provided
    if (attRequest.attMode !== undefined) {
      if (!attRequest.attMode || typeof attRequest.attMode !== 'object') {
        throw new ZkAttestationError('00005', 'Invalid attMode parameter')
      }
      if (!attRequest.attMode.algorithmType || typeof attRequest.attMode.algorithmType !== 'string') {
        throw new ZkAttestationError('00005', 'Missing or invalid attMode.algorithmType')
      }
      if (!['mpctls', 'proxytls'].includes(attRequest.attMode.algorithmType)) {
        throw new ZkAttestationError('00005', 'Invalid attMode.algorithmType, must be one of: mpctls, proxytls')
      }
      if (attRequest.attMode.resultType !== undefined) {
        if (typeof attRequest.attMode.resultType !== 'string') {
          throw new ZkAttestationError('00005', 'Invalid attMode.resultType')
        }
        if (!['plain', 'cipher'].includes(attRequest.attMode.resultType)) {
          throw new ZkAttestationError('00005', 'Invalid attMode.resultType, must be one of: plain, cipher')
        }
      }
    }

    // Validate attConditions if provided
    if (attRequest.attConditions !== undefined && attRequest.attConditions !== null) {
      if (typeof attRequest.attConditions !== 'object' || Array.isArray(attRequest.attConditions)) {
        throw new ZkAttestationError('00005', 'Invalid attConditions parameter, must be an object')
      }
    }

    // Validate additionParams if provided
    if (attRequest.additionParams !== undefined && attRequest.additionParams !== null) {
      if (typeof attRequest.additionParams !== 'string') {
        throw new ZkAttestationError('00005', 'Invalid additionParams parameter, must be a string')
      }
    }

    // Validate sslCipher if provided
    if (attRequest.sslCipher !== undefined && attRequest.sslCipher !== null) {
      if (typeof attRequest.sslCipher !== 'string') {
        throw new ZkAttestationError('00005', 'Invalid sslCipher parameter, must be a string')
      }
      const validSslCiphers = ['ECDHE-RSA-AES128-GCM-SHA256', 'ECDHE-ECDSA-AES128-GCM-SHA256'];
      if (!validSslCiphers.includes(attRequest.sslCipher)) {
        throw new ZkAttestationError('00005', `Invalid sslCipher, must be one of: ${validSslCiphers.join(', ')}`)
      }
    }

    // Validate requestInterval if provided
    if (attRequest.requestInterval !== undefined && attRequest.requestInterval !== null) {
      if (typeof attRequest.requestInterval !== 'number' || !Number.isFinite(attRequest.requestInterval)) {
        throw new ZkAttestationError('00005', 'Invalid requestInterval parameter, must be a number')
      }
    }

    // Validate request if provided
    if (attRequest.request !== undefined) {
      if (Array.isArray(attRequest.request)) {
        if (attRequest.request.length === 0) {
          throw new ZkAttestationError('00005', 'Request array cannot be empty')
        }
        attRequest.request.forEach((req, index) => {
          try {
            this._validateRequest(req, index)
          } catch (error: any) {
            throw new ZkAttestationError('00005', `Invalid request at index ${index}: ${error.message || error}`)
          }
        })
      } else {
        try {
          this._validateRequest(attRequest.request)
        } catch (error: any) {
          throw new ZkAttestationError('00005', `Invalid request: ${error.message || error}`)
        }
      }
    }

    // Validate responseResolves if provided
    if (attRequest.responseResolves !== undefined) {
      const validateResponseResolve = (resolve: AttNetworkResponseResolve) => {
        if (!resolve || typeof resolve !== 'object') {
          throw new ZkAttestationError('00005', 'Invalid responseResolve object')
        }
        if (!resolve.keyName || typeof resolve.keyName !== 'string' || resolve.keyName.trim() === '') {
          throw new ZkAttestationError('00005', 'Missing or invalid responseResolve.keyName')
        }
        if (!resolve.parsePath || typeof resolve.parsePath !== 'string' || resolve.parsePath.trim() === '') {
          throw new ZkAttestationError('00005', 'Missing or invalid responseResolve.parsePath')
        }
      }

      if (Array.isArray(attRequest.responseResolves)) {
        if (attRequest.responseResolves.length === 0) {
          throw new ZkAttestationError('00005', 'ResponseResolves array cannot be empty')
        }
        // Check if it's a nested array (AttNetworkResponseResolve[][])
        const firstItem = attRequest.responseResolves[0]
        if (Array.isArray(firstItem)) {
          // Nested array case
          (attRequest.responseResolves as AttNetworkResponseResolve[][]).forEach((resolveArray, arrayIndex) => {
            if (!Array.isArray(resolveArray) || resolveArray.length === 0) {
              throw new ZkAttestationError('00005', `ResponseResolves array at index ${arrayIndex} is invalid`)
            }
            resolveArray.forEach((resolve, resolveIndex) => {
              try {
                validateResponseResolve(resolve)
              } catch (error: any) {
                throw new ZkAttestationError('00005', `Invalid responseResolve at [${arrayIndex}][${resolveIndex}]: ${error.message || error}`)
              }
            })
          })
        } else {
          // Flat array case (AttNetworkResponseResolve[])
          (attRequest.responseResolves as AttNetworkResponseResolve[]).forEach((resolve, index) => {
            try {
              validateResponseResolve(resolve)
            } catch (error: any) {
              throw new ZkAttestationError('00005', `Invalid responseResolve at index ${index}: ${error.message || error}`)
            }
          })
        }
      }
    }
  }

  async startAttestation(attestationParamsStr: string, timeout: number = 2 * 60 * 1000): Promise<any> {
    let eventReportBaseParams: {
      source: string;
      clientType: ClientType;
      appId: string;
      templateId: string;
      address: string;
      ext: {};
    } | undefined;
    
    try {
      const signedAttRequest = JSON.parse(attestationParamsStr) as SignedAttRequest;
      // Validate parameters
      this._validateAttestationParams(signedAttRequest, timeout);

       // Check if there's already an attestation in progress
      if (this._isAttesting) {
        const errorCode = '00003';
        return Promise.reject(new ZkAttestationError(errorCode))
      }

      // Set attestation flag
      this._isAttesting = true;

      eventReportBaseParams = {
        source: "",
        clientType: packageJson.name as ClientType,
        appId: signedAttRequest.attRequest.appId,
        templateId: "",
        address: signedAttRequest.attRequest.userAddress,
        ext: {}
      }

      // Check app quote before starting attestation
      // Only business logic errors (ZkAttestationError) will be thrown
      // Network errors will be caught and logged, but won't stop execution
      await this._checkAppQuote();

      if (!this.algoUrls) {
        throw new ZkAttestationError('00005', 'AlgorithmUrls not initialized')
      }
      const attParams = assemblyParams(signedAttRequest, this.algoUrls);
      const getAttestationRes = await getAttestation(attParams);
      if (getAttestationRes.retcode !== "0") {
        const errorCode = getAttestationRes.retcode === '2' ? '00001' : '00000';
        await eventReport({
          ...eventReportBaseParams,
          status: "FAILED",
          detail: {
            code: errorCode,
            desc: ""
          },
        })
        return Promise.reject(new ZkAttestationError('00001'))
      }
      const res:any = await getAttestationResult(timeout);
      const {retcode, content, details } = res
      if (retcode === '0') {
        const { balanceGreaterThanBaseValue, signature, encodedData, extraData} = content
        if (balanceGreaterThanBaseValue === 'true' && signature) {
          await eventReport({
            ...eventReportBaseParams,
            status: "SUCCESS",
          })
          return Promise.resolve(JSON.parse(encodedData))
        } else if (!signature || balanceGreaterThanBaseValue === 'false') {
          let errorCode;
          if (
            extraData &&
            JSON.parse(extraData) &&
            ['-1200010', '-1002001', '-1002002', '-1002003', '-1002004', '-1002005'].includes(
              JSON.parse(extraData).errorCode + ''
            )
          ) {
            errorCode = JSON.parse(extraData).errorCode + '';
          } else {
            errorCode = '00104';
          }
          await eventReport({
            ...eventReportBaseParams,
            status: "FAILED",
            detail: {
              code: errorCode,
              desc: ""
            },
          })
          return Promise.reject(new ZkAttestationError(errorCode as AttestationErrorCode, '', res))
        }
      } else if (retcode === '2') {
        const { errlog: { code } } = details;
        await eventReport({
          ...eventReportBaseParams,
          status: "FAILED",
          detail: {
            code,
            desc: ""
          },
        })
        return Promise.reject(new ZkAttestationError(code, '', res))
      } 
    } catch (e: any) {
      if (e?.code === 'timeout' && eventReportBaseParams) {
        await eventReport({
          ...eventReportBaseParams,
          status: "FAILED",
          detail: {
            code: '00002',
            desc: ""
          },
          ext: {
            getAttestationResultRes: JSON.stringify(e.data)
          }
        })
        return Promise.reject(new ZkAttestationError('00002','', e.data))
      } else {
        return Promise.reject(e)
      }
    } finally {
      // Always clear the attestation flag when done
      this._isAttesting = false;
    }
  }

  verifyAttestation(attestation: Attestation): boolean {
    const encodeData = encodeAttestation(attestation);
    const signature = attestation.signatures[0];
    const result = ethers.utils.recoverAddress(encodeData, signature);
    const verifyResult = PADOADDRESS.toLowerCase() === result.toLowerCase();
    return verifyResult
  }

  /**
   * Check app quote and perform business logic based on the result
   * @private
   * @throws {ZkAttestationError} Only throws business logic errors, network errors are caught and ignored
   */
  private async _checkAppQuote(): Promise<void> {
    try {
      const {rc, result} = await getAppQuote({ appId: this.appId });
      // console.log('_checkAppQuote', result)
      // Business logic based on quote result
      if (rc !== 0) {
        // Handle error case - you can customize this based on your requirements
        console.warn('App quote check failed:', result?.msg);
        // Optionally throw error or handle differently based on business requirements
        // throw new ZkAttestationError('00005', result?.msg || 'App quote check failed');
      }
      if (!result ) { 
        throw new ZkAttestationError('-1002001');
      }
      if (!result.expiryTime && (!result.remainingQuota  || result.remainingQuota <= 0 ) ) {
        throw new ZkAttestationError('-1002003');
      }
      if (result.expiryTime ) {
        if (result.expiryTime < Date.now()) {
          throw new ZkAttestationError('-1002004');
        }
        if (!result.remainingQuota || result.remainingQuota <= 0) {
          throw new ZkAttestationError('-1002005');
        }
      }
      
      // Add other business logic based on quoteResult.result if needed
      // For example:
      // if (quoteResult.result?.quotaExceeded) {
      //   throw new ZkAttestationError('00005', 'Quota exceeded');
      // }
    } catch (error: any) {
      // If it's a business logic error (ZkAttestationError), rethrow it
      if (error instanceof ZkAttestationError) {
        throw error;
      }
      // For network errors or other exceptions, catch and log but don't throw
      // This allows the execution to continue even if the quote check fails
      console.error('Failed to check app quote (network error or other exception):', error);
      // Don't throw - allow execution to continue
    }
  }

}

export { PrimusExtCoreTLS, Attestation };