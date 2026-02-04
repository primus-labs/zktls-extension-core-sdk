import { request } from '../utils/httpRequest';
import { BASEAPI } from '../config/env';
import { ApiResponse,EventReportRawData, EventReportRequest  } from './index.d';
export function getAppQuote(params: {appId: string}): Promise<ApiResponse> {
  return request<ApiResponse>({
    url: `${BASEAPI}/public/app/quote`,
    method: 'GET',
    params});
}


export function reportEvent(rawDataObj: EventReportRawData): Promise<ApiResponse<any[]>> {
  const data: EventReportRequest = {
    eventType: "ATTESTATION_GENERATE",
    rawData: JSON.stringify(rawDataObj)
  };
  return request<ApiResponse<any[]>>({
    url: `${BASEAPI}/public/event/report`,
    method: 'POST',
    data: data
  });
}





