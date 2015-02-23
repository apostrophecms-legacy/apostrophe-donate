// CC Expiration Years
var currYear = new Date().getFullYear();
var years = [];

for (var i = 25; i >= 0; i--) {
	years.push({label: (parseInt(currYear) + i).toString(), value: (parseInt(currYear)+ i).toString()});
};

module.exports = years.reverse();