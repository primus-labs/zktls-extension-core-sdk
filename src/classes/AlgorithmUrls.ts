import { sendRequest, getInstanceProperties } from '../utils'
import { BASE_SERVICE_URL, PRIMUS_PROXY_URL, PROXY_URL, PRIMUS_MPC_URL} from '../config/env'
export class AlgorithmUrls {
  
  primusMpcUrl: string; // PADOURL
  primusProxyUrl: string;// ZKPADOURL
  proxyUrl: string; // PROXYURL

  constructor() {
    this.primusMpcUrl = PRIMUS_MPC_URL
    this.primusProxyUrl = PRIMUS_PROXY_URL
    this.proxyUrl = PROXY_URL
    this.fetchNodes()
  }
  async fetchNodes() {
    const fetNodesUrl = `${BASE_SERVICE_URL}/public/algo/nodes`
    const res = await sendRequest(fetNodesUrl)
    const that = this
    if (res?.rc === 0) {
      let isInited = false;
      res.result.forEach((item: any) => {
        let ws = new WebSocket(`wss://${item.algoProxyDomain}/algoproxyV2`);
        ws.onopen = async function () {
          if (!isInited) {
            that.primusMpcUrl = `wss://${item.algorithmDomain}/algorithmV2`;
            that.primusProxyUrl = `wss://${item.algorithmDomain}/algorithm-proxyV2`;
            that.proxyUrl = `wss://${item.algoProxyDomain}/algoproxyV2`;
            isInited = true;
          }
          ws.close();
        };
        ws.onerror = function () {
        };
        ws.onclose = function () {
        };
      });
    }
  }
  toJsonString() {
    return JSON.stringify(getInstanceProperties(this));
  }
}





