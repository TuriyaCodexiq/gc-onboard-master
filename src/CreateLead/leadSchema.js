exports.leadSchema = {
  firstName: {
    type: String,
    required: true,
  },
  surname: {
    type: String,
    required: true,
  },
  addressLine1: {
    type: String,
    required: true,
  },
  addressLine2: {
    type: String,
    required: false,
  },
  addressCityTown: {
    type: String,
    required: true,
  },
  addressPostcode: {
    type: String,
    required: true,
  },
  addressCounty: {
    type: String,
    required: false,
  },
  addressCountry: {
    type: String,
    required: false,
  },
  addressFull: {
    type: String,
    required: false,
  },
  telephone: {
    type: String,
    required: false,
  },
  telephone2: {
    type: String,
    required: false,
  },
  telephone3: {
    type: String,
    required: false,
  },
  appointmentDateTime: {
    type: String,
    required: false,
  },
  userPhoto: {
    type: String,
    required: false,
  },
  email: {
    type: String,
    required: true,
  },
};
