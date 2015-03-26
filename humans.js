var client = require('twilio')('AC742c7e3dbde640741c1e8e7dedced9b4', '6a4f2c76c6f8899dc56d31ddafbd64a4');
var nodemailer = require('nodemailer');

module.exports = (function () {

        humans = function (humanData)
        {
                this.activeHumans = humanData;
        }

        humans.list = [
//                {
//                        'workflows': [
//                                1, 2, 3, 4, 5, 6, 7, 8, 9, 10
//                        ],
//                        'name': 'Rob',
//                        'phone': '+12697447902',
//                        'text': '+12697447902',
//                        'email': 'rob.macinnis@gmail.com'
//                },
                {
                        'workflows': [
                                11, 12
                        ],
                        'name': 'Greg',
                        'phone': '+12692671728',
                        'text': '+12692671728',
                        'email': 'gohany@gmail.com',
                        'severityLimit': 50,
                }
        ]

        humans.fromWorkflow = function (workflow)
        {
                // get from workflow
                var getHumans = [];
                for (var key in this.list)
                {
                        if ('workflows' in this.list[key])
                        {
                                if (this.list[key].workflows.indexOf(workflow))
                                {
                                        getHumans.push(this.list[key]);
                                }
                        }
                }
                return new humans(getHumans);
        }

        humans.all = function ()
        {
                return new humans(this.list);
        }

        humans.prototype.text = function (message, severity)
        {
                for (var key in this.activeHumans)
                {
                        if ('text' in this.activeHumans[key] && !severity || ('severityLimit' in this.activeHumans[key] && this.activeHumans[key].severityLimit <= severity))
                        {
                                console.log('sending text to ' + this.activeHumans[key].text);
                                client.sendMessage({
                                        to: this.activeHumans[key].text, // Any number Twilio can deliver to
                                        from: '+12697433536', // A number you bought from Twilio and can use for outbound communication
                                        body: message + ' Severity: '+severity+"%\n", // body of the SMS message
                                }, function (err, responseData) {
                                        if (err) {
                                                console.log(err);
                                                //console.log('Sent text..');
                                                //console.log(responseData); // outputs "+14506667788"
                                        }
                                });
                        }
                }
        }

        humans.prototype.email = function (subject, body, severity)
        {
                for (var key in this.activeHumans)
                {
                        if ('email' in this.activeHumans[key] && !severity || ('severityLimit' in this.activeHumans[key] && this.activeHumans[key].severityLimit <= severity))
                        {
                                var transporter = nodemailer.createTransport();
                                transporter.sendMail({
                                        from: 'notify@hrscontrol.com',
                                        to: this.activeHumans[key].email,
                                        subject: subject,
                                        text: body + "\nSeverity: "+severity+"%\n",
                                });
                                console.log('Email sent');
                        }
                }
        }

        humans.prototype.phone = function(say, severity)
        {
                for (var key in this.activeHumans)
                {
                        if ('phone' in this.activeHumans[key] && !severity || ('severityLimit' in this.activeHumans[key] && this.activeHumans[key].severityLimit <= severity))
                        {
                                client.calls.create({
                                        url: "http://24.176.24.114/?Say="+encodeURIComponent(say + ',,The severity level is '+severity+' percent'),
                                        to: this.activeHumans[key].phone,
                                        //sendDigits: "1234#11111",
                                        from: '+12697433536',
                                        method: "GET"
                                }, function (err, call) {
                                        if (!err)
                                                console.log("Call sent");
                                        
                                        //console.log(err);
                                });
                        }
                }
        }

        return humans;

})();