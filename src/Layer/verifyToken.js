const superagent = require('superagent');
const base64url = require('base64-url');
const { JWT, JWK } = require('jose');

exports.verifyToken = async (auth) => {
  const keysUrl = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`;
  const token = auth.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'No valid token provided.',
      }),
    };
  }

  // get the kid from the headers prior to verification
  let { kid } = JSON.parse(base64url.decode(token.split('.')[0]));

  // download the public keys
  const response = await superagent.get(keysUrl).set('accept', 'json');

  if (response.statusCode !== 200) {
    console.log('Failed to get keys: ', response.statusCode);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: `Failed to get public keys: ${response.statusCode}`,
      }),
    };
  }

  const body = response.body;
  const keys = body.keys;

  // search for the kid in the downloaded public keys
  let keyIndex = -1;
  for (let i = 0; i < keys.length; i++) {
    if (kid === keys[i].kid) {
      keyIndex = i;
      break;
    }
  }

  try {
    if (keyIndex === -1) {
      console.log('Public key not found in jwks.json');
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Public key not found in jwks.json',
        }),
      };
    }

    // construct the public key
    let pubKey = await JWK.asKey(keys[keyIndex]);
    let claims = await JWT.verify(token, pubKey, {
      ignoreExp: true,
    });

    //  we can verify the token expiration
    let currentTs = Math.floor(new Date() / 1000);
    if (currentTs > claims.exp) {
      console.log('Token expired');
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Token has expired',
        }),
      };
    }

    // and the Audience (use claims.client_id if verifying an access token)
    if (claims.client_id !== process.env.USER_POOL_CLIENT_ID) {
      console.log('Wrong audience');
      return {
        statusCode: 401,
        body: JSON.stringify({
          message: 'Wrong audience in token',
        }),
      };
    }
    return claims;
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify(err),
    };
  }
};
