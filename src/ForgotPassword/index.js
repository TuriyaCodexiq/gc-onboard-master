const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');

const cognito = new AWS.CognitoIdentityServiceProvider();

let UserPoolClientId;

const forgotPassword = async (email) => {
  const params = {
    Username: email,
    ClientId: UserPoolClientId,
  };

  try {
    data = await cognito.forgotPassword(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return handleError(error);
  }
};

exports.handler = async (message) => {
  UserPoolClientId = process.env.USER_POOL_CLIENT_ID;

  const { userEmail } = message.queryStringParameters;
  if (!userEmail) {
    console.log('Email: ', userEmail);
    return {
      statusCode: 400,
      body: JSON.stringify({
        code: 'Bad parameters',
        message: 'Please check provided parameters',
      }),
    };
  }

  return await forgotPassword(userEmail);
};
