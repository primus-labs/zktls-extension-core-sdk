import  { AttestationErrorCode, ErrorCodeMAP } from '../config/error'

export class ZkAttestationError {
  code: AttestationErrorCode;
  message: string;
  data?: any;
  constructor(code: AttestationErrorCode, message?: string, data?: any) {
    this.message = message || ErrorCodeMAP[code as keyof typeof ErrorCodeMAP] || ErrorCodeMAP['99999'];
    this.code = code;
    this.data = data;
  }
}

