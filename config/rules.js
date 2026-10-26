window.HAR_RULES = [
  {
    "pattern": "h5issue-game.cdqcwl.com",
    "isRegex": false,
    "matchHost": true,
    "reqDecoder": "raw",
    "paramsDecoder": "raw",
    "resDecoder": "raw",
    "methods": {
      "POST": [
        {
          "path": "/api/v2/login",
          "target": "body",
          "fields": [
            {
              "param": "[\"token\"]",
              "decoderId": "bearer",
              "fields": []
            }
          ]
        }
      ]
    }
  },
  {
    "pattern": "role.xxgame.cn",
    "isRegex": false,
    "matchHost": true,
    "reqDecoder": "gzipFix",
    "paramsDecoder": "raw",
    "resDecoder": "gzipFix"
  },
  {
    "pattern": "api.xxgame.cn",
    "isRegex": false,
    "matchHost": true,
    "reqDecoder": "gzipFix",
    "paramsDecoder": "gzipFix",
    "resDecoder": "raw"
  },
  {
    "pattern": "sub.xxgame.cn",
    "isRegex": false,
    "matchHost": true,
    "reqDecoder": "gzipFix",
    "paramsDecoder": "raw",
    "resDecoder": "raw"
  }
];
