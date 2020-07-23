const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');
const { verifyToken } = require('/opt/nodejs/verifyToken');
const { intro } = require('./introText');

let UserPoolId;
let UserPoolClientId;

const getRefs = async (id) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient({
    maxRetries: 3,
    httpOptions: {
      timeout: 5000,
    },
  });

  let params = {
    TableName: process.env.TABLE_NAME,
  };

  try {
    let { Items } = await dynamodb.scan(params).promise();

    let refs = {};

    for (let item of Items) {
      if (!refs.hasOwnProperty(`${item.category}`)) {
        refs[`${item.category}`] = [];
      }
      refs[`${item.category}`].push({
        description: item.description,
      });
    }

    refs.intro = [];
    refs.intro.push(intro);
    // console.log('getRefs -> refs', refs);

    return {
      statusCode: '200',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(refs),
      isBase64Encoded: false,
    };
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
};

exports.handler = async (message) => {
  UserPoolId = process.env.USER_POOL_ID;
  UserPoolClientId = process.env.USER_POOL_CLIENT_ID;

  let claims = await verifyToken(message.headers.Authorization);
  if (claims.statusCode) return claims;

  return getRefs();
};
