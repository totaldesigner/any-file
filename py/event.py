import _collections


class EventTarget(object):
    def __init__(self):
        self.handlers = _collections.defaultdict(set)

    def on(self, name, callback):
        self.handlers[name].add(callback)

    def off(self, name):
        if name in self.handlers:
            del self.handlers[name]

    def fire(self, name, *args, **kwargs):
        for handler in self.handlers.get(name, []):
            handler(*args, **kwargs)
