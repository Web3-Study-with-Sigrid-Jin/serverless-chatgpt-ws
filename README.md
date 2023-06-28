# AWS WebSocket API GPT-3.5-turbo Codebase
## Installation/deployment instructions

```
sls create --template aws-nodejs-typescript --name websocket-chat 
serverless 
serverless deploy
wscat -c {wss_endpoint}
# { "action": "message", "prompt": "안녕하세요... 혹시 지금도 판매하시나요 맥북에어" }
```
## Reference
* https://lacti.github.io/2019/07/07/websocket-api/
* https://github.com/lacti/websocket-api-sample-chat/blob/master/handler.ts
* https://github.com/aws-samples/simple-websockets-chat-app/issues/24