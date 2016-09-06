define("xmpp.filetransfer", function () {
    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = b64Data;
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, {type: contentType});
    }

    var XMPPFileTransfer = function (userId) {
        var self = this, chunks, chunk, downloaded, connection;
        require(['rest'], function (REST) {
            var rest = new REST();
            rest.get('/jabber/ip', function (ip) {
                connection = new Strophe.Connection('http://' + ip + ':5280/http-bind');
                var ibbHandler = function (type, from, sid, data, seq) {
                    if (type == 'open') {
                        downloaded = 0;
                        chunks = [];
                    } else if (type == 'data') {
                        chunk = atob(data);
                        chunks.push(chunk);
                        self.fire('download_updated', downloaded += chunk.length, self.fileSize);
                    } else if (type == 'close') {
                        var b = '';
                        for (var i = 0; i < chunks.length; i++) {
                            b += chunks[i];
                        }
                        self.fileSaver = saveAs(b64toBlob(b, self.mimeType), self.fileName);
                        self.fire('download_completed');
                    } else {
                        throw new Error("shouldn't be here.");
                    }
                };

                var fileHandler = function (from, sid, fileName, fileSize, mimeType) {
                    console.log('from:      ' + from);
                    console.log('sid:       ' + sid);
                    console.log('filename:  ' + fileName);
                    console.log('fileSize:  ' + fileSize);
                    console.log('mime:      ' + mimeType);

                    if (self.from && self.connection) {
                        self.connection.ibb.close(self.from, self.sid, function () {
                            console.log('Log download has been cancelled');
                        });
                    }
                    self.from = from;
                    self.sid = sid;
                    self.fileSize = fileSize;
                    self.fileName = fileName;
                    self.mimeType = mimeType;
                };

                function onConnect(status) {
                    if (status == Strophe.Status.CONNECTING) {
                        console.log('Strophe is connecting.');
                    } else if (status == Strophe.Status.CONNFAIL) {
                        console.log('Strophe failed to connect.');
                    } else if (status == Strophe.Status.DISCONNECTING) {
                        console.log('Strophe is disconnecting.');
                    } else if (status == Strophe.Status.DISCONNECTED) {
                        console.log('Strophe is disconnected.');
                    } else if (status == Strophe.Status.CONNECTED) {
                        console.log('Strophe is connected.');
                        connection.si_filetransfer.addFileHandler(fileHandler);
                        connection.ibb.addIBBHandler(ibbHandler);
                    }
                }

                connection.connect('web@' + ip + '/' + userId + '/log', 'humax@!', onConnect);
                self.connection = connection;
            });
        });
    };
    XMPPFileTransfer.prototype = new EventTarget();
    $.extend(XMPPFileTransfer.prototype, {
        cancel: function () {
            var self = this;
            if (self.fileSaver) {
                self.fileSaver.abort();
            }
            if (self.connection) {
                self.connection.ibb.close(self.from, self.sid, function () {
                    console.log('Log download has been cancelled');
                });
            }
        }
    });
    return XMPPFileTransfer;
});