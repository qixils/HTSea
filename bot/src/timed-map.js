class TimedMap {
    constructor () {
        this._map = new Map();
    }

    add (key, value, timeout) {
        this._map.set(key, value);
        setTimeout(() => {
            this._map.delete(key);
        }, timeout);
    }

    delete (key) {
        return this._map.delete(key);
    }

    get (key) {
        return this._map.get(key);
    }
}

module.exports = TimedMap;