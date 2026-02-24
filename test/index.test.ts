import { PrimusCoreTLS} from '../src/index';

// describe('listData function', () => {
//     // jest.setTimeout(50000);
    
//     const appId = "YOUR_APPID";
//     const appSecret = "YOUR_APPSECRET";
//     it('init', async () => {
//         const zkTLS = new PrimusCoreTLS();
//         const result = await zkTLS.init(appId, appSecret);
//         console.log("-------------test result=", result);
//     });
  
// });


describe('test', () => {
    jest.setTimeout(50000);
    // production
    const appId = "YOUR_APPID";
    const appSecret = "YOUR_APPSECRET";
    it('generate', async () => {
        console.log('--------------process.env', process.env.NODE_ENV)
        try {
            // 1.
            const zkTLS = new PrimusCoreTLS();
            const result = await zkTLS.init(appId, appSecret);
            
            let request ={
                url: "https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=BTC-USD",
                method: "GET",
                header: {},
                body: ""
            };
            const responseResolves = [
                {
                    keyName: 'instType',
                    parsePath: '$.data[0].instType',
                    parseType: 'string'
                }
            ];
            const generateRequestParamsRes = zkTLS.generateRequestParams(request, responseResolves);

            const attestation = await zkTLS.startAttestation(generateRequestParamsRes);
            
            const verifyAttestationRes = zkTLS.verifyAttestation(attestation);
        } catch (e) {
            console.log('-----------generate error =',  e);
        }
        
    });
  
});
