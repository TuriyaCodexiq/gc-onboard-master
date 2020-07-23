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

let storeImage = async (imageData) => {
  const s3 = new AWS.S3();
  const bucketName = process.env.BUCKET_NAME;
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

let fullAddress = (leadData) => {
  let { addressLine1, addressLine2, addressCityTown, addressCounty, addressPostcode, addressCountry } = leadData;

  if (!addressLine2) addressLine2 = '';
  if (!addressCounty) addressCounty = '';
  if (!addressCountry) addressCountry = '';

  let addressFull = '';
  if (addressLine1 !== '') {
    addressFull = `${addressLine1}`;
    if (addressLine2 !== '') addressFull += `, ${addressLine2}`;
    addressFull += `, ${addressCityTown}`;
    if (addressCounty) addressFull += `, ${addressCounty}`;
    addressFull += `, ${addressPostcode}`;
    if (addressCountry) addressFull += `, ${addressCountry}`;
  }

  leadData.addressFull = addressFull;

  return leadData;
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
  let claims = await verifyToken(message.headers.Authorization);
  if (claims.statusCode) return claims;

  let leadData = await findLead(claims.sub, message.pathParameters.leadId);
  let updates = querystring.parse(message.body);

  if (updates.userPhoto) {
    console.log('Storing image -> ', updates.userPhoto);
    updates.userPhoto = await storeImage(updates.userPhoto.replace(/ /g, '+'));
  }

  leadData = Object.assign(leadData, updates);
  leadData = Object.assign(leadData, fullAddress(leadData));

  let date = new Date();
  leadData.leadLastUpdateDateTime = date.toISOString();

  leadData.appointmentDateTime = leadData.appointmentDateTime.replace(/ /g, '+');

  let response = await writeData(leadData);

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
};
