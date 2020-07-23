const AWS = require('aws-sdk');
const querystring = require('querystring');
const uuid = require('uuid');
const { verifyToken } = require('/opt/nodejs/verifyToken');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  maxRetries: 3,
  httpOptions: {
    timeout: 5000,
  },
});

let found = false;

let storeImage = async (imageData) => {
  const s3 = new AWS.S3();
  const bucketName = process.env.BUCKET_NAME;
  console.log('storeImage -> bucketName', bucketName);
  const imageId = uuid.v4();

  let params = {
    Bucket: bucketName,
    Body: imageData,
    Key: imageId,
    ContentType: 'text/plain',
  };

  try {
    await s3.putObject(params).promise();
    return imageId;
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

let setAnswer = (item, qId, answers) => {
  console.log('setAnswer -> answers', answers);
  if (item.id === qId) {
    found = true;
    if (answers.multiPossibleValues) answers.multiPossibleValues = JSON.parse(answers.multiPossibleValues);
    if (item.type && (item.type === 'Date' || item.type === 'Time')) answers.answer = answers.answer.replace(/ /g, '+');
    item = Object.assign(item, answers);
  } else if (!found) {
    for (let key of Object.keys(item)) {
      if (Array.isArray(item[key])) {
        for (let element of item[key]) {
          setAnswer(element, qId, answers);
        }
      } else if (item[key] instanceof Object) {
        setAnswer(item.key, qId, answers);
      }
    }
  }
};

let findLead = async (userId, leadId) => {
  let params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      assignedUser: userId,
      id: leadId,
    },
  };

  try {
    let item = await dynamodb.get(params).promise();
    return item.Item;
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

let writeData = async (leadData) => {
  var params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      assignedUser: leadData.assignedUser,
      id: leadData.id,
    },
  };

  try {
    await dynamodb.delete(params);
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

  params = {
    TableName: process.env.TABLE_NAME,
    Item: leadData,
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

  return {
    statusCode: '200',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: 'Item successfully updated',
    isBase64Encoded: false,
  };
};

exports.handler = async (message) => {
  found = false;
  let catBody = {};
  let catId;
  let claims = await verifyToken(message.headers.Authorization);
  if (claims.statusCode) return claims;

  let leadData = await findLead(claims.sub, message.pathParameters.leadId);
  let messageBody = querystring.parse(message.body);
  messageBody.answerDateTime = messageBody.answerDateTime.replace(/ /g, '+');

  if (messageBody.answerPhoto) {
    let link = await storeImage(messageBody.answerPhoto.replace(/ /g, '+'));
    messageBody.answerPhoto = link;
  }

  // Handle categoryAdd stuff
  if (messageBody.catId) {
    catId = messageBody.catId;
    catBody.catAddStatus = messageBody.catAddStatus;
    catBody.catAddName = messageBody.catAddName;

    delete messageBody.catId;
    delete messageBody.catAddStatus;
    delete messageBody.catAddName;
  }

  setAnswer(leadData, message.pathParameters.qId, messageBody);
  found = false;
  if (catId) setAnswer(leadData, catId, catBody);

  let date = new Date();
  leadData.leadLastUpdateDateTime = date.toISOString();
  let response = await writeData(leadData);

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};
