const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');

const cognito = new AWS.CognitoIdentityServiceProvider();

let UserPoolId;
let UserPoolClientId;

const updateUser = async (email) => {
  const params = {
    UserAttributes: [
      {
        Name: 'phone_number',
        Value: '+447919024506',
      },
      {
        Name: 'nickname',
        Value: 'Pete',
      },
    ],
    Username: email,
    UserPoolId: UserPoolId,
  };

  try {
    let data = await cognito.adminUpdateUserAttributes(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return handleError(error);
  }

  // let data = await cognito.adminUpdateUserAttributes(params).promise();
};

exports.handler = async (message) => {
  UserPoolId = process.env.USER_POOL_ID;
  UserPoolClientId = process.env.USER_POOL_CLIENT_ID;

  const { userEmail } = message.queryStringParameters;

  if (!userEmail) {
    console.log('Email: ', userEmail);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Please provide an email address and a password',
      }),
    };
  }

  return updateUser(userEmail);

  // try {
  //   await updateUser(userEmail);
  // } catch (error) {
  //   return handleError(error);
  // }

  // return {
  //   statusCode: 200,
  //   body: JSON.stringify({
  //     message: 'User created successfully',
  //   }),
  // };
};
