export type AttNetworkRequest = {
    url: string,
    method: string,
    header?: object,
    body?: any,
    /**
     * Specifies the encoding of the body field.
     * - 'text' (default): Body is a plain text string, passed as-is
     * - 'base64': Body is base64-encoded binary data, will be decoded before sending
     * - 'hex': Body is string of hex-encoded data, will be decoded before sending
     *
     * Use 'base64' for binary request bodies (e.g., protobuf, msgpack) that cannot
     * be safely represented as plain text strings in JSON.
     */
    bodyEncoding?: 'text' | 'base64' | 'hex'
}

export type AttNetworkResponseResolve = {
    keyName: string,
    parsePath: string,
    parseType?: string,
    op?: string,
    value?: string | number
}

export type Attestor = {
    attestorAddr: string,
    url: string
}

export type Attestation = {
    recipient: string,
    request: AttNetworkRequest,
    reponseResolve: AttNetworkResponseResolve[],
    data: string, // json string
    attConditions: string, // json string
    timestamp: number,
    additionParams: string,
    attestors: Attestor[],
    signatures: string[],
}

export type LogLevel = 'info' | 'debug' | 'error'

export type AttModeAlgorithmType = 'mpctls' | 'proxytls'
export type AttModeResultType = 'plain' | 'cipher'
export type AttSslCipher = 'ECDHE-RSA-AES128-GCM-SHA256' | 'ECDHE-ECDSA-AES128-GCM-SHA256'
export type AttMode = {
  algorithmType: AttModeAlgorithmType;
  resultType: AttModeResultType;
}

export type BaseAttestationParams = {
    appId: string;
    request: AttNetworkRequest | AttNetworkRequest[];
    responseResolves: AttNetworkResponseResolve[] | AttNetworkResponseResolve[][];
    userAddress: string;
}

export type FullAttestationParams = BaseAttestationParams & {
    timestamp: number;
    attMode?: AttMode;
    attConditions?: object;
    additionParams?: string;
    sslCipher?: AttSslCipher;
    requestInterval?: number;
  }

export type SignedAttRequest = {
    attRequest: FullAttestationParams,
    appSignature: string
}

export type ApiResponse<T = any> = {
    rc: number;
    mc: string;
    msg: string;
    result: T;
}