const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');

const cognito = new AWS.CognitoIdentityServiceProvider();

let UserPoolId;
let UserPoolClientId;

const createUser = async (email, password) => {
  const params = {
    UserPoolId,
    Username: email,
    MessageAction: 'SUPPRESS', // Do not send welcome email
    TemporaryPassword: password,
    UserAttributes: [
      {
        Name: 'email',
        Value: email,
      },
      {
        // Don't verify email addresses
        Name: 'email_verified',
        Value: 'true',
      },
    ],
  };

  let data = await cognito.adminCreateUser(params).promise();

  const initiateParams = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    ClientId: UserPoolClientId,
    UserPoolId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  data = await cognito.adminInitiateAuth(initiateParams).promise();

  const challengeResponseData = {
    USERNAME: email,
    NEW_PASSWORD: password,
  };

  const responseParams = {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: UserPoolClientId,
    UserPoolId,
    ChallengeResponses: challengeResponseData,
    Session: data.Session,
  };

  await cognito.adminRespondToAuthChallenge(responseParams).promise();
};

exports.handler = async (message) => {
  UserPoolId = process.env.USER_POOL_ID;
  UserPoolClientId = process.env.USER_POOL_CLIENT_ID;

  const { userEmail, password } = message.queryStringParameters;

  if (!userEmail || !password) {
    console.log('Email: ', userEmail, 'Password: ', password);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Please provide an email address and a password',
      }),
    };
  }

  try {
    await createUser(userEmail, password);
  } catch (error) {
    return handleError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'User created successfully',
    }),
  };
};
