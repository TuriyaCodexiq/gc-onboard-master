const AWS = require('aws-sdk');
const { handleError } = require('/opt/nodejs/errorHandler');
const { verifyToken } = require('/opt/nodejs/verifyToken');
const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME;
let photoList = [];

let getImage = async (imageId) => {
  let myObject = '';
  const bucketName = process.env.BUCKET_NAME;

  let params = {
    Bucket: bucketName,
    Key: imageId,
  };

  try {
    myObject = await s3.getObject(params).promise();
  } catch (error) {
    console.log(error);
    let { statusCode, code, message } = error;
    return {
      statusCode,
      body: JSON.stringify({
        code,
        message,
      }),
    };
  }
  return myObject.Body.toString('utf-8');
};

let getAnswerImages = async (item, qId, answers) => {
  if (item.answerPhoto) {
    item.tempPhoto = await getImage(item.answerPhoto);
    item.answerPhoto = item.tempPhoto;
    delete item.tempPhoto;
  } else {
    for (let key of Object.keys(item)) {
      if (Array.isArray(item[key])) {
        for (let element of item[key]) {
          await getAnswerImages(element, qId, answers);
        }
      } else if (item[key] instanceof Object) {
        await getAnswerImages(item.key, qId, answers);
      }
    }
  }
};

const getLeads = async (id) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient({
    maxRetries: 3,
    httpOptions: {
      timeout: 5000,
    },
  });

  let params = {
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'assignedUser = :id',
    ExpressionAttributeValues: {
      ':id': id,
    },
  };

  try {
    let items = await dynamodb.query(params).promise();
    for (let lead of items.Items) {
      if (lead.userPhoto) {
        lead.userPhoto = await getImage(lead.userPhoto);
      }
      if (lead.consentPhoto) {
        lead.consentPhoto = await getImage(lead.consentPhoto);
      }
      if (lead.consentSignature) {
        lead.consentSignature = await getImage(lead.consentSignature);
      }

      await getAnswerImages(lead);
    }

    return {
      statusCode: '200',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        count: items.Count,
        leads: items.Items,
      }),
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

  return getLeads(claims.sub);
};
