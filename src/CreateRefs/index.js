const AWS = require('aws-sdk');
const { refs } = require('./template');

const makeReferences = async (refs) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient({
    maxRetries: 3,
    httpOptions: {
      timeout: 5000,
    },
  });

  console.log('makeReferences -> refs', refs);
  for (let category of Object.keys(refs)) {
    for (let item of refs[category]) {
      console.log('makeReferences -> description', item.description);
      params = {
        TableName: process.env.TABLE_NAME,
        Item: {
          category,
          description: item.description,
        },
      };

      try {
        await dynamodb.put(params).promise();
      } catch (error) {
        let { statusCode, code, message } = error;
        return {
          statusCode,
          body: JSON.stringify({
            code,
            message,
          }),
        };
      }
    }
  }

  return {
    statusCode: '200',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Success',
    }),
    isBase64Encoded: false,
  };
};

exports.handler = async (message) => {
  return await makeReferences(refs);
};
