const AWS = require('aws-sdk');
const { questions } = require('./template');

const makeTemplate = async (questions) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient({
    maxRetries: 3,
    httpOptions: {
      timeout: 5000,
    },
  });

  for (let question of questions) {
    params = {
      TableName: process.env.TABLE_NAME,
      Item: question,
    };

    // console.log('Adding to database ...');
    // console.log(question);

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

  return {
    statusCode: '200',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Templates successfully configured',
    }),
    isBase64Encoded: false,
  };
};

exports.handler = async (message) => {
  return await makeTemplate(questions);
};
