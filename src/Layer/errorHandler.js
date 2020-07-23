exports.handleError = (error) => {
  console.log(error);
  let { statusCode, code, message } = error;
  return {
    statusCode,
    body: JSON.stringify({
      code,
      message,
    }),
  };
};
