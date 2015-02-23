var paypal_sdk = require('paypal-rest-sdk');
var _ = require('lodash');
var async = require('async');
var csv = require('csv');
var moment = require('moment');

// pre-populated content
var countries = require('./countries.js');
var months = require('./months.js');
var years = require('./years.js');

module.exports = factory;

function factory(options, callback) {
  return new Construct(options, callback);
}

function Construct(options, callback) {
  var self = this;
  var app = options.app;

  paypal_sdk.configure(options.payPal);

  self._apos = options.apos;
  self._apos.mixinModuleAssets(self, 'donate', __dirname, options);
  self._apos.mixinModuleEmail(self);
  self._schemas = options.schemas;

  options.addFields = [
    {
      name: 'total',
      label: 'Amount',
      type: 'string',
      required: true
    },
    {
      name: 'first_name',
      label: 'First Name',
      type: 'string',
      required: true
    },
    {
      name: 'last_name',
      label: 'Last Name',
      type: 'string',
      required: true
    },
    {
      name: 'type',
      label: 'Credit Card Type',
      type: 'select',
      required: true,
      choices: [
        {
          value: null,
          label: 'CHOOSE ONE'
        },
       {
         value: 'visa',
         label: 'Visa'
       },
       {
         value: 'mastercard',
         label: 'Mastercard'
       },
       {
         value: 'discover',
         label: 'Discover'
       },
       {
         value: 'amex',
         label: 'American Express'
       }
      ]
    },
    {
      name: 'number',
      label: 'Credit Card Number',
      type: 'string',
      required: true,
    },
    {
      name: 'cvv2',
      label: 'CVV2',
      type: 'integer',
      required: true
    },
    {
      name: 'expire_month',
      label: 'Expire Month',
      type: 'select',
      required: true,
      choices: months
    },
    {
      name: 'expire_year',
      label: 'Expire Year',
      type: 'select',
      required: true,
      choices: years
    },
    {
      name: 'line1',
      label: 'Street Address',
      type: 'string',
      required: true
    },
    {
      name: 'city',
      label: 'City',
      type: 'string',
      required: true
    },
    {
      name: 'state',
      label: 'State',
      type: 'string',
      required: true
    },
    {
      name: 'postal_code',
      label: 'Zip Code',
      type: 'string',
      required: true
    },
    {
      name: 'country_code',
      label: 'Country',
      type: 'select',
      required: true,
      choices: [ { label: 'CHOOSE ONE', value: undefined } ].concat(countries)
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'string',
      required: true
    }
  ].concat(options.addFields || []);

  self.schema = self._schemas.compose(options);

  self._apos.pushGlobalData({
    aposDonate: {
      schema: self.schema
    }
  });

  // create a custom nunjucks function to render our form
  self._apos.addLocal('aposDonationForm', function(){
    return self.render('formWrapper', {countries: countries, schema: self.schema});
  });

  app.get('/apos-donate', function(req, res) {
    return res.send(self.render('form', {countries: countries, schema: self.schema}));
  });

  app.post('/apos-donate', function(req, res) {
    var errors = {};
    var values = {};

    return self._schemas.convertFields(req, self.schema, 'form', req.body, values, function(err) {

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
          return async.series({
            storeInDatabase: function(callback) {
              var donation = _.cloneDeep(values);
              donation.when = new Date();
              delete donation.cvv2;
              delete donation.expire_month;
              delete donation.expire_year;
              donation._id = 'd' + self._apos.generateId();
              donation.number = donation.number.substr(donation.length -  4, 4);
              self._donations.insert(donation, callback);
            },
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
      return res.send({
        status: _.isEmpty(errors) ? 'ok' : 'error',
        errors: errors
      });
    }

  });

  app.get('/apos-export-donations', function(req, res) {
    if (!self._apos.permissions.can(req, 'export-donations')) {
      res.statusCode = 403;
      return res.send('forbidden');
    }
    return self._donations.find({}).sort({ when: 1 }).toArray(function(err, donations) {
      if (err) {
        res.statusCode = 500;
        return res.send('An error occurred');
      }
      res.setHeader('Content-disposition', 'attachment; filename=testing.csv');
      res.setHeader('Content-type', 'text/csv');

      // We have: an array of objects.
      // We need: an array of rows, in which the first row has the heading
      // names and the remainder have the data for one object apiece, in the
      // same order as the headings.

      var flat = [];
      if (donations.length) {
        var headings = _.keys(donations[0]);
        flat = [ headings ];
        _.each(donations, function(donation) {
          flat.push(_.map(headings, function(heading) {
            if (heading === 'when') {
              // Raw Unix timestamps aren't very friendly
              return moment(donation[heading]).format('YYYY-MM-DD');
            } else {
              return donation[heading];
            }
          }));
        });
      }
      return csv.stringify(flat, function(err, csv) {
        res.send(csv);
      });
    });
  });

  self._apos.mixinModuleAssets(self, 'donate', __dirname, options);
  self.pushAsset('stylesheet', 'content', { when: 'always' });
  self.pushAsset('script', 'content', { when: 'always' });

  // Get hold of a MongoDB collection for donations
  return self._apos.db.collection('donations', function(err, _donations) {
    self._donations = _donations;
    // Invoke the final callback. This must happen on next tick or later!
    return process.nextTick(function() {
      return callback(err);
    });
  });
}

// Export the constructor so others can subclass
factory.Construct = Construct;
