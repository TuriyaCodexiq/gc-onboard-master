const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');

const cognito = new AWS.CognitoIdentityServiceProvider();

let UserPoolId;
let UserPoolClientId;

const loginUser = async (email, password) => {
  const initiateParams = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    ClientId: UserPoolClientId,
    UserPoolId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  try {
    data = await cognito.adminInitiateAuth(initiateParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(data.AuthenticationResult),
    };
  } catch (error) {
    return handleError(error);
  }
};

const refreshUser = async (refresh_token) => {
  const initiateParams = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: UserPoolClientId,
    UserPoolId,
    AuthParameters: {
      REFRESH_TOKEN: refresh_token,
    },
  };

  try {
    data = await cognito.adminInitiateAuth(initiateParams).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(data.AuthenticationResult),
    };
  } catch (error) {
    return handleError(error);
  }
};

exports.handler = async (message) => {
  UserPoolId = process.env.USER_POOL_ID;
  UserPoolClientId = process.env.USER_POOL_CLIENT_ID;

  const { userEmail, password, refresh_token } = message.queryStringParameters;
  if ((!userEmail || !password) && !refresh_token) {
    console.log('Email: ', userEmail, 'Password: ', password);
    return {
      statusCode: 400,
      body: JSON.stringify({
        code: 'Bad parameters',
        message: 'Please check provided parameters',
      }),
    };
  }

  return refresh_token ? await refreshUser(refresh_token) : await loginUser(userEmail, password);
};
