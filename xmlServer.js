var http = require('http');
var url = require('url');
http.createServer(function (request, response) {

        var parsed = url.parse(request.url, true);
        response.writeHead(200, {'Content-Type': 'text/xml'});

        var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<Response>\n';
        for (var key in parsed.query)
        {
                xml += "\t<" + key + ">" + parsed.query[key] + "</" + key + ">\n";
        }
        xml += '</Response>';
        response.end(xml);
}).listen(80);