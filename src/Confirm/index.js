const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');

const cognito = new AWS.CognitoIdentityServiceProvider();

let UserPoolClientId;

const confirm = async (email, confirmationCode, password) => {
  const params = {
    Username: email,
    ClientId: UserPoolClientId,
    ConfirmationCode: confirmationCode,
    Password: password,
  };

  try {
    data = await cognito.confirmForgotPassword(params).promise();
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

  const { userEmail, confirmationCode, password } = message.queryStringParameters;
  if (!userEmail || !confirmationCode || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'One or missing parameters provided. Please check and confirm.',
      }),
    };
  }

  return await confirm(userEmail, confirmationCode, password);
};
