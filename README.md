#apostrophe-donate
`apostrophe-donate` allows a developer to quickly add a donation form to a webpage on an [apostrophe-sandbox](https://github.com/apostrophe-sandbox)-powered website.
It uses the [paypal-api-sdk](https://github.com/paypal/rest-api-sdk-nodejs) module to process payments and allows email configuration to the donor and recipient of the donation.

# Installation
*I assume you already have a nifty Apostrophe 2 project built with [apostrophe-site](https://github.com/punkave/apostrophe-site). The easiest way is to start by cloning the [apostrophe-sandbox](https://github.com/apostrophe-sandbox) project.*

Add the module to your project:

`npm install --save apostrophe-donate`

# Configuration

In `app.js`, you'll need to configure the `apostrophe-donate` module, just like the rest of your modules:

```javascript
    'apostrophe-donate': {
      // production has this in local.js
      payPal: {
        mode: 'sandbox',
        client_id: 'xxxxxx',
        client_secret: 'xxxxxx'
      },
      // configure the email to send to the donor
      from:{
        email: 'email@email.com',
        name: 'First Last'
      },
      // configure the email to send to the recipient of the donation
      recipient:{
        email: 'email@gmail.com',
        name: 'Recipient'
      },
      thankYouSubject: 'Thanks!', // subject of the email to the donor
      confirmationSubject: 'Yay!' // subject of the email to send to the recipient of the donation
    }
```

The `client_id` and `client_secret` are retrieved after setting up a pro account with PayPal and registering your application.


## Registering an app with PayPal

* Login to PayPal and go to [https://developer.paypal.com](https://developer.paypal.com)
* Click **Applications**, then click **Create App**.
* Give your app a name and leave the defaults in place for the **sandbox developer account** field.
* Click the **Create App**
* Under **Test Credentials**, note the Client ID and Secret. These are for your local `data/local.js` configuration so as to not be playing with real money in development.
* Under **Live Credentials**, click **Show** to find the production Client ID and Secret

## Inclusion
Add this line to the template of your choice where you want the form to appear
```
{% include "donate:formWrapper.html" %}
```

# Assets
`apostrophe-donate` comes with a lot of pre-baked things.

## Templates
* `form.html` - donation form generated with `apostrophe-schemas`'s `schemaMacros`. You can redefine the schema in `index.js`.
* `formWrapper.html` - a wrapper for the form
* `recipientEmail.html`, `recipientEmail.txt` - email template sent to the recipient of the donation after successful form submission
* `thankYou.html` - thank you message displayed after successful form submission
* `thankYouEmail.html`, `thankYouEmail.txt` - email sent to the donor after successful form submission.

## Extras
Pre-baked styles in `content.less` and a `spinner.gif` for backward compatible ui goodness
![](https://github.com/punkave/apostrophe-donate/blob/master/public/images/spinner.gif)
