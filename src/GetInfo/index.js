const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');
const { verifyToken } = require('/opt/nodejs/verifyToken');

const cognito = new AWS.CognitoIdentityServiceProvider();

let UserPoolId;
let UserPoolClientId;

const getUser = async (token) => {
  const params = {
    AccessToken: token,
  };

  try {
    let data = await cognito.getUser(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return handleError(error);
  }
};

exports.handler = async (message) => {
  UserPoolId = process.env.USER_POOL_ID;
  UserPoolClientId = process.env.USER_POOL_CLIENT_ID;

  let claims = await verifyToken(message.headers.Authorization);
  if (claims.statusCode) {
    return claims;
  }

  return getUser(message.headers.Authorization.split(' ')[1]);
};
