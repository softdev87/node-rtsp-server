var net = require('net');
var HashMap = require('hashmap');

var server = net.createServer();
server.on('connection', handleConnection);
server.listen(8554, function () {
    console.log('server listening to %j', server.address());
});

function handleConnection(conn) {
    var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
    console.log('new client connection from %s', remoteAddress);
    conn.on('data', onConnData);
    conn.once('close', onConnClose);
    conn.on('error', onConnError);
    function onConnData(req) {
        var tcpString = req.toString('utf8');
        console.log('REQUEST: %s', remoteAddress);
        console.log('{');
        console.log('%s', tcpString);
        console.log('}\n');

        var headers = new HashMap();
        var lines = tcpString.split("\r\n");
        for (var i = 0, len = lines.length; i < len; i++) {
            console.log("LINE:%s = %s", i, lines[i]);
            if (lines[i].includes(": ")) {
                headers.set(lines[i].split(": ")[0], lines[i].split(": ")[1]);
            }
        }
        const RTSP_200 = "RTSP/1.0 200 OK\r\n";
        const SERVER_NAME = "NodeJS RTSP server"
        var response = "NO RESPONSE SET";
        var messageType = lines[0].split(" ")[0];
        switch (messageType) {
            case "RTSP/1.0":
                response = "RTSP is good!\r\n";
                break;
            case "OPTIONS":
                // OPTIONS rtsp://localhost:8554/live.sdp RTSP/1.0
                // CSeq: 1
                // User-Agent: Lavf57.83.100
                response = RTSP_200;
                response += "CSeq: " + headers.get("CSeq") + "\r\n";
                response += "Public: OPTIONS, DESCRIBE, ANNOUNCE, GET_PARAMETER, PAUSE, PLAY, RECORD, SETUP, SET_PARAMETER, TEARDOWN\r\n";
                response += "Server: " + SERVER_NAME + "\r\n";
                response += rtspDate();
                break;
            case "DESCRIBE":
                // DESCRIBE rtsp://localhost:8554/live.sdp RTSP/1.0
                // Accept: application / sdp
                // CSeq: 2
                // User - Agent: Lavf57.83.100
                response = RTSP_200
                response += "CSeq: " + headers.get("CSeq") + "\r\n";
                response += "Content-Type: application/sdp\r\n"
                response += "Content-Base: rtsp://localhost:8554/live.sdp/\r\n"
                response += "Server: " + SERVER_NAME + "\r\n"
                response += rtspDate();
                response += "Content-Length: 449\r\n"
                response += "\r\n"
                response += "v=0\r\n"
                response += "o=- 12937757946092301954 1 IN IP4 172.17.0.2\r\n"
                response += "s=Session streamed with GStreamer\r\n"
                response += "i=rtsp-server\r\n"
                response += "t=0 0\r\n"
                response += "a=tool:GStreamer\r\n"
                response += "a=type:broadcast\r\n"
                response += "a=control:*\r\n"
                response += "a=range:npt=0-\r\n"
                response += "m=video 0 RTP/AVP 96\r\n"
                response += "c=IN IP4 0.0.0.0\r\n"
                response += "b=AS:2097\r\n"
                response += "a=rtpmap:96 H264/90000\r\n"
                response += "a=framerate:25\r\n"
                response += "a=fmtp:96 packetization-mode=1;profile-level-id=42c01f;sprop-parameter-sets=Z0LAH9oBQBbsBagICAoAAAMAAgAAAwBlHjBlQA==,aM48gA==\r\n"
                response += "a=control:stream=0\r\n"
                response += "a=ts-refclk:local\r\n"
                response += "a=mediaclk:sender"
                break;
            case "SETUP":
                // SETUP rtsp://localhost:8554/live.sdp/stream=0 RTSP/1.0
                // Transport: RTP/AVP/UDP;unicast;client_port=23752-23753
                // CSeq: 3
                // User-Agent: Lavf57.83.100
                var clientPorts = headers.get("Transport").split(";")[2].split("=")[1];
                console.log(clientPorts);
                response = RTSP_200;
                response += "CSeq: " + headers.get("CSeq") + "\r\n";
                response += "Transport: RTP/AVP;unicast;client_port=" + clientPorts + ";server_port=52728-52729;ssrc=40ABEB09;mode=\"PLAY\"\r\n"
                response += "Server: " + SERVER_NAME + "\r\n"
                response += "Session: q58XYTLXeGT6NtNz\r\n"
                response += rtspDate();
                break;
            case "PLAY":
                // PLAY rtsp://localhost:8554/live.sdp/ RTSP/1.0
                // Range: npt=0.000-
                // CSeq: 4
                // User-Agent: Lavf57.83.100
                // Session: q58XYTLXeGT6NtNz
                response = RTSP_200
                response += "CSeq: " + headers.get("CSeq") + "\r\n";
                response += "RTP-Info: url=rtsp://localhost:8554/live.sdp/stream=0;seq=1;rtptime=0\r\n"
                response += "Range: npt=0-\r\n"
                response += "Server: " + SERVER_NAME + "\r\n"
                response += "Session: q58XYTLXeGT6NtNz\r\n"
                response += rtspDate();
                break;
            case "TEARDOWN":
                // TEARDOWN rtsp://localhost:8554/live.sdp/ RTSP/1.0
                // CSeq: 5
                // User-Agent: Lavf57.83.100
                // Session: q58XYTLXeGT6NtNz
                response = RTSP_200
                response += "CSeq: " + headers.get("CSeq") + "\r\n";
                response += "Server: " + SERVER_NAME + "\r\n"
                response += "Session: q58XYTLXeGT6NtNz\r\n"
                response += "Connection: close\r\n"
                response += rtspDate();
                break;
            default:
                response = "Whoops\r\n";
        }

        console.log(response);
        conn.write(response + "\r\n");
    }
    function onConnClose() {
        console.log('connection from %s closed', remoteAddress);
    }
    function onConnError(err) {
        console.log('Connection %s error: %s', remoteAddress, err.message);
    }
}

function rtspDate(){
    return "Date: " + new Date().toGMTString() + "\r\n";
}

function createResponse(req) {
    var obj = {};
    var headers = new HashMap();
    obj.headers = headers;
    obj.setHeader = function (header, value) {
        this.headers.set(header, value);
    };
    var body = "";
    obj.body = body;
    return obj;
}