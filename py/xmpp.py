import sleekxmpp

from concurrent.futures import ThreadPoolExecutor

JID = ''
PASSWORD = ''


class AsyncClient(sleekxmpp.ClientXMPP):
    current_message = None

    def __init__(self, jid, password):
        sleekxmpp.ClientXMPP.__init__(self, jid, password)
        self.register_plugin('xep_0096')
        self.register_plugin('xep_0030')
        self.register_plugin('xep_0047', {
            'auto_accept': True
        })
        self.add_event_handler("session_start", self.session_start, threaded=True)
        self.add_event_handler('ibb_stream_start', self.handle_stream)
        self.add_event_handler('ibb_stream_data', self.handle_data)
        self['feature_mechanisms'].unencrypted_plain = True
        self.executor = ThreadPoolExecutor(max_workers=1000)

    def accept_stream(self, iq):
        return True

    def handle_stream(self, stream):
        print('Stream opened: %s from %s' % (stream.sid, stream.peer_jid))

    def handle_data(self, event):
        import base64
        print(base64.b64decode(event['data']))

    def session_start(self, event):
        self.send_presence()
        self.get_roster()


robot = AsyncClient(JID, PASSWORD)
robot.connect(use_tls=False)
robot.process()
