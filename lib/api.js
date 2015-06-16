var _ = require('lodash');
var async = require('async');

module.exports = function(self, options, paypal_sdk){
	self.donate = function(req, data, callback){
    var errors = {};
    var values = {};

    return self._schemas.convertFields(req, self.schema, 'form', data, values, function(err) {

      if (values.expire_year < 2000) {
        values.expire_year = values.expire_year + 2000;
      }

      values.expire_month = parseInt(values.expire_month);

      var payment_details = {
        "intent": "sale",
        "payer": {
          "payment_method": "credit_card",
          "funding_instruments": [{
            "credit_card": {
              "type": values.type,
              "number": values.number,
              "expire_month": values.expire_month,
              "expire_year": values.expire_year,
              "cvv2": values.cvv2,
              "first_name": values.first_name,
              "last_name": values.last_name,
              "billing_address": {
                "line1": values.line1,
                "city": values.city,
                "state": values.state,
                "postal_code": values.postal_code,
                "country_code": values.country_code }}}]},
        "transactions": [{
          "amount": {
            "total": values.total,
            "currency": "USD",
            "details": {}
            },
          "description": "Donation to Better Tomorrows" }]};

      return paypal_sdk.payment.create(payment_details, function(error, payment){
        if(error){
          console.error(error);
          if (error.response.details) {
            console.error(error.response.details);
          }
          errors.number = "Your credit card was not accepted. Please double check your information.";
          return send();
        } else {
        	var donation = _.cloneDeep(values);
          donation.when = new Date();
          delete donation.cvv2;
          delete donation.expire_month;
          delete donation.expire_year;
          donation._id = 'd' + self._apos.generateId();
          donation.number = donation.number.substr(donation.length -  4, 4);

          return async.series({
          	afterDonate: function(callback){
          		self.afterDonate(req, donation, callback);
        		},
            storeInDatabase: function(callback) {
              self._donations.insert(donation, callback);
            },
            //expose data for external api
            //exposeData: self.exposeData,
            emailDonor: function(callback) {
              return self.email(
                req,
                {
                  email: options.from.email,
                  fullName: options.from.name
                },
                {
                  email: values.email,
                  fullName: values.first_name + ' ' + values.last_name
                },
                options.thankYouSubject || 'Thank you for your donation',
                'thankYouEmail',
                values,
                callback
              );
            },
            emailRecipient: function(callback){
              return self.email(
                req,
                {
                  email: options.from.email,
                  fullName: options.from.name
                },
                {
                  email:  options.recipient.email,
                  fullName: options.recipient.name
                },
                options.confirmationSubject || 'Donation Received',
                'recipientEmail',
                values,
                callback
              );
            }
          },
          function(err) {
            if (err) {
              console.log(err);
            }
            return send();
          });
        }
      });
    });
    return send();

    function send() {
   		if(_.isEmpty(errors)) {
   			return callback(null);
   		}

   		return callback(errors);
    }
	}

	self.afterDonate = function(req, donation, callback){
		return callback(null);
	}
}