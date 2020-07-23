const AWS = require('aws-sdk');
const uuid = require('uuid');
const Schema = require('validate');
const querystring = require('querystring');
const { leadData } = require('./leadData');
const { leadSchema } = require('./leadSchema');
const { verifyToken } = require('/opt/nodejs/verifyToken');

let checkId = (item) => {
  // console.log('checkId -> item', item);
  if (item.hasOwnProperty('id') && item.id === 'replace_me') {
    // console.log('Assigning an ID');
    item.id = uuid.v4();
  }

  for (let key of Object.keys(item)) {
    // console.log(`Looking at ${key}`);
    if (Array.isArray(item[key])) {
      // console.log('Found an array');
      for (let element of item[key]) {
        // console.log('\tLooping for array element');
        checkId(element);
      }
    } else if (item[key] instanceof Object) {
      // console.log('Looping for an object');
      console.log(key);
      checkId(item.key);
    }
  }
};

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

const makeLead = async (submittedInfo, assignedUser) => {
  const hashCode = (s) =>
    s.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

  let {
    firstName,
    surname,
    addressLine1,
    addressLine2,
    addressCityTown,
    addressCounty,
    addressPostcode,
    addressCountry,
    telephone,
  } = submittedInfo;

  console.log(submittedInfo);

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

  let longString = firstName + surname + addressLine1 + addressCityTown + telephone;
  const id = hashCode(longString).toString();

  let lead = {
    ...leadData,
    id,
    assignedUser,
    addressFull,
    ...submittedInfo,
  };

  lead.userPhoto = lead.userPhoto.replace(/ /g, '+');
  lead.userPhoto = await storeImage(lead.userPhoto);
  lead.appointmentDateTime = lead.appointmentDateTime.replace(/ /g, '+');

  let date = new Date();
  lead.leadCreationDateTime = date.toISOString();

  const dynamodb = new AWS.DynamoDB.DocumentClient({
    maxRetries: 3,
    httpOptions: {
      timeout: 5000,
    },
  });

  params = {
    TableName: process.env.TABLE_NAME_2,
  };

  try {
    let criteria = await dynamodb.scan(params).promise();
    for (let element of criteria.Items) {
      let newElement = JSON.parse(JSON.stringify(element));

      if (!lead.hasOwnProperty(`${newElement.category}`)) {
        lead[`${newElement.category}`] = [];
      }

      if (newElement.hasOwnProperty('categoryType') && newElement.categoryType === 'addFunction') {
        newElement.categoryAddData = [];
        for (let i = 0; i < newElement.categoryAddCount; i++) {
          newElement.categoryAddData.push(JSON.parse(JSON.stringify(element.categoryAddData)));
        }
      }

      lead[newElement.category].push(newElement);
    }
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

  checkId(lead);

  params = {
    TableName: process.env.TABLE_NAME,
    Item: lead,
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
    body: 'Lead successfully created',
    isBase64Encoded: false,
  };
};

exports.handler = async (message) => {
  let claims = await verifyToken(message.headers.Authorization);
  if (claims.statusCode) return claims;

  const leadInfo = new Schema(leadSchema);
  const errors = leadInfo.validate(querystring.parse(message.body));

  return errors.length !== 0
    ? {
        statusCode: 400,
        body: JSON.stringify({
          code: errors[0].path,
          message: errors[0].message,
        }),
      }
    : await makeLead(querystring.parse(message.body), claims.sub);
};
